"""
TransactionService: Simulated Escrow Lifecycle State Machine (Phase 2)

Manages the full lifecycle of a simulated escrow transaction attached to
an accepted Match. No real money. State transitions are strict and logged.

Simulation scenarios (triggered via simulate_event):
  successful_fulfillment  → INITIATED→ESCROW_HELD→VERIFIED→RELEASED        (65%)
  delayed_delivery        → same + delay note in simulation_notes           (15%)
  dispute_and_refund      → INITIATED→ESCROW_HELD→DISPUTED→REFUNDED         (10%)
  vendor_cancellation     → INITIATED→ESCROW_HELD→FAILED                    ( 6%)
  suspicious_activity     → INITIATED→ESCROW_HELD→FRAUD_FLAGGED             ( 2%)
  fraud_scenario          → INITIATED→FRAUD_FLAGGED (immediate)             ( 2%)
"""

import json
import random
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from models import (
    Transaction, TransactionStatus, Match, Vendor, User,
    MatchStatus, RequestStatus, VendorTrustProfile
)
from core.exceptions import NotFoundException, ValidationException
from services.audit import AuditService


# ---------------------------------------------------------------------------
# Valid state transitions (state machine enforcement)
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: Dict[TransactionStatus, List[TransactionStatus]] = {
    TransactionStatus.INITIATED:     [TransactionStatus.ESCROW_HELD, TransactionStatus.FRAUD_FLAGGED],
    TransactionStatus.ESCROW_HELD:   [TransactionStatus.VERIFIED, TransactionStatus.FAILED,
                                      TransactionStatus.DISPUTED, TransactionStatus.FRAUD_FLAGGED],
    TransactionStatus.VERIFIED:      [TransactionStatus.RELEASED, TransactionStatus.FRAUD_FLAGGED],
    TransactionStatus.DISPUTED:      [TransactionStatus.REFUNDED, TransactionStatus.FRAUD_FLAGGED],
    TransactionStatus.RELEASED:      [TransactionStatus.FRAUD_FLAGGED],
    # Terminal states — no further transitions
    TransactionStatus.FAILED:        [],
    TransactionStatus.REFUNDED:      [],
    TransactionStatus.FRAUD_FLAGGED: [],
}

# Simulation scenario definitions
SIMULATION_SCENARIOS = {
    "successful_fulfillment": {
        "steps": [
            TransactionStatus.ESCROW_HELD,
            TransactionStatus.VERIFIED,
            TransactionStatus.RELEASED,
        ],
        "notes": ["Escrow held pending delivery.", "Delivery verified by requester.", "Funds released to vendor."],
        "reliability_delta": +0.02,
        "weight": 65,
    },
    "delayed_delivery": {
        "steps": [
            TransactionStatus.ESCROW_HELD,
            TransactionStatus.VERIFIED,
            TransactionStatus.RELEASED,
        ],
        "notes": [
            "Escrow held pending delivery.",
            "Delivery delayed — requester notified. Verified after extended window.",
            "Funds released after delay acknowledged.",
        ],
        "reliability_delta": -0.01,
        "weight": 15,
    },
    "dispute_and_refund": {
        "steps": [
            TransactionStatus.ESCROW_HELD,
            TransactionStatus.DISPUTED,
            TransactionStatus.REFUNDED,
        ],
        "notes": [
            "Escrow held pending delivery.",
            "Requester raised dispute: goods not received.",
            "Dispute resolved in requester's favour — simulated refund issued.",
        ],
        "reliability_delta": -0.08,
        "weight": 10,
    },
    "vendor_cancellation": {
        "steps": [
            TransactionStatus.ESCROW_HELD,
            TransactionStatus.FAILED,
        ],
        "notes": [
            "Escrow held pending delivery.",
            "Vendor cancelled the order — transaction failed.",
        ],
        "reliability_delta": -0.10,
        "weight": 6,
    },
    "suspicious_activity": {
        "steps": [
            TransactionStatus.ESCROW_HELD,
            TransactionStatus.FRAUD_FLAGGED,
        ],
        "notes": [
            "Escrow held pending delivery.",
            "Suspicious activity detected — transaction flagged for fraud review.",
        ],
        "reliability_delta": -0.15,
        "weight": 2,
    },
    "fraud_scenario": {
        "steps": [
            TransactionStatus.FRAUD_FLAGGED,
        ],
        "notes": [
            "Immediate fraud flag: high anomaly score triggered at initiation.",
        ],
        "reliability_delta": -0.20,
        "weight": 2,
    },
}


class TransactionService:

    # -----------------------------------------------------------------------
    # Initiate a new transaction on match acceptance
    # -----------------------------------------------------------------------
    @staticmethod
    def initiate(db: Session, match: Match, trust_score: Optional[float] = None) -> Transaction:
        """
        Creates a new INITIATED transaction for an accepted match.
        Called from MatchingService.accept_match().
        """
        # Check if transaction already exists for this match
        existing = db.query(Transaction).filter(Transaction.match_id == match.id).first()
        if existing:
            return existing

        # Estimate simulated amount from inventory price if available
        simulated_amount = None
        if match.request and match.vendor:
            from models import Inventory
            inv = db.query(Inventory).filter(
                Inventory.vendor_id == match.vendor_id,
                Inventory.category == match.request.category
            ).first()
            if inv and inv.price:
                simulated_amount = round(inv.price * match.request.quantity, 2)

        txn = Transaction(
            match_id=match.id,
            vendor_id=match.vendor_id,
            requester_user_id=match.request.user_id,
            status=TransactionStatus.INITIATED,
            simulated_amount=simulated_amount,
            risk_score=round(1.0 - trust_score, 3) if trust_score is not None else None,
            fraud_flag=False,
            simulation_notes=json.dumps([{
                "event": "INITIATED",
                "timestamp": datetime.now().isoformat(),
                "note": "Transaction initiated on requester acceptance."
            }]),
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)

        AuditService.log(
            db, "transaction_initiated",
            user_id=match.request.user_id,
            resource_id=txn.id,
            resource_type="transaction"
        )
        return txn

    # -----------------------------------------------------------------------
    # Manual state transition
    # -----------------------------------------------------------------------
    @staticmethod
    def advance_state(
        db: Session,
        transaction: Transaction,
        new_status: TransactionStatus,
        note: str = "",
        dispute_reason: Optional[str] = None
    ) -> Transaction:
        """
        Advances the transaction to a new state, enforcing valid transitions.
        """
        allowed = VALID_TRANSITIONS.get(transaction.status, [])
        if new_status not in allowed:
            raise ValidationException(
                f"Cannot transition from {transaction.status.value} to {new_status.value}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

        now = datetime.now()
        transaction.status = new_status

        # Set lifecycle timestamps
        ts_map = {
            TransactionStatus.ESCROW_HELD:   "escrow_held_at",
            TransactionStatus.VERIFIED:      "verified_at",
            TransactionStatus.RELEASED:      "released_at",
            TransactionStatus.FAILED:        "failed_at",
            TransactionStatus.REFUNDED:      "failed_at",
            TransactionStatus.FRAUD_FLAGGED: "failed_at",
        }
        if new_status in ts_map:
            setattr(transaction, ts_map[new_status], now)

        if dispute_reason:
            transaction.dispute_reason = dispute_reason

        if new_status == TransactionStatus.FRAUD_FLAGGED:
            transaction.fraud_flag = True

        # Append to simulation_notes log
        try:
            notes = json.loads(transaction.simulation_notes or "[]")
        except Exception:
            notes = []
        notes.append({
            "event": new_status.value,
            "timestamp": now.isoformat(),
            "note": note or f"Transition to {new_status.value}."
        })
        transaction.simulation_notes = json.dumps(notes)

        db.commit()
        db.refresh(transaction)
        return transaction

    # -----------------------------------------------------------------------
    # Simulation engine
    # -----------------------------------------------------------------------
    @staticmethod
    def simulate_event(
        db: Session,
        transaction_id: int,
        scenario: Optional[str] = None,
        current_user_id: Optional[int] = None
    ) -> Transaction:
        """
        Runs a full simulation scenario on a transaction.
        If scenario is None, one is chosen randomly weighted by realistic probabilities.

        Supported scenarios:
          successful_fulfillment, delayed_delivery, dispute_and_refund,
          vendor_cancellation, suspicious_activity, fraud_scenario
        """
        txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not txn:
            raise NotFoundException("Transaction")

        # Choose scenario
        if scenario is None:
            names = list(SIMULATION_SCENARIOS.keys())
            weights = [SIMULATION_SCENARIOS[s]["weight"] for s in names]
            scenario = random.choices(names, weights=weights, k=1)[0]

        if scenario not in SIMULATION_SCENARIOS:
            raise ValidationException(
                f"Unknown scenario '{scenario}'. "
                f"Valid: {list(SIMULATION_SCENARIOS.keys())}"
            )

        config = SIMULATION_SCENARIOS[scenario]
        steps: List[TransactionStatus] = config["steps"]
        notes: List[str] = config["notes"]
        reliability_delta: float = config["reliability_delta"]

        # Apply each step in the scenario
        for step, note in zip(steps, notes):
            try:
                TransactionService.advance_state(db, txn, step, note=note)
            except ValidationException:
                # Already past this step — skip gracefully
                break

        # Update vendor reliability_score based on outcome
        vendor = db.query(Vendor).filter(Vendor.id == txn.vendor_id).first()
        if vendor:
            current = vendor.reliability_score or 1.0
            vendor.reliability_score = round(max(0.0, min(1.0, current + reliability_delta)), 4)

        # Refresh VendorTrustProfile after scenario
        TransactionService._refresh_trust_profile(db, txn.vendor_id, is_fraud=(
            txn.status == TransactionStatus.FRAUD_FLAGGED
        ))

        db.commit()

        AuditService.log(
            db, f"transaction_simulated_{scenario}",
            user_id=current_user_id,
            resource_id=txn.id,
            resource_type="transaction"
        )
        return txn

    # -----------------------------------------------------------------------
    # Trust profile refresh helper
    # -----------------------------------------------------------------------
    @staticmethod
    def _refresh_trust_profile(db: Session, vendor_id: int, is_fraud: bool = False) -> None:
        """
        Recalculates and upserts VendorTrustProfile after a transaction event.
        This is the lazy update trigger — keeps the cache fresh without
        recomputing on every match request.
        """
        profile = db.query(VendorTrustProfile).filter(
            VendorTrustProfile.vendor_id == vendor_id
        ).first()
        if not profile:
            profile = VendorTrustProfile(vendor_id=vendor_id)
            db.add(profile)

        if is_fraud:
            profile.is_fraud_flagged = True
            profile.composite_trust_score = 0.0
            profile.anomaly_score = 1.0
        else:
            # Recalculate from vendor history
            from services.trust_service import TrustService
            trust = TrustService.compute_heuristic_trust(db, vendor_id)
            profile.fulfillment_probability = trust.fulfillment_probability
            profile.cancellation_risk       = trust.cancellation_risk
            profile.dispute_probability     = trust.dispute_probability
            profile.delivery_reliability    = trust.delivery_reliability
            profile.composite_trust_score   = trust.composite_trust_score
            profile.is_fraud_flagged        = False

        profile.last_computed_at = datetime.now()
        db.commit()

    # -----------------------------------------------------------------------
    # Fetch helpers
    # -----------------------------------------------------------------------
    @staticmethod
    def get_by_id(db: Session, transaction_id: int) -> Optional[Transaction]:
        return db.query(Transaction).filter(Transaction.id == transaction_id).first()

    @staticmethod
    def get_by_match(db: Session, match_id: int) -> Optional[Transaction]:
        return db.query(Transaction).filter(Transaction.match_id == match_id).first()

    @staticmethod
    def get_for_vendor(db: Session, vendor_id: int, limit: int = 50) -> List[Transaction]:
        return (
            db.query(Transaction)
            .filter(Transaction.vendor_id == vendor_id)
            .order_by(Transaction.initiated_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_for_requester(db: Session, user_id: int, limit: int = 50) -> List[Transaction]:
        return (
            db.query(Transaction)
            .filter(Transaction.requester_user_id == user_id)
            .order_by(Transaction.initiated_at.desc())
            .limit(limit)
            .all()
        )

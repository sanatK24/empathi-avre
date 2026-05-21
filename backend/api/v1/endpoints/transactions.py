"""
Transactions API Endpoints (Phase 2 — Simulated Escrow Lifecycle)

GET  /transactions           — List transactions for current user (requester or vendor)
GET  /transactions/{id}      — Get single transaction with full event log
POST /transactions/{id}/simulate-event  — Trigger a simulation scenario on a transaction
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Vendor, Transaction, TransactionStatus
from api.deps import get_active_user
from services.transaction_service import TransactionService, SIMULATION_SCENARIOS
from core.exceptions import NotFoundException, ValidationException
import json

router = APIRouter()


def _format_transaction(txn: Transaction) -> dict:
    """Serializes a Transaction ORM object to a clean dict."""
    try:
        events = json.loads(txn.simulation_notes or "[]")
    except Exception:
        events = []

    return {
        "id": txn.id,
        "match_id": txn.match_id,
        "vendor_id": txn.vendor_id,
        "requester_user_id": txn.requester_user_id,
        "status": txn.status.value if txn.status else None,
        "simulated_amount": txn.simulated_amount,
        "risk_score": txn.risk_score,
        "fraud_flag": txn.fraud_flag,
        "dispute_reason": txn.dispute_reason,
        "initiated_at": txn.initiated_at.isoformat() if txn.initiated_at else None,
        "escrow_held_at": txn.escrow_held_at.isoformat() if txn.escrow_held_at else None,
        "verified_at": txn.verified_at.isoformat() if txn.verified_at else None,
        "released_at": txn.released_at.isoformat() if txn.released_at else None,
        "failed_at": txn.failed_at.isoformat() if txn.failed_at else None,
        "event_log": events,
    }


@router.get("", response_model=List[dict])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user),
    limit: int = Query(default=50, ge=1, le=200),
):
    """
    Returns transactions for the current user.
    - If requester: shows transactions initiated by this user's requests.
    - If vendor: shows transactions where this user is the vendor.
    """
    # Check if user is a vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()

    if vendor:
        txns = TransactionService.get_for_vendor(db, vendor.id, limit=limit)
    else:
        txns = TransactionService.get_for_requester(db, current_user.id, limit=limit)

    return [_format_transaction(t) for t in txns]


@router.get("/scenarios", response_model=dict)
def list_simulation_scenarios(
    current_user: User = Depends(get_active_user),
):
    """
    Returns available simulation scenarios with descriptions and probability weights.
    Useful for frontend simulation UI / admin tooling.
    """
    return {
        "scenarios": {
            name: {
                "weight": cfg["weight"],
                "steps": [s.value for s in cfg["steps"]],
                "reliability_delta": cfg["reliability_delta"],
                "description": cfg["notes"][-1] if cfg["notes"] else "",
            }
            for name, cfg in SIMULATION_SCENARIOS.items()
        }
    }


@router.get("/{transaction_id}", response_model=dict)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user),
):
    """
    Get a single transaction with full event log.
    Accessible by the requester or the vendor involved in the match.
    """
    txn = TransactionService.get_by_id(db, transaction_id)
    if not txn:
        raise NotFoundException("Transaction")

    # Authorization: must be the requester or the vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    is_requester = txn.requester_user_id == current_user.id
    is_vendor = vendor and txn.vendor_id == vendor.id

    if not (is_requester or is_vendor):
        raise NotFoundException("Transaction")  # 404 instead of 403 (don't reveal existence)

    return _format_transaction(txn)


@router.post("/{transaction_id}/simulate-event", response_model=dict)
def simulate_transaction_event(
    transaction_id: int,
    scenario: Optional[str] = Query(
        default=None,
        description=(
            "Scenario name. If not provided, one is chosen at random weighted by realistic probabilities. "
            f"Available: {list(SIMULATION_SCENARIOS.keys())}"
        )
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user),
):
    """
    Triggers a simulation scenario on a transaction, advancing its state machine.

    Simulation scenarios:
    - successful_fulfillment (65%) — INITIATED→ESCROW_HELD→VERIFIED→RELEASED
    - delayed_delivery (15%)       — same path + delay note
    - dispute_and_refund (10%)     — INITIATED→ESCROW_HELD→DISPUTED→REFUNDED
    - vendor_cancellation (6%)     — INITIATED→ESCROW_HELD→FAILED
    - suspicious_activity (2%)     — INITIATED→ESCROW_HELD→FRAUD_FLAGGED
    - fraud_scenario (2%)          — INITIATED→FRAUD_FLAGGED (immediate)
    """
    txn = TransactionService.get_by_id(db, transaction_id)
    if not txn:
        raise NotFoundException("Transaction")

    # Authorization: must be the requester or the vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    is_requester = txn.requester_user_id == current_user.id
    is_vendor = vendor and txn.vendor_id == vendor.id

    if not (is_requester or is_vendor):
        raise NotFoundException("Transaction")

    # Validate scenario name early (before calling service)
    if scenario is not None and scenario not in SIMULATION_SCENARIOS:
        raise ValidationException(
            f"Unknown scenario '{scenario}'. "
            f"Valid: {list(SIMULATION_SCENARIOS.keys())}"
        )

    txn = TransactionService.simulate_event(
        db,
        transaction_id=transaction_id,
        scenario=scenario,
        current_user_id=current_user.id,
    )

    return {
        "message": f"Simulation complete.",
        "transaction": _format_transaction(txn),
    }

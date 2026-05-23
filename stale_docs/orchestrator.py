import json
from sqlalchemy.orm import Session
from models import Match, Request, GraphRiskCache
from ml.adaptive_ranking import AdaptiveRanking
from ml.crisis_forecaster import CrisisForecaster

class OrchestratorService:
    """
    Phase 6: Autonomous Coordination Layer
    Unifies all intelligence layers (LGBM, Trust, Adaptive Bandit, Graph, Crisis)
    into a single orchestration pipeline to generate final matching scores and explanations.
    """

    @staticmethod
    def orchestrate_match(db: Session, match: Match):
        """
        Enhances the existing match with Phase 3-6 intelligence.
        """
        explanations = []

        # 1. Base Score (Phase 1 & 2: LGBM + Trust)
        base_score = match.risk_adjusted_score if match.risk_adjusted_score else match.ml_score
        final_score = base_score

        # 2. Phase 5: Predictive Crisis
        # If the request city has an active crisis, boost urgency
        request_city = match.request.city
        crisis_multiplier = CrisisForecaster.get_city_severity_multiplier(db, request_city)
        if crisis_multiplier > 1.0:
            final_score *= crisis_multiplier
            explanations.append("Boosted due to active predictive crisis alerts in area.")

        # 3. Phase 4: Graph Intelligence
        # Penalize if vendor is part of a fraud ring, boost if high trust centrality
        graph_cache = db.query(GraphRiskCache).filter(GraphRiskCache.vendor_id == match.vendor_id).first()
        if graph_cache:
            if graph_cache.fraud_flag:
                final_score *= 0.5 # Heavy penalty
                explanations.append("Penalized due to graph anomaly / risk detection.")
            elif graph_cache.centrality_score > 0.05:
                final_score *= 1.1 # Trust propagation bonus
                explanations.append("Boosted due to strong community trust network.")

        # 4. Phase 3: Adaptive Intelligence
        # Apply UCB Bandit modifier
        ucb_modifier = AdaptiveRanking.calculate_ucb_modifier(db, match.vendor_id)
        final_score *= ucb_modifier
        if ucb_modifier > 1.1:
            explanations.append("Adaptive ranking increased exposure for exploration.")
        elif ucb_modifier < 0.9:
            explanations.append("Adaptive ranking reduced exposure based on recent outcomes.")

        # Normalize score
        final_score = min(1.0, max(0.0, final_score))
        
        # Save results
        match.score = final_score
        match.explanation_json = json.dumps(explanations)

        return match

    @staticmethod
    def orchestrate_request_matches(db: Session, request_id: int):
        """
        Runs the orchestrator over all matches for a request and updates their ranks.
        """
        matches = db.query(Match).filter(Match.request_id == request_id).all()
        for match in matches:
            OrchestratorService.orchestrate_match(db, match)
        
        db.commit()

        # Update rank positions
        sorted_matches = sorted(matches, key=lambda m: m.score, reverse=True)
        for idx, match in enumerate(sorted_matches):
            match.rank_position = idx + 1
        
        db.commit()
        return sorted_matches

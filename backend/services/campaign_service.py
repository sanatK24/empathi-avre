import logging, json, numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import User, Campaign, CampaignStatus, Donation, DonationStatus, UserRole
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo
from core.exceptions import NotFoundException, ValidationException
from ml.campaign_ranker import campaign_ranker_service
from services.trust_engine import trust_engine_service
from services.fairness_engine import fairness_engine_service
from ml.hf_services import hf_services
logger = logging.getLogger(__name__)
class CampaignService:
    @staticmethod
    def create_campaign(db: Session, user: User, data: Any) -> Campaign:
        text = f"{data.title}. {data.description}"
        ai_sum = hf_services.summarize_campaign(text)
        analysis = hf_services.analyze_campaign_comprehensive(text, [], "")
        tox = hf_services.detect_toxicity(text)
        embeds = hf_services.generate_embedding(text)
        p_cat = analysis.get("predicted_category")
        final_cat = p_cat if p_cat else data.category
        from models import CampaignCategory
        cat = db.query(CampaignCategory).filter(CampaignCategory.name.ilike(final_cat)).first() if final_cat else None
        camp = Campaign(
            title=data.title, description=data.description, category_id=cat.id if cat else data.category_id,
            subcategory_id=data.subcategory_id, city=data.city, goal_amount=data.goal_amount,
            urgency_level=data.urgency_level, cover_image=data.cover_image, deadline=data.deadline,
            created_by=user.id, status=CampaignStatus.ACTIVE, ai_summary=ai_sum,
            category_tags=json.dumps([p_cat] if p_cat else []),
            category_confidence=0.7 if analysis.get("inferred_urgency") else 0.0,
            toxicity_score=tox, spam_risk_score=0.0, embedding_vector=json.dumps(embeds)
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        try:
            from repositories.audit_repo import audit_repo
            audit_repo.log(db, action="create_campaign", user_id=user.id, resource_type="campaign", resource_id=camp.id, details=f"Created campaign: {camp.title}.")
        except Exception as e:
            print(f"Error logging campaign creation: {e}")
        return camp
    @staticmethod
    def get_recommendations(db: Session, user: User, limit: int = 20) -> List[Dict[str, Any]]:
        logger.info(f"Generating recommendations for user {user.id}")
        all_active = campaign_repo.get_active(db, limit=200)
        if not all_active: logger.warning("No active campaigns found"); return []
        user_don = donation_repo.get_user_donation_history(db, user.id)
        user_cats = {c.category_id for c in db.query(Campaign).filter(Campaign.id.in_([d.campaign_id for d in user_don])).all()} if user_don else set()
        context = {'user_city': user.city, 'preferred_category': next(iter(user_cats), None)}
        logger.debug(f"Ranking {len(all_active)} campaigns")
        ranked = campaign_ranker_service.rank_campaigns(db, all_active, user.id, context)
        logger.debug("Computing trust scores for campaign creators")
        trusted_ranked = []
        for c, s in ranked:
            try:
                tp = trust_engine_service.compute_creator_trust(db, c.created_by)
                if tp and not tp['is_fraud_flagged']: trusted_ranked.append((c, s, tp['composite_trust_score']))
            except: trusted_ranked.append((c, s, 0.5))
        logger.debug("Applying fairness reranking")
        fair_ranked = fairness_engine_service.apply_diversity_constraint(
            fairness_engine_service.apply_fairness_reranking(db, [(c, s) for c, s, _ in trusted_ranked], user.id)
        )
        final_recs = []
        for c, adj in fair_ranked[:limit]:
            t_score = 0.5
            try:
                ct = trust_engine_service.compute_creator_trust(db, c.created_by)
                t_score = ct['composite_trust_score'] if ct else 0.5
            except: pass
            reasons = [r for r, cond in [
                ("Matches your interests", c.category_id in user_cats),
                ("In your city", bool(user.city and c.city and c.city.lower() == user.city.lower())),
                ("Verified campaign", bool(c.verified)),
                ("High urgency", bool(c.urgency_level and c.urgency_level.value.lower() in ["high", "critical"]))
            ] if cond]
            final_recs.append({
                "id": c.id, "title": c.title, "description": c.description,
                "cover_image": getattr(c, 'cover_image', None), "verified": bool(c.verified),
                "ml_score": round(adj * 100, 1), "trust_score": round(t_score * 100, 1),
                "reason": " • ".join(reasons) if reasons else "Recommended for you",
                "progress": round((c.raised_amount / c.goal_amount * 100) if c.goal_amount > 0 else 0, 1),
                "category": c.taxonomy_category.name if c.taxonomy_category else "General Aid", "city": c.city,
                "urgency_level": c.urgency_level.value if c.urgency_level else None, "goal_amount": c.goal_amount,
                "raised_amount": c.raised_amount, "donor_count": len(c.donations)
            })
        logger.info(f"✓ Generated {len(final_recs)} recommendations for user {user.id}")
        return final_recs
    @staticmethod
    def add_donation(db: Session, user: User, campaign_id: int, amount: float, anonymous: bool = False) -> Donation:
        camp = campaign_repo.get(db, campaign_id)
        if not camp or camp.status != CampaignStatus.ACTIVE:
            raise NotFoundException("Active Campaign")
        don = Donation(campaign_id=campaign_id, user_id=user.id, amount=amount, anonymous=anonymous, status=DonationStatus.COMPLETED)
        db.add(don)
        camp.raised_amount += amount
        if camp.raised_amount >= camp.goal_amount: camp.status = CampaignStatus.COMPLETED
        if user.role == UserRole.USER: user.role = UserRole.DONOR
        db.commit()
        db.refresh(don)
        try:
            from repositories.audit_repo import audit_repo
            audit_repo.log(db, action="donate", user_id=user.id, resource_type="donation", resource_id=don.id, details=f"Donated {amount} to campaign ID {campaign_id}.")
        except Exception as e:
            print(f"Error logging donation: {e}")
        return don

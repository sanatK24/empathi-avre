from typing import List, Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor
from schemas import VendorProfileCreate, VendorResponse
from api.deps import get_active_user
from services.vendor_service import VendorService
from services.product_lookup_service import ProductLookupService
from repositories.vendor_repo import vendor_repo
from core.exceptions import NotFoundException

router = APIRouter()

@router.get("/product-lookup")
def lookup_product(q: str):
    """Search for product information by name."""
    return ProductLookupService.search_product(q)

@router.get("/product-suggestions")
def get_product_suggestions(q: str):
    """Get product name suggestions based on prefix."""
    return ProductLookupService.get_suggestions(q)

@router.get("/product-templates")
def get_product_templates():
    """Get all common medical equipment templates."""
    return ProductLookupService.get_all_templates()

@router.get("/discovery")
def discover_vendors(
    lat: float = None, 
    lng: float = None, 
    city: str = None, 
    db: Session = Depends(get_db)
):
    """List vendors for discovery (marketplace style)."""
    from models import Vendor, Inventory
    query = db.query(Vendor).filter(Vendor.is_active == True)
    if city:
        query = query.filter(Vendor.city.ilike(f"%{city}%"))
    
    vendors = query.all()
    result = []
    for v in vendors:
        # Check if they have any stock
        stock_count = db.query(Inventory).filter(Inventory.vendor_id == v.id, Inventory.quantity > 0).count()
        result.append({
            "id": v.id,
            "shop_name": v.shop_name,
            "category": v.category,
            "rating": v.rating,
            "reviews": v.total_completed_orders,
            "city": v.city,
            "area": v.area,
            "lat": v.lat,
            "lng": v.lng,
            "is_available": stock_count > 0,
            "avg_response_time": v.avg_response_time,
            "reliability": v.reliability_score,
            "image_url": v.image_url,
            "is_active": v.is_active
        })
    return result

@router.get("/{vendor_id}/catalogue")
def get_vendor_catalogue(vendor_id: int, db: Session = Depends(get_db)):
    """Get the actual inventory of a specific vendor."""
    from models import Inventory
    items = db.query(Inventory).filter(Inventory.vendor_id == vendor_id).all()
    return items

@router.post("/profile", response_model=VendorResponse)
def create_or_update_profile(
    data: VendorProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return VendorService.get_or_create_profile(db, current_user, data)

@router.get("/profile", response_model=VendorResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return vendor

@router.get("/stats")
def get_vendor_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return VendorService.get_stats(db, vendor)

@router.get("/analytics")
def get_vendor_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import Match, MatchStatus, Inventory
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")

    completed_matches = db.query(Match).filter(
        Match.vendor_id == vendor.id, Match.status == MatchStatus.COMPLETED
    ).count()

    total_revenue = 0
    completed_items = db.query(Match).filter(
        Match.vendor_id == vendor.id, Match.status == MatchStatus.COMPLETED
    ).all()
    for match in completed_items:
        req = match.request
        if req:
            inv = db.query(Inventory).filter(
                Inventory.vendor_id == vendor.id,
                Inventory.resource_name == req.resource_name
            ).first()
            if inv and inv.price:
                total_revenue += inv.price * req.quantity

    all_matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
    avg_lead_time = vendor.avg_response_time if all_matches else 0
    total_match_count = len(all_matches)
    accepted_matches = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status.in_([MatchStatus.ACCEPTED_BY_VENDOR, MatchStatus.COMPLETED])
    ).count()
    match_rate = (accepted_matches / total_match_count * 100) if total_match_count > 0 else 0

    inventory_items = db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
    low_stock_items = sum(1 for item in inventory_items if item.quantity <= item.reorder_level)
    stock_coverage = ((len(inventory_items) - low_stock_items) / len(inventory_items) * 100) if inventory_items else 0

    return {
        "total_orders": completed_matches,
        "revenue": f"\u20b9{total_revenue:,.0f}",
        "avg_lead_time": f"{avg_lead_time}m",
        "match_rate": f"{match_rate:.1f}%",
        "freshness": f"{stock_coverage:.1f}%",
        "stock_coverage": f"{stock_coverage:.1f}%",
        "match_accuracy": f"{vendor.reliability_score * 100:.1f}%"
    }

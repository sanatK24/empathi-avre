from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Vendor, Inventory, User, UserRole, Match, MatchStatus
from schemas import VendorProfileCreate, VendorResponse, InventoryCreate, InventoryResponse
from auth import get_current_user, check_role
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/vendor", tags=["vendor"])


# Response schemas
class MarketAnalyticsResponse(BaseModel):
    trending_product: str
    demand_increase: int


class VendorStatsResponse(BaseModel):
    total_value: str
    low_stock_alerts: str
    active_requests: str
    avg_response_time: str
    reliability_score: str
    market_analytics: MarketAnalyticsResponse

@router.post("/profile", response_model=VendorResponse)
def create_profile(prof_in: VendorProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Ensure user is a vendor
    if current_user.role != UserRole.VENDOR:
        current_user.role = UserRole.VENDOR
        db.commit()

    db_vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if db_vendor:
        for key, value in prof_in.dict().items():
            setattr(db_vendor, key, value)
    else:
        db_vendor = Vendor(user_id=current_user.id, **prof_in.dict())
        db.add(db_vendor)
        
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.get("/profile", response_model=VendorResponse)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    return vendor

@router.post("/inventory", response_model=InventoryResponse)
def add_inventory(inv_in: InventoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Create vendor profile first")
    
    # Check if exists
    item = db.query(Inventory).filter(
        Inventory.vendor_id == vendor.id,
        Inventory.resource_name == inv_in.resource_name
    ).first()
    
    if item:
        item.quantity += inv_in.quantity
        item.price = inv_in.price or item.price
    else:
        item = Inventory(vendor_id=vendor.id, **inv_in.dict())
        db.add(item)
        
    db.commit()
    db.refresh(item)
    return item

@router.get("/inventory", response_model=List[InventoryResponse])
def get_inventory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    return db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
@router.get("/stats", response_model=VendorStatsResponse)
def get_vendor_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    # Total Value
    total_value = db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
    # Safely handle potential None price
    value_sum = sum((item.price or 0) * item.quantity for item in total_value)

    # Low stock alerts
    low_stock = db.query(Inventory).filter(
        Inventory.vendor_id == vendor.id,
        Inventory.quantity <= Inventory.reorder_level
    ).count()

    # Active requests (pending matches)
    active_requests = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status == MatchStatus.PENDING
    ).count()

    return {
        "total_value": f"₹{value_sum:,.0f}",
        "low_stock_alerts": f"{low_stock} Items",
        "active_requests": str(active_requests),
        "avg_response_time": f"{vendor.avg_response_time}m",
        "reliability_score": f"{vendor.reliability_score * 100:.1f}%",
        "market_analytics": {
            "trending_product": "Oxygen Cylinders" if vendor.category == "medical" else "N95 Masks",
            "demand_increase": 45
        }
    }


@router.get("/debug-stats")
def debug_vendor_stats():
    """Debug endpoint to show what's in the code"""
    return {"message": "Rupee symbol test: ₹"}



@router.get("/matches")
def get_vendor_matches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all pending matches/incoming requests for vendor"""
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    matches = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status == MatchStatus.PENDING
    ).all()

    return matches


@router.get("/analytics")
def get_vendor_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get analytics data for vendor dashboard"""
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    # Count completed orders
    completed_matches = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status == MatchStatus.COMPLETED
    ).count()

    # Calculate total revenue
    total_revenue = 0
    completed_items = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status == MatchStatus.COMPLETED
    ).all()
    for match in completed_items:
        request = match.request
        if request:
            inventory = db.query(Inventory).filter(
                Inventory.vendor_id == vendor.id,
                Inventory.resource_name == request.resource_name
            ).first()
            if inventory and inventory.price:
                total_revenue += inventory.price * request.quantity

    # Get average lead time
    all_matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
    avg_lead_time = vendor.avg_response_time if all_matches else 0

    # Calculate match rate
    total_matches = len(all_matches)
    accepted_matches = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status.in_([MatchStatus.ACCEPTED_BY_VENDOR, MatchStatus.COMPLETED])
    ).count()
    match_rate = (accepted_matches / total_matches * 100) if total_matches > 0 else 0

    # Stock coverage
    inventory_items = db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
    low_stock_items = sum(1 for item in inventory_items if item.quantity <= item.reorder_level)
    stock_coverage = ((len(inventory_items) - low_stock_items) / len(inventory_items) * 100) if inventory_items else 0

    return {
        "total_orders": completed_matches,
        "revenue": f"₹{total_revenue:,.0f}",
        "avg_lead_time": f"{avg_lead_time}m",
        "match_rate": f"{match_rate:.1f}%",
        "freshness": f"{stock_coverage:.1f}%",
        "stock_coverage": f"{stock_coverage:.1f}%",
        "match_accuracy": f"{vendor.reliability_score * 100:.1f}%"
    }

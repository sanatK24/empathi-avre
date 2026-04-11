from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor, Inventory, Match, Request as DBRequest, UserRole, MatchStatus
from schemas import VendorCreate, VendorResponse, VendorUpdate, InventoryCreate, InventoryResponse, InventoryUpdate, MatchResponse, MatchStatus
from auth import verify_token
from realtime import emit_and_broadcast
from events import EventType
import asyncio

router = APIRouter(prefix="/vendor", tags=["Vendor"])

def get_current_vendor_or_admin(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Get current vendor user or admin."""
    user_id = token.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.role not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return user

# ============ VENDOR REGISTRATION & PROFILE ============
@router.post("/register", response_model=VendorResponse)
def create_vendor(vendor: VendorCreate, token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Create a vendor profile (called after user registration)."""
    user_id = token.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    # Check if vendor already exists for this user
    existing_vendor = db.query(Vendor).filter(Vendor.user_id == user_id).first()
    if existing_vendor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor profile already exists")

    db_vendor = Vendor(
        user_id=user_id,
        shop_name=vendor.shop_name,
        category=vendor.category,
        latitude=vendor.latitude,
        longitude=vendor.longitude,
        avg_response_time=vendor.avg_response_time
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.get("/profile", response_model=VendorResponse)
def get_vendor_profile(user: User = Depends(get_current_vendor_or_admin), db: Session = Depends(get_db)):
    """Get current vendor's profile."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
    return vendor

@router.put("/profile", response_model=VendorResponse)
def update_vendor_profile(
    vendor_update: VendorUpdate,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Update vendor profile."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if vendor_update.shop_name:
        vendor.shop_name = vendor_update.shop_name
    if vendor_update.is_active is not None:
        vendor.is_active = vendor_update.is_active
    if vendor_update.avg_response_time:
        vendor.avg_response_time = vendor_update.avg_response_time

    db.commit()
    db.refresh(vendor)
    return vendor

# ============ INVENTORY MANAGEMENT ============
@router.post("/inventory", response_model=InventoryResponse)
def add_inventory(
    item: InventoryCreate,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Add an inventory item."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db_item = Inventory(
        vendor_id=vendor.id,
        resource_name=item.resource_name,
        quantity=item.quantity,
        price=item.price
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/inventory", response_model=list[InventoryResponse])
def list_inventory(
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """List all inventory items for current vendor."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    items = db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
    return items

@router.put("/inventory/{item_id}", response_model=InventoryResponse)
def update_inventory(
    item_id: int,
    item_update: InventoryUpdate,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Update an inventory item."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db_item = db.query(Inventory).filter(
        Inventory.id == item_id,
        Inventory.vendor_id == vendor.id
    ).first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if item_update.quantity is not None:
        db_item.quantity = item_update.quantity
    if item_update.price is not None:
        db_item.price = item_update.price

    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/inventory/{item_id}")
def delete_inventory(
    item_id: int,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Delete an inventory item."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db_item = db.query(Inventory).filter(
        Inventory.id == item_id,
        Inventory.vendor_id == vendor.id
    ).first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted"}

# ============ INCOMING REQUESTS ============
@router.get("/requests")
def get_incoming_requests(
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """View all matched requests for current vendor."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
    results = []
    for match in matches:
        request = match.request
        results.append({
            "match_id": match.id,
            "request_id": request.id,
            "resource_name": request.resource_name,
            "quantity": request.quantity,
            "urgency": request.urgency,
            "request_status": request.status,
            "status": match.status,
            "score": match.score,
            "is_actionable": match.status == MatchStatus.PENDING,
            "created_at": match.created_at
        })
    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results

@router.post("/requests/{match_id}/accept")
def accept_match(
    match_id: int,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Vendor accepts a match request."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    match = db.query(Match).filter(
        Match.id == match_id,
        Match.vendor_id == vendor.id
    ).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if match.status == MatchStatus.CANCELLED_BY_REQUESTER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Requester has cancelled this match",
        )

    if match.status != MatchStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept match in {match.status.value} state",
        )

    match.status = MatchStatus.ACCEPTED_BY_VENDOR
    db.commit()
    db.refresh(match)
    
    # Emit match accepted by vendor event (notify requester)
    asyncio.create_task(emit_and_broadcast(
        EventType.MATCH_ACCEPTED_BY_VENDOR,
        {
            "vendor_id": vendor.id,
            "vendor_name": vendor.shop_name,
            "request_id": match.request_id,
            "match_id": match.id,
            "requester_id": match.request.user_id
        }
    ))
    
    return {"message": "Request accepted", "match": match}

@router.post("/requests/{match_id}/reject")
def reject_match(
    match_id: int,
    user: User = Depends(get_current_vendor_or_admin),
    db: Session = Depends(get_db)
):
    """Vendor rejects a match request."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    match = db.query(Match).filter(
        Match.id == match_id,
        Match.vendor_id == vendor.id
    ).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if match.status == MatchStatus.CANCELLED_BY_REQUESTER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Requester has cancelled this match",
        )

    if match.status != MatchStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject match in {match.status.value} state",
        )

    match.status = MatchStatus.REJECTED_BY_VENDOR
    db.commit()
    db.refresh(match)
    
    # Emit match rejected by vendor event (notify requester)
    asyncio.create_task(emit_and_broadcast(
        EventType.MATCH_REJECTED_BY_VENDOR,
        {
            "vendor_id": vendor.id,
            "request_id": match.request_id,
            "match_id": match.id,
            "requester_id": match.request.user_id
        }
    ))
    
    return {"message": "Request rejected"}

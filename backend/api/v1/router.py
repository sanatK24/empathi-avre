from fastapi import APIRouter
from api.v1.endpoints import auth, requests, matches, vendors, inventory, campaigns, emergency, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(vendors.router, prefix="/vendor", tags=["vendor"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(emergency.router, prefix="/emergency", tags=["emergency"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

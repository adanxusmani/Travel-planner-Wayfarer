import os, secrets
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import ai
from .auth import current_user
from .db import sb
from .schemas import DayRegen, TripRequest, TripSave, TripUpdate

app = FastAPI(title="Travel Itinerary Planner API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])

def _get_trip(trip_id: str, uid: str) -> dict:
    rows = sb.table("trips").select("*").eq("id", trip_id).execute().data
    if not rows:
        raise HTTPException(404, "Trip not found")
    trip = rows[0]
    member = sb.table("trip_members").select("user_id").eq("trip_id", trip_id).eq("user_id", uid).execute().data
    if trip["user_id"] != uid and not member:
        raise HTTPException(403, "You do not have access to this trip")
    return trip

@app.get("/health")
def health():
    return {"status": "ok", "ai": bool(os.getenv("ANTHROPIC_API_KEY"))}

@app.post("/api/itinerary/generate")
def generate(req: TripRequest, uid: str = Depends(current_user)):
    return ai.generate_itinerary(req)

@app.post("/api/itinerary/regenerate-day")
def regenerate_day(body: DayRegen, uid: str = Depends(current_user)):
    return ai.regenerate_day(body.request, body.itinerary, body.day, body.instruction)

@app.post("/api/trips")
def save_trip(body: TripSave, uid: str = Depends(current_user)):
    row = {**body.model_dump(), "user_id": uid, "share_token": secrets.token_urlsafe(8)}
    return sb.table("trips").insert(row).execute().data[0]

@app.get("/api/trips")
def list_trips(uid: str = Depends(current_user)):
    own = sb.table("trips").select("*").eq("user_id", uid).execute().data
    ids = [m["trip_id"] for m in sb.table("trip_members").select("trip_id").eq("user_id", uid).execute().data]
    shared = sb.table("trips").select("*").in_("id", ids).execute().data if ids else []
    return sorted(own + shared, key=lambda t: t["created_at"], reverse=True)

@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: str, uid: str = Depends(current_user)):
    return _get_trip(trip_id, uid)

@app.put("/api/trips/{trip_id}")
def update_trip(trip_id: str, body: TripUpdate, uid: str = Depends(current_user)):
    _get_trip(trip_id, uid)
    patch = {"itinerary": body.itinerary, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.title:
        patch["title"] = body.title
    return sb.table("trips").update(patch).eq("id", trip_id).execute().data[0]

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str, uid: str = Depends(current_user)):
    trip = _get_trip(trip_id, uid)
    if trip["user_id"] != uid:
        raise HTTPException(403, "Only the owner can delete a trip")
    sb.table("trips").delete().eq("id", trip_id).execute()
    return {"deleted": True}

@app.post("/api/trips/join/{token}")
def join_trip(token: str, uid: str = Depends(current_user)):
    rows = sb.table("trips").select("*").eq("share_token", token).execute().data
    if not rows:
        raise HTTPException(404, "This share link is not valid")
    if rows[0]["user_id"] != uid:
        sb.table("trip_members").upsert({"trip_id": rows[0]["id"], "user_id": uid}).execute()
    return rows[0]

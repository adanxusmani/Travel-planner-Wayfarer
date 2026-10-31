# Personalized Travel Itinerary Planner

AI-powered full-stack app that generates, edits, saves and shares day-by-day travel itineraries.

**Stack:** React (Vite) · FastAPI · Supabase (Auth + Postgres) · Claude API (prompt-engineered JSON output)

## Features
- Email/password auth (Supabase) with per-user trips
- Smart trip builder: destination, dates, budget, group size, traveler type, pace, stay level, interests
- AI itinerary: attractions, dining, stays, transport, per-item cost, day totals, budget check
- Interactive itinerary view: day tabs, inline edit, add/remove stops, **regenerate a single day** with an instruction
- Save / reopen / delete trips; share link so groups can join one trip
- Works without an API key (built-in sample generator) so you can demo the UI immediately

## Architecture
```
React (Vite)  ──JWT──►  FastAPI  ──►  Claude API (itinerary JSON)
     │                     │
     └── Supabase Auth     └── Supabase Postgres (trips, trip_members)
```

## Setup
### 1. Supabase
Create a project, open SQL Editor and run `supabase/schema.sql`.
Copy the project URL, anon key and service-role key.

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in values
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env      # fill in values
npm run dev
```
Open http://localhost:5173

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/itinerary/generate | Generate itinerary from preferences |
| POST | /api/itinerary/regenerate-day | Regenerate one day |
| POST | /api/trips | Save trip |
| GET | /api/trips | List own + shared trips |
| GET/PUT/DELETE | /api/trips/{id} | Read / edit / delete |
| POST | /api/trips/join/{token} | Join a shared trip |

## Scenario mapping
1. **Solo weekend** – short dates, low budget, "food + sightseeing" interests, fast generation.
2. **Couple** – relaxed pace, premium stays, edit stops, regenerate individual days, live cost totals.
3. **Group** – group size + shared interests, share link lets friends join the same trip.

## Prompt engineering notes (`backend/app/ai.py`)
Role-based system prompt, strict JSON schema, budget and pace constraints, geographic clustering per day,
and a separate single-day regeneration prompt that receives the rest of the trip to avoid repeats.

## Ideas for extension
Maps (Leaflet), weather, PDF export, live prices via travel APIs, real-time collaboration.

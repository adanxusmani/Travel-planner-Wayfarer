"""Prompt-engineered itinerary generation. Falls back to a sample generator without an API key."""
import json, os, re
from datetime import timedelta
import anthropic
from fastapi import HTTPException
from .schemas import TripRequest

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")

SYSTEM = """You are an expert travel planner. You build realistic, geographically sensible itineraries.
Rules:
- Cluster each day's stops in nearby areas to minimise transit time.
- Respect the total budget for ALL travelers combined; costs are per group, in the requested currency.
- Match pace: relaxed = 3 stops/day, balanced = 4-5, packed = 6+. Always include breakfast/lunch/dinner suggestions.
- Include one stay recommendation (type "stay") on day 1 matching the stay level, and transport between far stops.
- Reflect the interests and traveler type (solo, couple, group) in the activities.
- Use real, well-known places. Never invent opening hours; keep descriptions to one sentence.
- Respond with ONLY valid JSON, no markdown fences, no commentary."""

SCHEMA = """{
 "summary": "2 sentence overview",
 "days": [{"day": 1, "date": "YYYY-MM-DD", "theme": "short theme",
   "items": [{"time": "09:00", "type": "attraction|food|stay|transport|activity",
              "title": "", "description": "", "location": "", "cost": 0}]}],
 "tips": ["3 short practical tips"]
}"""

def _describe(r: TripRequest) -> str:
    n = (r.end_date - r.start_date).days + 1
    return (f"Destination: {r.destination}\nDates: {r.start_date} to {r.end_date} ({n} days)\n"
            f"Budget: {r.budget} {r.currency} total for {r.group_size} traveler(s)\n"
            f"Traveler type: {r.traveler_type}\nPace: {r.pace}\nStay level: {r.stay_level}\n"
            f"Interests: {', '.join(r.interests) or 'general sightseeing'}\nExtra notes: {r.notes or 'none'}")

def _ask(prompt: str) -> dict | None:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        msg = anthropic.Anthropic(api_key=key).messages.create(
            model=MODEL, max_tokens=8000, system=SYSTEM,
            messages=[{"role": "user", "content": prompt}])
        text = "".join(b.text for b in msg.content if b.type == "text")
        return json.loads(re.search(r"\{.*\}", text, re.S).group(0))
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {e}")

def _total(it: dict) -> dict:
    for d in it.get("days", []):
        d["day_cost"] = round(sum(float(i.get("cost") or 0) for i in d.get("items", [])), 2)
    it["estimated_total"] = round(sum(d["day_cost"] for d in it.get("days", [])), 2)
    return it

def _sample_day(r: TripRequest, n: int) -> dict:
    per = r.budget / max(1, (r.end_date - r.start_date).days + 1)
    d = r.start_date + timedelta(days=n - 1)
    items = [
        {"time": "09:00", "type": "food", "title": "Local breakfast café", "description": "Start with a regional breakfast.", "location": r.destination, "cost": round(per * .08, 2)},
        {"time": "10:30", "type": "attraction", "title": f"{r.destination} old town walk", "description": "Landmarks and viewpoints in one loop.", "location": r.destination, "cost": round(per * .05, 2)},
        {"time": "13:00", "type": "food", "title": "Popular lunch spot", "description": "A well-reviewed local lunch.", "location": r.destination, "cost": round(per * .12, 2)},
        {"time": "15:00", "type": "activity", "title": (r.interests[0].title() if r.interests else "Cultural") + " experience", "description": "Matched to your interests.", "location": r.destination, "cost": round(per * .15, 2)},
        {"time": "19:30", "type": "food", "title": "Dinner at a local favorite", "description": "Try the signature dishes.", "location": r.destination, "cost": round(per * .2, 2)},
    ]
    if n == 1:
        items.insert(0, {"time": "08:00", "type": "stay", "title": f"{r.stay_level.title()} stay", "description": "Check in and drop bags.", "location": r.destination, "cost": round(per * .4, 2)})
    return {"day": n, "date": str(d), "theme": f"Day {n} highlights", "items": items}

def _sample(r: TripRequest) -> dict:
    n = (r.end_date - r.start_date).days + 1
    return {"summary": f"Sample {n}-day plan for {r.destination}. Add an Anthropic API key for fully personalised results.",
            "days": [_sample_day(r, i) for i in range(1, n + 1)],
            "tips": ["Book popular spots early", "Carry a local transit card", "Keep a small cash buffer"]}

def generate_itinerary(r: TripRequest) -> dict:
    prompt = f"Create an itinerary.\n{_describe(r)}\n\nReturn JSON exactly in this shape:\n{SCHEMA}"
    return _total(_ask(prompt) or _sample(r))

def regenerate_day(r: TripRequest, itinerary: dict, day: int, instruction: str) -> dict:
    others = [{"day": d["day"], "titles": [i["title"] for i in d["items"]]} for d in itinerary.get("days", []) if d["day"] != day]
    prompt = (f"{_describe(r)}\n\nRegenerate ONLY day {day}. Do not repeat places already used on other days: "
              f"{json.dumps(others)}\nUser instruction: {instruction or 'Offer a fresh alternative'}\n\n"
              f"Return ONE JSON object for the day: "
              f'{{"day": {day}, "date": "YYYY-MM-DD", "theme": "", "items": [...same item shape...]}}')
    new = _ask(prompt) or _sample_day(r, day)
    days = [new if d["day"] == day else d for d in itinerary["days"]]
    return _total({**itinerary, "days": days})

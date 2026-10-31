from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator

class TripRequest(BaseModel):
    destination: str = Field(min_length=2)
    start_date: date
    end_date: date
    budget: float = Field(gt=0)
    currency: str = "USD"
    group_size: int = Field(1, ge=1, le=30)
    traveler_type: Literal["solo", "couple", "group"] = "solo"
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"
    stay_level: Literal["budget", "comfort", "premium"] = "comfort"
    interests: list[str] = []
    notes: str = ""

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after the start date")
        if (self.end_date - self.start_date).days > 13:
            raise ValueError("Trips are limited to 14 days")
        return self

class TripSave(BaseModel):
    title: str
    request: dict[str, Any]
    itinerary: dict[str, Any]

class TripUpdate(BaseModel):
    title: str | None = None
    itinerary: dict[str, Any]

class DayRegen(BaseModel):
    request: TripRequest
    itinerary: dict[str, Any]
    day: int
    instruction: str = ""

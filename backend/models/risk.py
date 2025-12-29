from enum import Enum

from pydantic import BaseModel, Field


class RiskType(str, Enum):
    """Accepted risk categories for classification and validation."""

    TECHNICAL = "technical"
    EXECUTION = "execution"
    BUSINESS = "business"
    ENVIRONMENTAL = "environmental"


class RiskRuleFlags(BaseModel):
    """Rule-based heuristics that complement the model output."""

    scope_creep: bool
    resource_constraints: bool
    complexity_hotspot: bool
    timeline_pressure: bool
    aggregate_signal_score: float
    notes: list[str] = Field(default_factory=list)

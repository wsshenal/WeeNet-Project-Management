from typing import List

from pydantic import BaseModel, Field


class RiskFactor(BaseModel):
    """Categorical and numeric risk drivers used by the risk model."""

    risk_type: str = Field(..., description="Category such as technical, schedule, operational, or financial.")
    severity: str = Field(..., description="Ordinal severity label from the training data (e.g., low/medium/high/critical).")
    likelihood: str = Field(..., description="Probability tier of the risk materializing.")
    impact_area: str = Field(..., description="Primary area affected (schedule, scope, budget, quality).")
    mitigation_status: str = Field(..., description="Status of mitigation actions (planned, in-progress, completed).")
    complexity: float = Field(..., description="Complexity driver matching the model's numeric feature column.")
    resources_available: float = Field(..., description="Resource adequacy score from the training dataset.")
    timeline_pressure: float = Field(..., description="Schedule pressure score aligned with the model features.")


class RiskBatchRequest(BaseModel):
    """Batch of risk factors for scoring."""

    risks: List[RiskFactor]


class RiskScore(BaseModel):
    """Per-risk score including probability and severity estimations."""

    risk_type: str
    risk_probability: float
    severity_score: float
    risk_index: float


class RiskScoreResponse(BaseModel):
    """Aggregated response with per-risk scores and overall project index."""

    risk_scores: List[RiskScore]
    project_risk_index: float

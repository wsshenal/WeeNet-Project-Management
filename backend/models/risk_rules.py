"""Rule-based heuristics to complement the ML risk model outputs."""

from __future__ import annotations

from typing import Tuple

from models.risk import RiskRuleFlags
from models.risk_mng_risk import RiskFactor

LIKELIHOOD_MAPPING = {
    "low": 1.0,
    "medium": 2.0,
    "high": 3.0,
    "critical": 4.0,
    "very_high": 3.5,
}

SEVERITY_MAPPING = {
    "low": 1.0,
    "medium": 2.0,
    "high": 3.0,
    "critical": 4.0,
}


def _score_label(label: str, mapping: dict[str, float]) -> float:
    """Convert ordinal labels to numeric scores with a safe default."""

    if label is None:
        return 0.0
    return mapping.get(str(label).strip().lower(), 0.0)


def _score_likelihood_and_severity(risk: RiskFactor) -> Tuple[float, float]:
    """Return numeric likelihood and severity scores for threshold checks."""

    likelihood_score = _score_label(risk.likelihood, LIKELIHOOD_MAPPING)
    severity_score = _score_label(risk.severity, SEVERITY_MAPPING)
    return likelihood_score, severity_score


def evaluate_risk_rules(risk: RiskFactor) -> RiskRuleFlags:
    """Apply simple heuristics to flag notable risk patterns."""

    likelihood_score, severity_score = _score_likelihood_and_severity(risk)

    impact_area = (risk.impact_area or "").lower()
    mitigation_status = (risk.mitigation_status or "").lower()

    scope_creep = "scope" in impact_area and (likelihood_score + severity_score) >= 5.0
    resource_constraints = risk.resources_available <= 0.5 or (
        risk.resources_available <= 0.65 and mitigation_status != "completed"
    )
    complexity_hotspot = risk.complexity >= 0.7 or (
        risk.complexity >= 0.6 and severity_score >= 3.0
    )
    timeline_pressure = risk.timeline_pressure >= 0.7 or (
        risk.timeline_pressure >= 0.55 and likelihood_score >= 3.0
    )

    triggered_notes: list[str] = []
    if scope_creep:
        triggered_notes.append("Scope impact with elevated likelihood and severity.")
    if resource_constraints:
        triggered_notes.append("Resource availability below healthy thresholds.")
    if complexity_hotspot:
        triggered_notes.append("High complexity may amplify the risk impact.")
    if timeline_pressure:
        triggered_notes.append("Timeline pressure increases delivery risk.")

    aggregate_signal_score = (
        sum([scope_creep, resource_constraints, complexity_hotspot, timeline_pressure]) / 4.0
    )

    return RiskRuleFlags(
        scope_creep=scope_creep,
        resource_constraints=resource_constraints,
        complexity_hotspot=complexity_hotspot,
        timeline_pressure=timeline_pressure,
        aggregate_signal_score=aggregate_signal_score,
        notes=triggered_notes,
    )
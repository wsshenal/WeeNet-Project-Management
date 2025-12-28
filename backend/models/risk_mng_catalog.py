from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RiskMngCategory(str, Enum):
    """Primary risk categories tracked in the risk management component."""

    TECHNICAL = "technical"
    PROJECT_EXECUTION = "project_execution"
    BUSINESS_STRATEGIC = "business_strategic"
    EXTERNAL_ENVIRONMENTAL = "external_environmental"


class RiskMngMitigation(BaseModel):
    """Actionable guidance for detecting, preventing, and responding to risks."""

    detect: List[str] = Field(..., description="Leading indicators or monitoring hooks.")
    prevent: List[str] = Field(..., description="Preventative actions to reduce likelihood.")
    respond: List[str] = Field(..., description="Response playbook if the risk materializes.")


class RiskMngItem(BaseModel):
    """Curated risk profile used to inform project governance and playbooks."""

    id: str = Field(..., description="Stable identifier used by clients (prefixed with risk_mng_).")
    name: str = Field(..., description="Human readable label for the risk.")
    category: RiskMngCategory
    description: str
    triggers: List[str] = Field(..., description="Observable cues that the risk is materializing.")
    consequences: List[str] = Field(..., description="Impact areas when the risk occurs.")
    mitigations: Optional[RiskMngMitigation] = Field(
        None,
        description="Optional mitigation guidance for teams that need explicit playbooks.",
    )


class RiskMngCatalog(BaseModel):
    """Response wrapper for the risk management catalog endpoint."""

    risk_catalog: List[RiskMngItem]


def load_risk_mng_catalog() -> List[RiskMngItem]:
    """Return a curated set of risks aligned with the risk management research brief."""

    return [
        RiskMngItem(
            id="risk_mng_technical_resilience",
            name="Technical Risks",
            category=RiskMngCategory.TECHNICAL,
            description="Technology, development, or system performance issues that threaten delivery.",
            triggers=[
                "Architecture fails to scale under projected user load.",
                "Security vulnerabilities or data exposure events are detected.",
                "AI model quality degrades below production thresholds.",
            ],
            consequences=[
                "Service instability or downtime during peak usage.",
                "Compliance violations or reputational damage from breaches.",
                "Rework and delayed releases due to low model accuracy.",
            ],
            mitigations=RiskMngMitigation(
                detect=[
                    "Continuous performance testing in CI for critical endpoints.",
                    "Automated security scanning of dependencies and containers.",
                    "Model drift monitoring with alert thresholds for accuracy drops.",
                ],
                prevent=[
                    "Adopt load-tested reference architectures with capacity headroom.",
                    "Apply secure-by-default coding standards and secrets management.",
                    "Use shadow deployments for new models before production rollout.",
                ],
                respond=[
                    "Activate traffic throttling and scale-out policies when saturation is detected.",
                    "Rotate credentials, patch vulnerable components, and notify stakeholders.",
                    "Rollback to the last good model checkpoint and freeze new training data.",
                ],
            ),
        ),
        RiskMngItem(
            id="risk_mng_project_execution",
            name="Project Execution Risks",
            category=RiskMngCategory.PROJECT_EXECUTION,
            description="Planning and delivery risks tied to scope, requirements, and project structure.",
            triggers=[
                "Scope creep from recurring feature additions mid-iteration.",
                "Requirement clarity is low or changes frequently.",
            ],
            consequences=[
                "Schedules slip due to uncontrolled work-in-progress.",
                "Teams deliver mismatched outcomes versus stakeholder expectations.",
            ],
            mitigations=RiskMngMitigation(
                detect=[
                    "Backlog volatility tracked via weekly scope change metrics.",
                    "Requirement churn flagged when stories roll over repeatedly.",
                ],
                prevent=[
                    "Enforce change control with impact assessments before accepting scope.",
                    "Maintain Definition of Ready/Done with clear acceptance criteria.",
                ],
                respond=[
                    "Re-baseline timelines with stakeholders when scope changes are approved.",
                    "Timebox discovery spikes to clarify requirements quickly.",
                ],
            ),
        ),
        RiskMngItem(
            id="risk_mng_business_strategy",
            name="Business & Strategic Risks",
            category=RiskMngCategory.BUSINESS_STRATEGIC,
            description="Alignment risks that affect business goals or stakeholder expectations.",
            triggers=[
                "Client requirements shift away from the current solution direction.",
                "Market or competitor moves render the solution less viable.",
                "Financial viability of the project becomes uncertain.",
                "Product vision diverges from business strategy.",
            ],
            consequences=[
                "Delivered capabilities fail to meet client outcomes.",
                "Lost market opportunity or reduced adoption.",
                "Budget overruns or deprioritization of the project.",
                "Strategic misalignment leading to rework or cancellation.",
            ],
            mitigations=RiskMngMitigation(
                detect=[
                    "Quarterly alignment reviews with business sponsors.",
                    "Win/loss and competitor signal tracking in product discovery.",
                ],
                prevent=[
                    "Tie each roadmap item to explicit business objectives and KPIs.",
                    "Validate solution direction with pilot customers before scaling.",
                ],
                respond=[
                    "Pivot roadmap priorities when KPIs trend negatively.",
                    "Refine commercial models or scope to restore viability.",
                ],
            ),
        ),
        RiskMngItem(
            id="risk_mng_external_environment",
            name="External & Environmental Risks",
            category=RiskMngCategory.EXTERNAL_ENVIRONMENTAL,
            description="External dependencies and regulatory factors outside direct control.",
            triggers=[
                "Third-party dependency (API or SDK) is deprecated or discontinued.",
                "Client-side policy or regulatory requirements change.",
            ],
            consequences=[
                "Service disruptions or forced architectural changes.",
                "Delayed releases due to compliance or integration rework.",
            ],
            mitigations=RiskMngMitigation(
                detect=[
                    "Vendor roadmap and deprecation monitoring via status pages and advisories.",
                    "Regular compliance checks against target markets and client policies.",
                ],
                prevent=[
                    "Abstract third-party integrations behind service interfaces.",
                    "Maintain fallback providers for critical dependencies where possible.",
                ],
                respond=[
                    "Execute migration playbooks when deprecation notices are issued.",
                    "Escalate compliance remediation with dedicated workstreams.",
                ],
            ),
        ),
    ]
import joblib
import pandas as pd
from fastapi import FastAPI

from models import RiskBatchRequest, RiskScore, RiskScoreResponse
from models.risk_mng_catalog import RiskMngCatalog, load_risk_mng_catalog
from services.risk_rules import evaluate_risk_rules

app = FastAPI(title="Weenet Project Management API")

@app.get("/")
def home():
    return {"message": "Weenet Project Management API is running"}

@app.post("/predict", response_model=RiskScoreResponse)
def predict(data: RiskBatchRequest):

    df = prepare_dataframe(data)
    model = joblib.load("artifacts/random_forest.pkl")

    risk_indices = model.predict(df)

    if hasattr(model, "predict_proba"):
        probability_matrix = model.predict_proba(df)
        class_index = 1 if probability_matrix.shape[1] > 1 else 0
        probabilities = probability_matrix[:, class_index]
    else:
        probabilities = risk_indices

    severity_mapping = {"low": 1.0, "medium": 2.0, "high": 3.0, "critical": 4.0}

    risk_scores = []
    for risk, risk_index, probability in zip(data.risks, risk_indices, probabilities):
        severity_score = severity_mapping.get(str(risk.severity).lower(), float("nan"))
        risk_rules = evaluate_risk_rules(risk)
        risk_scores.append(
            RiskScore(
                risk_type=str(risk.risk_type.value),
                risk_probability=float(probability),
                severity_score=severity_score,
                risk_index=float(risk_index),
                risk_rules=risk_rules,
            )
        )

    project_risk_index = float(pd.Series(risk_indices).mean())

    return RiskScoreResponse(risk_scores=risk_scores, project_risk_index=project_risk_index)

@app.post("/risk/scores")
def score_risks(batch: RiskBatchRequest):
    """Return per-item risk labels and aggregated project risk scores."""

    df = prepare_dataframe(batch)
    model = joblib.load("artifacts/random_forest.pkl")

    predictions = model.predict(df)

    if hasattr(model, "predict_proba"):
        probability_matrix = model.predict_proba(df)
        class_index_lookup = {cls: idx for idx, cls in enumerate(model.classes_)}
        probabilities = [
            float(probability_matrix[i, class_index_lookup[pred]])
            for i, pred in enumerate(predictions)
        ]
    else:
        probabilities = [float(pred) for pred in predictions]

    overall_risk_score = float(pd.Series(probabilities).mean()) if probabilities else 0.0
    risks = []
    for risk, prediction, probability in zip(batch.risks, predictions, probabilities):
        risk_rules = evaluate_risk_rules(risk)
        risks.append(
            {
                "risk_type": str(risk.risk_type.value),
                "risk_label": str(prediction),
                "probability": float(probability),
                "risk_rules": risk_rules.dict(),
            }
        )

    return {"risks": risks, "overall_risk_score": overall_risk_score}

@app.get("/risk-management/catalog", response_model=RiskMngCatalog)
def get_risk_management_catalog():
    """Serve curated risk management categories and mitigations."""

    return RiskMngCatalog(risk_catalog=load_risk_mng_catalog())
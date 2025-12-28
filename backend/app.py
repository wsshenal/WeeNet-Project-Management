import joblib
import pandas as pd
from fastapi import FastAPI

from models import RiskBatchRequest, RiskScore, RiskScoreResponse

app = FastAPI(title="Weenet Project Management API")

@app.get("/")
def home():
    return {"message": "Weenet Project Management API is running"}

@app.post("/predict", response_model=RiskScoreResponse)
def predict(data: RiskBatchRequest):
    df = pd.DataFrame([risk.model_dump() for risk in data.risks])
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
        risk_scores.append(
            RiskScore(
                risk_type=risk.risk_type,
                risk_probability=float(probability),
                severity_score=severity_score,
                risk_index=float(risk_index),
            )
        )

    project_risk_index = float(pd.Series(risk_indices).mean())

    return RiskScoreResponse(risk_scores=risk_scores, project_risk_index=project_risk_index)

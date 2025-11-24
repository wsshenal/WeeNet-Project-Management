from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Weenet Project Management API")

# Request body model (you will update this later)
class ProjectFeatures(BaseModel):
    feature1: float
    feature2: float
    feature3: float

@app.get("/")
def home():
    return {"message": "Weenet Project Management API is running"}

@app.post("/predict")
def predict(data: ProjectFeatures):
    df = pd.DataFrame([data.model_dump()])
    model = joblib.load("artifacts/random_forest.pkl")
    pred = model.predict(df)[0]
    return {"prediction": float(pred)}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import analyze, kml

app = FastAPI(
    title="Tree Crown Analysis API",
    description="API for detecting tree crowns and estimating canopy area using DeepForest and Marker-Controlled Watershed.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])
app.include_router(kml.router, prefix="/api/kml", tags=["KML"])

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

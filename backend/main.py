from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.api_v1.api import api_router

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Set CORS origins
# Allow all origins in development and production for easy cross-domain access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def home():
    return {"message": "NeuroNest backend running successfully"}
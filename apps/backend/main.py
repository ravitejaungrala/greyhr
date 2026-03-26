from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from dotenv import load_dotenv
import os

load_dotenv()  # Load variables from .env

from api.router import router
from api.enhanced_doc_system import enhanced_router

app = FastAPI(title="DurgDhana HRMS API")

# Configure CORS for frontend access
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url, 
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5175", 
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:5174", 
        "http://127.0.0.1:5175",
        "https://on3uxagkjotqw27olp3gsqyr7i0wvcjn.lambda-url.ap-south-1.on.aws",
        "https://hrms.dhanadurga.cloud"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for logos, signatures etc.
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(router, prefix="/api")
app.include_router(enhanced_router, prefix="/api")

handler = Mangum(app)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to DurgDhana HRMS API"}

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

# Configure CORS for local development. 
# In AWS Lambda, we rely on AWS's built-in Function URL CORS configuration
# to prevent returning duplicate 'Access-Control-Allow-Origin' headers.
if not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

# Mount static files for logos, signatures etc.
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(router, prefix="/api")
app.include_router(enhanced_router, prefix="/api")

print("Lambda handler invoked")
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to DurgDhana HRMS API"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.app.user_route import router as user_router

app = FastAPI(title="JobAssistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/users", tags=["users"])

@app.get("/health")
def health():
    return {"status": "ok"}
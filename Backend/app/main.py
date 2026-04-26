from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())
load_dotenv(find_dotenv(".env.local"), override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.user_route import router as user_router
from .routes.resume_route import router as resume_router
from .routes.profile_route import router as profile_router

app = FastAPI(title="JobAssistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(resume_router, prefix="/users")
app.include_router(profile_router, prefix="/users")


@app.get("/health")
def health():
    return {"status": "ok"}

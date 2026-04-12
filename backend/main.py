from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import analysis

app = FastAPI(title="Road Roughness API")

# CORS - cho phep app Expo goi tu dien thoai
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import uvicorn
import traceback

from api.routes import stocks
from api.routes import news
from api.services.data_fetcher import StockDataFetcher
from api.services.stock_filter import StockFilter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Scrynt API",
    description="Stock Analysis and Screening API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={"tryItOutEnabled": True},
    root_path_in_servers=False
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request to {request.url.path}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request query params: {request.query_params}")
    try:
        response = await call_next(request)
        logger.info(f"Response status code: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Error in request: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Include stock router
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(news.router, prefix="/api/news", tags=["news"])

@app.get("/")
async def root():
    return {"message": "Welcome to Scrynt API"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 
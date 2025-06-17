from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.news_service import create_news_service

router = APIRouter()

@router.get("/latest")
async def get_latest_news() -> List[Dict[str, Any]]:
    try:
        # Create and initialize the news service
        news_service = await create_news_service()
        
        # Fetch news from all sources
        articles = await news_service.fetch_all_news()
        
        if not articles:
            print("WARNING: No articles were found!")
            
        return articles
        
    except Exception as e:
        print(f"Error fetching news: {e}")
        print(f"Error details: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch news articles: {str(e)}"
        ) 
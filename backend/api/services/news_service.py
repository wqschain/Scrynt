from typing import List, Dict
import httpx
from datetime import datetime, timezone, timedelta
from .news_scraper import scrape_flex_news_from_url

class NewsService:
    """Service for fetching news from stockanalysis.com with caching"""
    
    def __init__(self):
        self._cached_articles = None
        self._last_updated = None
        self._cache_duration = timedelta(hours=6)
    
    async def fetch_all_news(self) -> List[Dict]:
        """Fetch news by scraping stockanalysis.com with caching"""
        now = datetime.now(timezone.utc)
        
        # Return cached articles if they're still fresh
        if self._cached_articles is not None and self._last_updated is not None:
            time_since_update = now - self._last_updated
            if time_since_update < self._cache_duration:
                print(f"Returning cached news articles (cached {time_since_update.total_seconds() / 3600:.1f} hours ago)")
                return self._cached_articles
        
        print("Cache expired or not initialized, fetching fresh news...")
        try:
            articles = await scrape_flex_news_from_url()
            if articles:
                self._cached_articles = articles
                self._last_updated = now
                print(f"Successfully cached {len(articles)} articles")
                return articles
            elif self._cached_articles:
                print("Failed to fetch fresh articles, returning stale cache as fallback")
                return self._cached_articles
            else:
                print("No articles available (both fetch failed and no cache)")
                return []
                
        except Exception as e:
            print(f"Error fetching news: {e}")
            print(f"Error details: {type(e).__name__}")
            if self._cached_articles:
                print("Returning stale cache due to error")
                return self._cached_articles
            return []

async def create_news_service() -> NewsService:
    """Create and initialize the news service"""
    return NewsService() 
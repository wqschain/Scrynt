from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import re
from playwright.async_api import async_playwright

class FlexNewsArticle:
    def __init__(
        self,
        title: str,
        url: str,
        image_url: str,
        description: str,
        timestamp: str,
        source: str
    ):
        self.title = title
        self.url = url
        self.image_url = image_url
        self.description = description
        self.timestamp = timestamp
        self.source = source

    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "url": self.url,
            "image_url": self.image_url,
            "description": self.description,
            "timestamp": self.timestamp,
            "source": self.source
        }

def parse_timestamp_source(timestamp_text: str) -> tuple[str, str]:
    """Parse timestamp and source from the combined text."""
    # Example: "27 minutes ago - FXEmpire"
    parts = timestamp_text.split(" - ")
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return timestamp_text, ""

def scrape_flex_news_articles(html_content: str, max_articles: int = 8) -> List[FlexNewsArticle]:
    """
    Scrape news articles from HTML content using the new structure.
    Returns a list of FlexNewsArticle objects.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    articles = []
    
    # Find all news article containers with the new class structure
    news_containers = soup.find_all('div', class_=lambda x: x and 'gap-4 border-gray-300 bg-default p-4' in x)
    
    for container in news_containers[:max_articles]:  # Limit to max_articles
        try:
            # Extract title and URL from the h3 > a element
            title_link = container.find('h3').find('a')
            title = title_link.get_text(strip=True)
            url = title_link['href']
            
            # Extract image URL from img tag
            img_tag = container.find('img')
            image_url = img_tag['src'] if img_tag else ""
            
            # Extract description from p tag with overflow-auto class
            desc_elem = container.find('p', class_=lambda x: x and 'overflow-auto' in x)
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            
            # Extract timestamp and source from div with text-faded class
            time_source_elem = container.find('div', class_=lambda x: x and 'text-faded' in x)
            timestamp, source = "", ""
            if time_source_elem:
                timestamp, source = parse_timestamp_source(time_source_elem.get_text(strip=True))
            
            article = FlexNewsArticle(
                title=title,
                url=url,
                image_url=image_url,
                description=description,
                timestamp=timestamp,
                source=source
            )
            articles.append(article)
            
        except Exception as e:
            print(f"Error parsing article: {str(e)}")
            continue
    
    return articles

async def scrape_flex_news_from_url(url: str = "https://stockanalysis.com/news/all-stocks/") -> List[Dict]:
    """
    Scrape news articles from the specified URL using Playwright.
    Returns a list of dictionaries containing article information.
    """
    print("Launching browser...")
    async with async_playwright() as p:
        print("Creating new page...")
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        try:
            print("Navigating to news page...")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # Wait for the news container to be visible
            await page.wait_for_selector('div[class*="gap-4 border-gray-300"]', timeout=60000)
            
            # Get the page content after JavaScript has rendered
            content = await page.content()
            articles = scrape_flex_news_articles(content)
            return [article.to_dict() for article in articles]
            
        except Exception as e:
            print(f"Error scraping URL {url}: {str(e)}")
            print(f"Error details: {type(e).__name__}")
            return []
            
        finally:
            await browser.close() 
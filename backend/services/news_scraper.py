from bs4 import BeautifulSoup
import requests
from typing import List, Dict, Optional
from datetime import datetime
import re

class FlexNewsArticle:
    def __init__(
        self,
        title: str,
        image_url: str,
        description: str,
        timestamp: str,
        source: str
    ):
        self.title = title
        self.image_url = image_url
        self.description = description
        self.timestamp = timestamp
        self.source = source

    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "image_url": self.image_url,
            "description": self.description,
            "timestamp": self.timestamp,
            "source": self.source
        }

def extract_image_url(style_attr: str) -> Optional[str]:
    """Extract image URL from background-image style attribute."""
    if not style_attr:
        return None
    
    match = re.search(r"url\((.*?)\)", style_attr)
    if match:
        # Remove any quotes around the URL
        url = match.group(1).strip("'\"")
        return url
    return None

def parse_timestamp_source(timestamp_text: str) -> tuple[str, str]:
    """Parse timestamp and source from the combined text."""
    # Example: "2 hours ago - Yahoo Finance"
    parts = timestamp_text.split(" - ")
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return timestamp_text, ""

def scrape_flex_news_articles(html_content: str) -> List[FlexNewsArticle]:
    """
    Scrape news articles from HTML content that uses a flex-based layout structure.
    Returns a list of FlexNewsArticle objects.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    articles = []
    
    # Find all news article containers with flex layout
    news_containers = soup.find_all('div', class_=lambda x: x and 'flex flex-col border-gray-300' in x)
    
    for container in news_containers:
        try:
            # Extract title
            title_elem = container.find('h3', class_=lambda x: x and 'text-xl font-bold' in x)
            title = title_elem.get_text(strip=True) if title_elem else ""
            
            # Extract image URL
            image_div = container.find('div', class_=lambda x: x and 'group relative block' in x)
            image_url = ""
            if image_div and 'style' in image_div.attrs:
                image_url = extract_image_url(image_div['style'])
            
            # Extract description
            desc_elem = container.find('p', class_=lambda x: x and 'overflow-auto' in x)
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            
            # Extract timestamp and source
            time_source_elem = container.find('div', class_=lambda x: x and 'text-faded' in x)
            timestamp, source = "", ""
            if time_source_elem:
                timestamp, source = parse_timestamp_source(time_source_elem.get_text(strip=True))
            
            article = FlexNewsArticle(
                title=title,
                image_url=image_url or "",
                description=description,
                timestamp=timestamp,
                source=source
            )
            articles.append(article)
            
        except Exception as e:
            print(f"Error parsing article: {str(e)}")
            continue
    
    return articles

def scrape_flex_news_from_url(url: str) -> List[Dict]:
    """
    Scrape news articles from a given URL that uses a flex-based layout structure.
    Returns a list of dictionaries containing article information.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
        articles = scrape_flex_news_articles(response.text)
        return [article.to_dict() for article in articles]
    except Exception as e:
        print(f"Error scraping URL {url}: {str(e)}")
        return [] 
# Scrynt - Advanced Stock Market Analysis Platform

Scrynt is a sophisticated real-time stock market analysis platform that combines advanced financial metrics, machine learning, and market sentiment analysis to provide comprehensive insights for US public companies. The platform features a proprietary Scrynt Score™ system that evaluates stocks based on multiple factors including value, growth, momentum, and risk metrics.

## Overview

Scrynt helps investors make data-driven decisions through:

- **Real-Time Market Intelligence**: Live stock screening with dynamic updates and real-time news integration
- **Advanced Analytics**: Comprehensive analysis suite covering value, growth, momentum, risk, and dividend metrics
- **Proprietary Scoring**: Scrynt Score™ system for holistic stock evaluation
- **Sector Analysis**: Deep dive into sector-specific performance and trends
- **Custom Screening**: Flexible screening tools with multiple metrics and custom criteria

The platform is designed for both professional investors and retail traders, offering institutional-grade analysis tools in an intuitive interface.

## Core Features

### Real-Time Market Intelligence
- **Live Stock Screener**
  - Real-time stock filtering and screening
  - Dynamic metric updates
  - Custom screening templates
  - Save and load screening configurations
  - Instant results as you adjust criteria

- **Live News Integration**
  - Real-time market news updates
  - Company-specific news tracking
  - Sector news monitoring
  - Market sentiment analysis
  - Breaking news alerts

### Analytics Suite
- **Scrynt Score™**
  - Proprietary scoring system
  - Multi-factor stock evaluation
  - Risk-adjusted performance metrics
  - Sector-relative scoring
  - Customizable factor weights
  - Real-time score updates

- **Composite Score Analysis**
  - Overall stock evaluation combining multiple metrics
  - Sector-wise performance comparison
  - Custom weighting for different factors

- **Value & Growth Analysis**
  - PEG Ratio evaluation
  - Forward P/E analysis
  - Revenue and EPS growth tracking
  - Sector-specific benchmarking

- **Momentum Analysis**
  - Multiple timeframe performance tracking (1W to 3Y)
  - RSI and momentum indicators
  - Trend analysis and visualization

- **Risk & Return Analysis**
  - Beta calculation and visualization
  - Risk-adjusted returns (Sharpe Ratio)
  - Sector risk profiling

- **Dividend Analysis**
  - Dividend yield tracking
  - Payout ratio analysis
  - Dividend growth evaluation
  - Income-focused screening

- **Correlation & Clustering**
  - Inter-stock correlation analysis
  - Sector-based clustering
  - Risk diversification insights

### Sub Features
- **Advanced Filtering System**
  - Multi-metric filtering
  - Sector-based screening
  - Market cap categorization
  - Custom filter combinations
  - Real-time filter updates

- **Real-time Data**
  - Live stock price updates
  - Latest market news integration
  - Real-time metrics calculation
  - Instant screening results
  - Dynamic data updates

- **Interactive UI**
  - Modern, responsive design
  - Dynamic data visualization
  - Customizable views
  - Intuitive navigation
  - Real-time updates

## Technology Stack

### Frontend
- **Framework & Core**
  - Next.js 14
  - React 18
  - TypeScript 5
  
- **UI & Styling**
  - Chakra UI
  - Framer Motion
  - Emotion
  - React Icons

- **State & Data Management**
  - Axios for API calls

### Backend
- **Core & API**
  - FastAPI 0.109+
  - Uvicorn 0.27+
  - Pydantic 2.5+

- **Data Processing**
  - Pandas 2.2
  - NumPy 1.26
  - SQLAlchemy 2.0
  
- **Web Scraping & External Data**
  - Playwright
  - BeautifulSoup4
  - HTTPX
  - Requests

- **Security & Authentication**
  - Python-Jose
  - PassLib with BCrypt
  - Python-multipart

- **File Operations**
  - AioFiles
  - Python-dotenv

## Data Sources & Collection

### Stock Market Data
- Integration with Stock Analysis API (stockanalysis.com)
  - Comprehensive JSON endpoint for stock data
  - Real-time price and market metrics
  - Financial ratios and indicators
  - Company fundamentals
  - Historical performance data
  - Sector classifications

### Market News
- Custom web scraping implementation
  - Real-time news scraping from stockanalysis.com
  - Automated news categorization
  - Company-specific news tracking
  - Market-wide updates
  - Sector-specific news monitoring
  - Efficient caching system for performance

### Data Processing
- Automated data cleaning and normalization
- Real-time metric calculations
- Custom scoring algorithms
- Sector-based analysis
- Performance optimization through caching

## Project Structure

```
scrynt/
├── frontend/                      # Next.js frontend application
│   ├── public/                    # Static assets and images
│   │   ├── images/               # Image assets
│   │   └── icons/                # Icon assets
│   └── src/
│       └── app/                  # Next.js 14 App Router
│           ├── analytics/        # Analytics views
│           │   ├── page.tsx      # Analytics page
│           │   └── components/   # Analytics-specific components
│           ├── api/             # API route handlers
│           │   ├── news/        # News API routes
│           │   └── stocks/      # Stocks API routes
│           ├── components/      # Shared components
│           │   ├── Layout.tsx   # Main layout component
│           │   ├── Navbar.tsx   # Navigation component
│           │   └── analytics/   # Analytics components
│           ├── dashboard/       # Dashboard views
│           ├── services/        # API services
│           │   └── stockService.ts  # Stock data service
│           └── utils/          # Utility functions
│
├── backend/                      # FastAPI backend
│   ├── api/                     # API implementation
│   │   ├── routes/             # API endpoints
│   │   │   ├── stocks.py      # Stock-related endpoints
│   │   │   └── news.py        # News-related endpoints
│   │   └── services/          # Business logic
│   │       ├── data_fetcher.py   # Data fetching service
│   │       ├── stock_filter.py   # Stock filtering logic
│   │       └── news_scraper.py   # News scraping service
│   ├── data/                   # Data storage
│   │   └── stocks/            # Stock data files
│   └── main.py                # Application entry point
│
├── data/                        # Shared data directory
│   └── scrynt_data_latest.csv  # Latest stock data
│
└── README.md                    # Project documentation
```

### Key Directories

#### Frontend
- `frontend/src/app`: Main application code using Next.js 14 App Router
- `frontend/src/app/analytics`: Advanced analytics features
- `frontend/src/app/components`: Reusable UI components
- `frontend/src/app/services`: API integration services
- `frontend/public`: Static assets and resources

#### Backend
- `backend/api/routes`: API endpoint definitions
- `backend/api/services`: Core business logic
- `backend/data`: Data persistence layer
- `data`: Shared data storage

## API Endpoints

### Stock Data Endpoints
- `/api/stocks`
  - Main endpoint for stock data
  - Supports comprehensive filtering
  - Pagination and sorting
  - Parameters for market cap, ratios, growth metrics

- `/api/stocks/metrics`
  - Available metrics for filtering
  - List of supported sectors
  - Metric descriptions and types

- `/api/stocks/top-gainers`
  - Top performing stocks
  - Configurable time periods (1w, 1m, 6m, ytd, 1y, 3y)
  - Customizable limit

- `/api/stocks/dividend-leaders`
  - Highest dividend yield stocks
  - Sorted by yield
  - Customizable limit

- `/api/stocks/undervalued-growth`
  - Growth stocks with attractive valuations
  - Combined growth and value metrics
  - Customizable limit

### News Endpoints
- `/api/news/latest`
  - Latest market news
  - Real-time updates
  - Web-scraped from reliable sources

## Project Demo

This is a quick demo of the project. Click below to watch it on YouTube:

[![Watch the Demo](https://img.youtube.com/vi/yz2QJ-ctf00/hqdefault.jpg)](https://www.youtube.com/watch?v=yz2QJ-ctf00)

## Contact

- Twitter/X: [@wqschain](https://x.com/wqschain)

## License

MIT License 

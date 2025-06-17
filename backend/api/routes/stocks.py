import logging
from fastapi import APIRouter, Query, Request
from typing import List, Optional
from api.services.stock_filter import StockFilter
from api.services.data_fetcher import StockDataFetcher

logger = logging.getLogger(__name__)
router = APIRouter()
filter_service = StockFilter()

@router.get("/", include_in_schema=True)
@router.get("", include_in_schema=True)
async def get_stocks(
    request: Request,
    page: int = Query(1, description="Page number", ge=1),
    ticker: Optional[str] = Query(None, description="Filter by ticker symbol"),
    sectors: Optional[List[str]] = Query(None, description="Filter by sectors"),
    min_market_cap: Optional[float] = Query(None, description="Minimum market cap"),
    max_market_cap: Optional[float] = Query(None, description="Maximum market cap"),
    min_dividend_yield: Optional[float] = Query(None, description="Minimum dividend yield"),
    max_dividend_yield: Optional[float] = Query(None, description="Maximum dividend yield"),
    min_peg: Optional[float] = Query(None, description="Minimum PEG ratio"),
    max_peg: Optional[float] = Query(None, description="Maximum PEG ratio"),
    min_pb: Optional[float] = Query(None, description="Minimum P/B ratio"),
    max_pb: Optional[float] = Query(None, description="Maximum P/B ratio"),
    min_pe: Optional[float] = Query(None, description="Minimum forward P/E"),
    max_pe: Optional[float] = Query(None, description="Maximum forward P/E"),
    min_eps_growth: Optional[float] = Query(None, description="Minimum 3Y EPS growth"),
    min_revenue_growth: Optional[float] = Query(None, description="Minimum 3Y revenue growth"),
    min_roe: Optional[float] = Query(None, description="Minimum ROE"),
    min_roa: Optional[float] = Query(None, description="Minimum ROA"),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(50, description="Number of results per page", le=1000)
):
    """Get filtered stock data with pagination"""
    logger.info(f"Processing request to get_stocks")
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Query params: {request.query_params}")
    
    try:
        # Reset filters for new request
        filter_service.reset_filters()
        
        # Apply all filters
        if ticker:
            logger.info(f"Filtering by ticker: {ticker}")
            filter_service.filter_by_ticker(ticker)
        if sectors:
            logger.info(f"Filtering by sectors: {sectors}")
            filter_service.filter_by_sector(sectors)
        if min_market_cap is not None or max_market_cap is not None:
            logger.info(f"Filtering by market cap: min={min_market_cap}, max={max_market_cap}")
            filter_service.filter_by_market_cap(min_market_cap, max_market_cap)
        if min_dividend_yield is not None or max_dividend_yield is not None:
            logger.info(f"Filtering by dividend yield: min={min_dividend_yield}, max={max_dividend_yield}")
            filter_service.filter_by_dividend_yield(min_dividend_yield, max_dividend_yield)
        if min_peg is not None or max_peg is not None:
            filter_service.filter_by_peg(min_peg, max_peg)
        if min_pb is not None or max_pb is not None:
            filter_service.filter_by_pb(min_pb, max_pb)
        if min_pe is not None or max_pe is not None:
            filter_service.filter_by_pe(min_pe, max_pe)
        if min_eps_growth is not None:
            filter_service.filter_by_eps_growth(min_eps_growth)
        if min_revenue_growth is not None:
            filter_service.filter_by_revenue_growth(min_revenue_growth)
        if min_roe is not None:
            filter_service.filter_by_roe(min_roe)
        if min_roa is not None:
            filter_service.filter_by_roa(min_roa)

        # Get results with pagination
        logger.info("Getting filtered results")
        results, total_count = filter_service.get_results(
            sort_by=sort_by,
            sort_desc=sort_desc,
            page=page,
            limit=limit
        )
        
        # Convert results to dict and handle empty DataFrame
        if results.empty:
            logger.info("No results found")
            return {
                "data": [],
                "count": 0,
                "total_count": 0,
                "total_pages": 0,
                "current_page": page,
                "last_updated": filter_service.fetcher.last_updated
            }
            
        data = results.to_dict(orient="records")
        total_pages = (total_count + limit - 1) // limit
        
        logger.info(f"Found {len(data)} results")
        return {
            "data": data,
            "count": len(data),
            "total_count": total_count,
            "total_pages": total_pages,
            "current_page": page,
            "last_updated": filter_service.fetcher.last_updated
        }
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": None
        }

@router.get("/metrics")
async def get_available_metrics():
    """Get available metrics for filtering and sorting"""
    return {
        "metrics": [
            {"name": "price", "description": "Current stock price"},
            {"name": "marketCap", "description": "Market capitalization"},
            {"name": "pegRatio", "description": "Price/Earnings to Growth ratio"},
            {"name": "fcfYield", "description": "Free Cash Flow Yield"},
            {"name": "roe", "description": "Return on Equity"},
            {"name": "roa", "description": "Return on Assets"},
            {"name": "peForward", "description": "Forward P/E ratio"},
            {"name": "pbRatio", "description": "Price to Book ratio"},
            {"name": "pFcfRatio", "description": "Price to Free Cash Flow ratio"},
            {"name": "psRatio", "description": "Price to Sales ratio"},
            {"name": "epsGrowth3Y", "description": "3-Year EPS Growth"},
            {"name": "revenueGrowth3Y", "description": "3-Year Revenue Growth"},
            {"name": "dividendYield", "description": "Dividend Yield"},
            {"name": "beta", "description": "Beta"},
        ],
        "sectors": filter_service.get_available_sectors()
    }

@router.get("/top-gainers")
async def get_top_gainers(
    period: str = Query("1w", description="Time period (1w, 1m, 6m, ytd, 1y, 3y)"),
    limit: int = Query(10, description="Number of stocks to return")
):
    """Get top gaining stocks"""
    try:
        results = filter_service.get_top_gainers(period, limit)
        return {
            "data": results.to_dict(orient="records"),
            "count": len(results),
            "last_updated": filter_service.fetcher.last_updated
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/dividend-leaders")
async def get_dividend_leaders(
    limit: int = Query(10, description="Number of stocks to return")
):
    """Get stocks with highest dividend yields"""
    try:
        results = filter_service.get_highest_dividend_yields(limit)
        return {
            "data": results.to_dict(orient="records"),
            "count": len(results),
            "last_updated": filter_service.fetcher.last_updated
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/undervalued-growth")
async def get_undervalued_growth(
    limit: int = Query(10, description="Number of stocks to return")
):
    """Get undervalued growth stocks"""
    try:
        results = filter_service.get_undervalued_growth_stocks(limit)
        return {
            "data": results.to_dict(orient="records"),
            "count": len(results),
            "last_updated": filter_service.fetcher.last_updated
        }
    except Exception as e:
        return {"error": str(e)} 
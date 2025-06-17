import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
import os
from api.services.data_fetcher import StockDataFetcher

class StockFilter:
    def __init__(self):
        self.fetcher = StockDataFetcher()
        self._filters = []
        self._data = None

    @property
    def df(self) -> pd.DataFrame:
        if self._data is None:
            self._data = self.fetcher.get_dataframe()
        return self._data

    def reset_filters(self):
        """Reset all filters"""
        self._filters = []
        self._data = None
        return self

    def filter_by_ticker(self, ticker: str):
        """Filter stocks by ticker symbol"""
        if ticker:
            self._filters.append(lambda df: df['ticker'].str.contains(ticker.upper(), case=False))
        return self

    def get_available_sectors(self) -> List[str]:
        """Get list of available sectors"""
        return sorted(self.df['sector'].dropna().unique().tolist())

    def filter_by_sector(self, sectors: List[str]):
        """Filter stocks by sector"""
        if sectors:
            self._filters.append(lambda df: df['sector'].isin(sectors))

    def filter_by_market_cap(self, min_cap: Optional[float], max_cap: Optional[float]):
        """Filter stocks by market cap range"""
        if min_cap is not None:
            self._filters.append(lambda df: df['market_cap'] >= min_cap)
        if max_cap is not None:
            self._filters.append(lambda df: df['market_cap'] <= max_cap)

    def filter_by_dividend_yield(self, min_yield: Optional[float], max_yield: Optional[float]):
        """Filter stocks by dividend yield range"""
        if min_yield is not None:
            self._filters.append(lambda df: df['dividend_yield'] >= min_yield)
        if max_yield is not None:
            self._filters.append(lambda df: df['dividend_yield'] <= max_yield)

    def filter_by_peg(self, min_peg: Optional[float], max_peg: Optional[float]):
        """Filter stocks by PEG ratio range"""
        if min_peg is not None:
            self._filters.append(lambda df: df['peg_ratio'] >= min_peg)
        if max_peg is not None:
            self._filters.append(lambda df: df['peg_ratio'] <= max_peg)

    def filter_by_pb(self, min_pb: Optional[float], max_pb: Optional[float]):
        """Filter stocks by P/B ratio range"""
        if min_pb is not None:
            self._filters.append(lambda df: df['pb_ratio'] >= min_pb)
        if max_pb is not None:
            self._filters.append(lambda df: df['pb_ratio'] <= max_pb)

    def filter_by_pe(self, min_pe: Optional[float], max_pe: Optional[float]):
        """Filter stocks by P/E ratio range"""
        if min_pe is not None:
            self._filters.append(lambda df: df['pe_forward'] >= min_pe)
        if max_pe is not None:
            self._filters.append(lambda df: df['pe_forward'] <= max_pe)

    def filter_by_eps_growth(self, min_growth: Optional[float]):
        """Filter stocks by EPS growth"""
        if min_growth is not None:
            self._filters.append(lambda df: df['eps_growth_3y'] >= min_growth)

    def filter_by_revenue_growth(self, min_growth: Optional[float]):
        """Filter stocks by revenue growth"""
        if min_growth is not None:
            self._filters.append(lambda df: df['revenue_growth_3y'] >= min_growth)

    def filter_by_roe(self, min_roe: Optional[float]):
        """Filter stocks by ROE"""
        if min_roe is not None:
            self._filters.append(lambda df: df['roe'] >= min_roe)

    def filter_by_roa(self, min_roa: Optional[float]):
        """Filter stocks by ROA"""
        if min_roa is not None:
            self._filters.append(lambda df: df['roa'] >= min_roa)

    def get_results(
        self,
        sort_by: Optional[str] = None,
        sort_desc: bool = True,
        page: int = 1,
        limit: int = 50
    ) -> Tuple[pd.DataFrame, int]:
        """
        Get filtered and sorted results with pagination
        Returns: (DataFrame of results, total count of filtered results)
        """
        df = self.df
        
        # Apply all filters
        for filter_func in self._filters:
            df = df[filter_func(df)]
        
        # Sort if specified
        if sort_by and sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=not sort_desc)
        
        # Calculate total count before pagination
        total_count = len(df)
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        df = df.iloc[start_idx:end_idx]
        
        return df, total_count

    def get_top_gainers(self, period: str = "1w", limit: int = 10) -> pd.DataFrame:
        """
        Get top gaining stocks for a given period.
        
        Args:
            period: Time period for returns ('1w', '1m', '6m', 'ytd', '1y', '3y')
            limit: Number of stocks to return
            
        Returns:
            DataFrame containing top gainers with positive returns, sorted by return
        """
        df = self.fetcher.get_dataframe()
        
        # Map period to column name
        period_map = {
            "1w": "change_1w",
            "1m": "change_1m",
            "6m": "change_6m",
            "ytd": "change_ytd",
            "1y": "change_1y",
            "3y": "change_3y"
        }
        
        if period not in period_map:
            period = "1w"
            
        change_col = period_map[period]
        
        # Filter out invalid data
        df = df[
            (df['price'] > 0) &  # Remove zero/missing prices
            (df[change_col].notna()) &  # Remove missing returns
            (df[change_col] > 0)  # Keep only positive momentum
        ]
        
        # Sort by return in descending order and take top N
        return df.nlargest(limit, change_col)

    def get_highest_dividend_yields(self, limit: int = 10) -> pd.DataFrame:
        """Get stocks with highest dividend yields"""
        return self.df[self.df['dividend_yield'] > 0].nlargest(limit, 'dividend_yield')

    def get_undervalued_growth_stocks(self, limit: int = 10) -> pd.DataFrame:
        """Get undervalued growth stocks"""
        df = self.fetcher.get_dataframe()
        # Consider stocks with high growth but low PE ratio
        df['growth_score'] = df['eps_growth_3y'] + df['revenue_growth_3y']
        df['value_score'] = 1 / (df['pe_forward'] + df['pb_ratio'])
        df['combined_score'] = df['growth_score'] * df['value_score']
        result = df.nlargest(limit, 'combined_score')
        result = result.drop(['growth_score', 'value_score', 'combined_score'], axis=1)
        return result

# Example usage
if __name__ == "__main__":
    # Load and filter data
    filter = StockFilter()
    
    # Example: Get technology stocks with good growth and dividends
    results = (filter
        .filter_by_sector(['Technology'])
        .filter_by_market_cap(min_cap=1e9)  # > $1B market cap
        .filter_by_dividend_yield(1.5)       # > 1.5% dividend yield
        .filter_by_eps_growth(10)            # > 10% EPS growth
        .get_results()
    )
    
    print("\nFiltered Technology Stocks:")
    print(results[['ticker', 'name', 'dividend_yield', 'eps_growth_3y']].head())
    
    # Example: Get top gainers
    print("\nTop Weekly Gainers:")
    print(filter.reset_filters().get_top_gainers(period='1w', limit=5))
    
    # Example: Get highest dividend yields
    print("\nHighest Dividend Yields:")
    print(filter.reset_filters().get_highest_dividend_yields(limit=5)) 
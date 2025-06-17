import requests
import pandas as pd
import json
from datetime import datetime
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class StockDataFetcher:
    def __init__(self):
        self.api_url = "https://stockanalysis.com/api/screener/s/bd/price+marketCap+pegRatio+fcfYield+roe+roa+revenue+operatingIncome+netIncome+fcf+eps+ch1w+ch1m+ch6m+chYTD+ch1y+ch3y+sector+peForward+pbRatio+pFcfRatio+psRatio+epsGrowth3Y+revenueGrowth3Y+debtEquity+beta+dps+dividendYield+payoutRatio+dividendGrowth+payoutFrequency+analystRatings+analystCount+priceTarget+priceTargetChange.json"
        self.data_dir = "data"
        os.makedirs(self.data_dir, exist_ok=True)
        self._data = None
        self._last_updated = None

    @property
    def last_updated(self) -> str:
        """Get the last time the data was updated"""
        if self._last_updated:
            return self._last_updated.isoformat()
        return None

    def get_dataframe(self) -> pd.DataFrame:
        """Get the data as a pandas DataFrame"""
        raw_data = self.fetch_data()
        return self.process_data(raw_data)

    def fetch_data(self) -> Dict[str, Any]:
        """
        Fetch stock data from the API
        """
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            logger.info("Fetching data from API...")
            response = requests.get(self.api_url, headers=headers)
            response.raise_for_status()
            logger.info("Successfully fetched data")
            self._data = response.json()
            self._last_updated = datetime.now()
            return self._data
        except requests.RequestException as e:
            logger.error(f"Error fetching data: {e}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response text: {e.response.text}")
            return {}

    def process_data(self, raw_data: Dict[str, Any]) -> pd.DataFrame:
        """
        Process raw JSON data into a pandas DataFrame
        """
        try:
            logger.debug("Processing raw data")
            logger.debug(f"Raw data type: {type(raw_data)}")
            logger.debug(f"Raw data keys: {raw_data.keys() if isinstance(raw_data, dict) else 'Not a dict'}")
            
            # Extract the data from the nested structure
            if not isinstance(raw_data, dict) or 'data' not in raw_data:
                logger.error("Invalid data structure - missing 'data' key")
                return pd.DataFrame()

            data = raw_data.get('data', {}).get('data', {})
            logger.debug(f"Extracted data type: {type(data)}")
            logger.debug(f"Number of stocks: {len(data) if isinstance(data, dict) else 'Not a dict'}")
            
            if not isinstance(data, dict):
                logger.error("Invalid data structure - expected dictionary")
                return pd.DataFrame()

            stocks_data = []
            for ticker, stock in data.items():
                if not isinstance(stock, dict):
                    continue

                try:
                    stock_dict = {
                        "ticker": ticker,
                        "price": self._safe_float(stock.get("price")),
                        "market_cap": self._safe_float(stock.get("marketCap")),
                        "peg_ratio": self._safe_float(stock.get("pegRatio")),
                        "fcf_yield": self._safe_float(stock.get("fcfYield")),
                        "roe": self._safe_float(stock.get("roe")),
                        "roa": self._safe_float(stock.get("roa")),
                        "revenue": self._safe_float(stock.get("revenue")),
                        "operating_income": self._safe_float(stock.get("operatingIncome")),
                        "net_income": self._safe_float(stock.get("netIncome")),
                        "fcf": self._safe_float(stock.get("fcf")),
                        "eps": self._safe_float(stock.get("eps")),
                        "sector": str(stock.get("sector", "")),
                        "pe_forward": self._safe_float(stock.get("peForward")),
                        "pb_ratio": self._safe_float(stock.get("pbRatio")),
                        "ps_ratio": self._safe_float(stock.get("psRatio")),
                        "eps_growth_3y": self._safe_float(stock.get("epsGrowth3Y")),
                        "revenue_growth_3y": self._safe_float(stock.get("revenueGrowth3Y")),
                        "debt_equity": self._safe_float(stock.get("debtEquity")),
                        "beta": self._safe_float(stock.get("beta")),
                        "dividend_yield": self._safe_float(stock.get("dividendYield")),
                        "payout_ratio": self._safe_float(stock.get("payoutRatio")),
                        "dividend_growth": self._safe_float(stock.get("dividendGrowth")),
                        "analyst_rating": self._safe_float(stock.get("analystRatings")),
                        "analyst_count": self._safe_float(stock.get("analystCount")),
                        "price_target": self._safe_float(stock.get("priceTarget")),
                        "price_target_change": self._safe_float(stock.get("priceTargetChange")),
                        "change_1w": self._safe_float(stock.get("ch1w")),
                        "change_1m": self._safe_float(stock.get("ch1m")),
                        "change_6m": self._safe_float(stock.get("ch6m")),
                        "change_ytd": self._safe_float(stock.get("chYTD")),
                        "change_1y": self._safe_float(stock.get("ch1y")),
                        "change_3y": self._safe_float(stock.get("ch3y"))
                    }
                    stocks_data.append(stock_dict)
                except Exception as e:
                    logger.error(f"Error processing stock {ticker}: {e}")
                    continue

            logger.info(f"Processed {len(stocks_data)} stocks")
            df = pd.DataFrame(stocks_data)
            logger.debug(f"DataFrame shape: {df.shape}")
            logger.debug(f"DataFrame columns: {df.columns.tolist()}")
            
            # Replace infinite values with NaN and then 0
            df = df.replace([float('inf'), float('-inf')], float('nan')).fillna(0)
            
            return df

        except Exception as e:
            logger.error(f"Error processing data: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return pd.DataFrame()

    def _safe_float(self, value) -> float:
        """Safely convert value to float, return 0 if not possible"""
        if value is None:
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def save_data(self, df: pd.DataFrame) -> str:
        """
        Save the processed data to CSV with timestamp
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scrynt_data_{timestamp}.csv"
        filepath = os.path.join(self.data_dir, filename)
        
        df.to_csv(filepath, index=False)
        logger.info(f"Data saved to {filepath}")
        
        # Also save a copy as the latest version
        latest_filepath = os.path.join(self.data_dir, "scrynt_data_latest.csv")
        df.to_csv(latest_filepath, index=False)
        
        return filepath

def main():
    fetcher = StockDataFetcher()
    
    print("Fetching stock data...")
    raw_data = fetcher.fetch_data()
    
    if not raw_data:
        print("Failed to fetch data. Exiting...")
        return
    
    print("Processing data...")
    df = fetcher.process_data(raw_data)
    
    if df.empty:
        print("No data processed. Exiting...")
        return
    
    print(f"Successfully processed {len(df)} stocks")
    print("\nSample data preview:")
    print(df.head())
    print("\nDataset columns:")
    print(df.columns.tolist())
    
    filepath = fetcher.save_data(df)
    print(f"\nData has been saved to {filepath}")
    print("A copy has also been saved as 'scrynt_data_latest.csv'")

if __name__ == "__main__":
    main() 
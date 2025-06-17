import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  market_cap: number;
  change_1w: number;
  change_1m: number;
  change_6m: number;
  change_ytd: number;
  change_1y: number;
  change_3y: number;
  dividend_yield: number;
  dividend_growth: number;
  payout_ratio: number;
  peg_ratio: number;
  pb_ratio: number;
  pe_forward: number;
  eps_growth_3y: number;
  revenue_growth_3y: number;
  roe: number;
  roa: number;
  beta: number;
}

export interface StockResponse {
  data: StockData[];
  total_pages: number;
  total_count: number;
  last_updated: string;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let stockCache: {
  data: StockData[];
  lastUpdated: string;
  timestamp: number;
} | null = null;

// Keep track of ongoing fetch promise to prevent multiple simultaneous requests
let fetchPromise: Promise<{ data: StockData[]; lastUpdated: string }> | null = null;

// Function to fetch all stocks from API
export const fetchAllStocks = async (forceRefresh = false): Promise<{ data: StockData[]; lastUpdated: string }> => {
  // Return cached data if available and not expired
  if (!forceRefresh && stockCache && (Date.now() - stockCache.timestamp) < CACHE_DURATION) {
    return {
      data: stockCache.data,
      lastUpdated: stockCache.lastUpdated
    };
  }

  // If there's already a fetch in progress, return that promise
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start a new fetch
  fetchPromise = (async () => {
    let allStocks: StockData[] = [];
    let page = 1;
    let lastUpdated = '';
    const limit = 1000;  // Maximum allowed by backend
    
    try {
      while (true) {
        const response = await axios.get<StockResponse>(`${API_BASE_URL}/stocks?page=${page}&limit=${limit}`);
        allStocks = [...allStocks, ...response.data.data];
        lastUpdated = response.data.last_updated;
        
        // If we got fewer results than the limit, we've reached the end
        if (response.data.data.length < limit || page * limit >= response.data.total_count) {
          break;
        }
        
        page++;
      }
      
      // Update cache
      stockCache = {
        data: allStocks,
        lastUpdated,
        timestamp: Date.now()
      };
      
  return {
        data: allStocks,
        lastUpdated
      };
    } catch (error) {
      console.error('Error fetching stocks:', error);
      throw error;
    } finally {
      fetchPromise = null; // Clear the promise when done
    }
  })();

  return fetchPromise;
};

// Function to clear cache
export const clearStockCache = () => {
  stockCache = null;
};

// Client-side filtering function
const filterStocksLocally = (
  stocks: StockData[],
  filters: Record<string, any>
): StockData[] => {
  return stocks.filter(stock => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || value === '') return true;

      const stockValue = stock[key as keyof StockData];
      
      // Handle sector with exact match
      if (key === 'sector') {
        // Handle both single sector and array of sectors
        const sectors = Array.isArray(value) ? value : [value];
        return sectors.includes(stockValue);
      }

      // Handle string fields (like ticker)
      if (typeof stockValue === 'string' && key !== 'sector') {
        return stockValue.toLowerCase().includes(String(value).toLowerCase());
      }

      // Handle numeric fields with min/max prefixes
      if (key.startsWith('min_')) {
        const actualKey = key.replace('min_', '') as keyof StockData;
        const numValue = parseFloat(value);
        const stockNum = Number(stock[actualKey]);
        
        if (!isNaN(numValue) && !isNaN(stockNum)) {
          // For percentage fields, compare as is
          if (actualKey.includes('change_') || actualKey === 'dividend_yield') {
            return stockNum >= numValue;
          }
          // For market cap, handle millions
          if (actualKey === 'market_cap') {
            return stockNum >= numValue * 1000000;
          }
          return stockNum >= numValue;
        }
      }

      if (key.startsWith('max_')) {
        const actualKey = key.replace('max_', '') as keyof StockData;
        const numValue = parseFloat(value);
        const stockNum = Number(stock[actualKey]);
        
        if (!isNaN(numValue) && !isNaN(stockNum)) {
          // For percentage fields, compare as is
          if (actualKey.includes('change_') || actualKey === 'dividend_yield') {
            return stockNum <= numValue;
          }
          // For market cap, handle millions
          if (actualKey === 'market_cap') {
            return stockNum <= numValue * 1000000;
          }
          return stockNum <= numValue;
        }
      }

      // Handle direct numeric comparisons
      if (typeof stockValue === 'number') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // For percentage fields, compare as is
          if (key.includes('change_') || key === 'dividend_yield') {
            return stockValue >= numValue;
          }
          // For market cap, handle millions
          if (key === 'market_cap') {
            return stockValue >= numValue * 1000000;
          }
          return stockValue >= numValue;
        }
      }

      return true;
    });
  });
};

// Client-side sorting function
const sortStocksLocally = (
  stocks: StockData[],
  sortBy: keyof StockData | undefined,
  sortDesc: boolean
): StockData[] => {
  if (!sortBy) return stocks;

  return [...stocks].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDesc
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDesc ? bValue - aValue : aValue - bValue;
    }

    return 0;
  });
};

// Main function to get stocks with client-side filtering and pagination
export const fetchStocks = async (
  filters: Record<string, any> = {},
  page: number = 1,
  limit: number = 50,
  sortBy?: string,
  sortDesc: boolean = true,
  forceRefresh: boolean = false,
): Promise<StockResponse> => {
  try {
    // Convert filters to query parameters
    const queryParams = new URLSearchParams();
    
    // Add pagination and sorting
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (sortBy) {
      queryParams.append('sort_by', sortBy);
      queryParams.append('sort_desc', sortDesc.toString());
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'sector') {
          // Handle sector as an array parameter
          queryParams.append('sectors', value.toString());
        } else if (key === 'ticker') {
          queryParams.append('ticker', value.toString());
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    if (forceRefresh) {
      queryParams.append('refresh', 'true');
    }

    const response = await axios.get<StockResponse>(`${API_BASE_URL}/stocks?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stocks:', error);
    throw error;
  }
};

export const fetchTopGainers = async (
  period: '1w' | '1m' | '6m' | 'ytd' | '1y' | '3y' = '1w',
  limit: number = 10
): Promise<StockResponse> => {
  try {
    const response = await axios.get<StockResponse>(
      `${API_BASE_URL}/stocks/top-gainers?period=${period}&limit=${limit}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    throw error;
  }
};

export const fetchDividendLeaders = async (
  limit: number = 10
): Promise<StockResponse> => {
  try {
    const response = await axios.get<StockResponse>(
      `${API_BASE_URL}/stocks/dividend-leaders?limit=${limit}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching dividend leaders:', error);
    throw error;
  }
};

export const fetchUndervaluedGrowth = async (
  limit: number = 10
): Promise<StockResponse> => {
  try {
    const response = await axios.get<StockResponse>(
      `${API_BASE_URL}/stocks/undervalued-growth?limit=${limit}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching undervalued growth stocks:', error);
    throw error;
  }
};

export const sortStocks = (
  stocks: StockData[],
  field: keyof StockData,
  direction: 'asc' | 'desc'
): StockData[] => {
  return [...stocks].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
};

export const filterStocks = (
  stocks: StockData[],
  filters: Partial<Record<keyof StockData, string | string[] | number>>
): StockData[] => {
  return stocks.filter(stock => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      
      const stockValue = stock[key as keyof StockData];
      
      // Handle sector with exact match
      if (key === 'sector') {
        // Handle both single sector and array of sectors
        const sectors = Array.isArray(value) ? value : [value];
        return sectors.includes(stockValue);
      }
      
      // Handle string fields (like ticker)
      if (typeof stockValue === 'string' && key !== 'sector') {
        const searchValue = typeof value === 'number' ? value.toString() : 
                          Array.isArray(value) ? value[0] : value;
        return stockValue.toLowerCase().includes(searchValue.toLowerCase());
      }
      
      // Handle numeric fields
      if (typeof stockValue === 'number' && (typeof value === 'string' || typeof value === 'number')) {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          // For percentage fields, convert to decimal for comparison
          if (key.includes('change_') || key === 'dividend_yield') {
            return stockValue >= numValue;
          }
          // For market cap, handle millions
          if (key === 'market_cap') {
            return stockValue >= numValue * 1000000; // Convert input millions to actual value
          }
          return stockValue >= numValue;
        }
      }
      return true;
    });
  });
}; 
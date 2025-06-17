import { NextResponse } from 'next/server';

interface RawStockData {
  ticker: string;
  price: number | string;
  change_1w: number | string;
  sector: string;
}

interface ProcessedStockData {
  symbol: string;
  price: string;
  change: string;
  sector: string;
}

interface BackendResponse {
  data: RawStockData[];
  count: number;
  total_count: number;
  total_pages: number;
  current_page: number;
  last_updated: string;
}

async function fetchStockData() {
  try {
    const response = await fetch('http://localhost:8000/api/stocks', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock data: ${response.statusText}`);
    }

    const data: BackendResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
}

function processStockData(backendResponse: BackendResponse) {
  const stocksArray = backendResponse.data;
  
  if (!stocksArray || stocksArray.length === 0) {
    return {
      gainers: [],
      losers: [],
      timestamp: backendResponse.last_updated
    };
  }

  // Map the data with safe fallbacks
  const stocks: ProcessedStockData[] = stocksArray.map(stock => ({
    symbol: stock.ticker || '',
    price: typeof stock.price === 'number' ? stock.price.toFixed(2) : 
           typeof stock.price === 'string' ? parseFloat(stock.price).toFixed(2) : '0.00',
    change: typeof stock.change_1w === 'number' ? stock.change_1w.toFixed(1) : 
            typeof stock.change_1w === 'string' ? parseFloat(stock.change_1w).toFixed(1) : '0.0',
    sector: stock.sector || 'Unknown'
  })).filter(stock => stock.symbol && !isNaN(parseFloat(stock.price)) && !isNaN(parseFloat(stock.change)));

  // Sort by weekly change
  stocks.sort((a, b) => Math.abs(parseFloat(b.change)) - Math.abs(parseFloat(a.change)));

  // Split into gainers and losers
  const gainers = stocks
    .filter(stock => parseFloat(stock.change) > 0)
    .slice(0, 20);

  const losers = stocks
    .filter(stock => parseFloat(stock.change) < 0)
    .slice(0, 20);

  return {
    gainers,
    losers,
    timestamp: backendResponse.last_updated
  };
}

export async function GET() {
  try {
    const rawData = await fetchStockData();
    const processedData = processStockData(rawData);
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data. Please try again later.' },
      { status: 500 }
    );
  }
} 
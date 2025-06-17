import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching news from backend...');
    const response = await fetch('http://localhost:8000/api/news/latest', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Disable caching
    });

    if (!response.ok) {
      console.error(`Failed to fetch news: ${response.statusText}`);
      throw new Error(`Failed to fetch news: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received news data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news. Please try again later.' },
      { status: 500 }
    );
  }
} 
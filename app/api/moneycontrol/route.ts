import { NextResponse } from 'next/server';

const MONEYCONTROL_API = 'https://mc-api-j0rn.onrender.com/api';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchWithCache(endpoint: string) {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${MONEYCONTROL_API}/${endpoint}`, {
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      throw new Error(`Moneycontrol API error: ${response.status}`);
    }
    
    const data = await response.json();
    cache.set(endpoint, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Moneycontrol API error:', error);
    if (cached) return cached.data;
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'news';

  try {
    let data;
    
    switch (type) {
      case 'latest':
        data = await fetchWithCache('latest_news');
        break;
      case 'business':
        data = await fetchWithCache('business_news');
        break;
      case 'list':
        data = await fetchWithCache('list');
        break;
      case 'news':
      default:
        data = await fetchWithCache('news');
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      data: data || []
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch news'
    }, { status: 500 });
  }
}
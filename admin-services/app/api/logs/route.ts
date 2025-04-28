import { NextRequest, NextResponse } from 'next/server';

// Define types for log entries
interface LogEntry {
  query_id: string;
  query: string;
  response: string;
  model: string;
  latency_ms: number;
  timestamp: number;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>; // eslint-disable-line
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/logs - Fetch logs with pagination and filters
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchQuery = searchParams.get('q') || '';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const model = searchParams.get('model') || '';
    
    // Get orchestration service URL from environment
    const orchestrationServiceUrl = process.env.ORCHESTRATION_SERVICE_URL || 'http://orchestration-service:9000';
    
    // Construct the URL for fetching logs
    let url = `${orchestrationServiceUrl}/logs?page=${page}&limit=${limit}`;
    
    if (searchQuery) {
      url += `&q=${encodeURIComponent(searchQuery)}`;
    }
    
    if (fromDate) {
      url += `&from_date=${encodeURIComponent(fromDate)}`;
    }
    
    if (toDate) {
      url += `&to_date=${encodeURIComponent(toDate)}`;
    }
    
    if (model) {
      url += `&model=${encodeURIComponent(model)}`;
    }
    
    // Use the correct sort field (changed from 'timestamp' to '@timestamp')
    url += `&sort_field=%40timestamp`; // %40 is URL encoded '@'
    
    // Fetch logs from orchestration service
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle error response
      const errorText = await response.text();
      console.error(`Error fetching logs: ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch logs from orchestration service: ${errorText}` },
        { status: response.status }
      );
    }
    
    // Parse response
    const data: LogsResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching logs' },
      { status: 500 }
    );
  }
}

// POST /api/logs/search - Advanced search for logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use the correct sort field (change 'timestamp' to '@timestamp' if present)
    if (body.sort_field === 'timestamp') {
      body.sort_field = '@timestamp';
    }
    
    // Get orchestration service URL from environment
    const orchestrationServiceUrl = process.env.ORCHESTRATION_SERVICE_URL || 'http://orchestration-service:9000';
    
    // Forward the search request to the orchestration service
    const response = await fetch(`${orchestrationServiceUrl}/logs/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      // Handle error response
      const errorText = await response.text();
      console.error(`Error searching logs: ${errorText}`);
      return NextResponse.json(
        { error: `Failed to search logs from orchestration service: ${errorText}` },
        { status: response.status }
      );
    }
    
    // Parse response
    const data: LogsResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching logs:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while searching logs' },
      { status: 500 }
    );
  }
}
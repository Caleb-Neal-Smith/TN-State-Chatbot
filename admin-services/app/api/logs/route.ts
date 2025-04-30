import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch'; 

// Types for log entries
export interface LogEntry {
  '@timestamp': number;
  query_id: string;
  query: string;
  response: string;
  model: string;
  latency_ms: number;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>; // eslint-disable-line
}

// Types for API request
export interface LogsRequest {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  model?: string;
  userId?: string;
  sessionId?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

// Configure OpenSearch client
const getOpenSearchClient = () => {
  const opensearchUrl = process.env.OPENSEARCH_URL || 'http://opensearch:9200';
  const username = process.env.OPENSEARCH_USERNAME;
  const password = process.env.OPENSEARCH_PASSWORD;
  
  const config: any = { // eslint-disable-line
    node: opensearchUrl,
    ssl: {
      rejectUnauthorized: false, // Disable SSL verification for local development
    }
  };
  
  // Add authentication if provided
  if (username && password) {
    config.auth = {
      username,
      password
    };
  }
  
  return new Client(config);
};

// GET /api/logs endpoint
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('searchQuery');
    const model = searchParams.get('model');
    const userId = searchParams.get('user_id');
    const sessionId = searchParams.get('session_id');
    const sortField = searchParams.get('sortField') || '@timestamp';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build OpenSearch query
    const opensearchIndex = process.env.OPENSEARCH_INDEX || 'rag-interactions';
    const client = getOpenSearchClient();
    
    // Prepare filter conditions
    const mustConditions = [];
    
    // Add date range if specified
    if (startDate || endDate) {
      const rangeFilter: any = { '@timestamp': {} }; // eslint-disable-line
      if (startDate) {
        rangeFilter['@timestamp'].gte = new Date(startDate).getTime();
      }
      if (endDate) {
        rangeFilter['@timestamp'].lte = new Date(endDate).getTime();
      }
      mustConditions.push({ range: rangeFilter });
    }
    
    // Add search query if specified
    if (searchQuery) {
      mustConditions.push({
        multi_match: {
          query: searchQuery,
          fields: ['query', 'response']
        }
      });
    }
    
    // Add model filter if specified
    if (model) {
      mustConditions.push({
        term: { model }
      });
    }
    
    // Add user_id filter if specified
    if (userId) {
      mustConditions.push({
        term: { user_id: userId }
      });
    }
    
    // Add session_id filter if specified
    if (sessionId) {
      mustConditions.push({
        term: { session_id: sessionId }
      });
    }
    
    // Build the final query
    const query = {
      size: limit,
      from: offset,
      sort: [
        { [sortField]: { order: sortDirection } }
      ],
      query: {
        bool: {
          must: mustConditions.length > 0 ? mustConditions : [{ match_all: {} }]
        }
      }
    };
    
    // Execute search query
    const response = await client.search({
      index: opensearchIndex,
      body: query
    });
    
    // Extract results and total count
    const hits = response.body.hits.hits || [];
    const total = response.body.hits.total?.valueOf() || 0;
    
    // Format logs for response
    const logs = hits.map((hit: any) => ({ // eslint-disable-line
      id: hit._id,
      ...hit._source
    }));
    
    // Return JSON response with pagination metadata
    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
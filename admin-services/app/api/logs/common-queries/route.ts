import { NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';

// Configure OpenSearch client
const getOpenSearchClient = () => {
  const opensearchUrl = process.env.OPENSEARCH_URL || 'http://opensearch:9200';
  const username = process.env.OPENSEARCH_USERNAME;
  const password = process.env.OPENSEARCH_PASSWORD;
  
  const config: any = { //eslint-disable-line
    node: opensearchUrl,
    ssl: {
      rejectUnauthorized: false, // For development; enable in production
    }
  };
  
  if (username && password) {
    config.auth = { username, password };
  }
  
  return new Client(config);
};

// Normalize a query for better matching
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate word overlap similarity using Jaccard similarity
function semanticSimilarity(query1: string, query2: string): number {
  const words1 = new Set(normalizeQuery(query1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeQuery(query2).split(' ').filter(w => w.length > 2));
  
  // If either query has too few meaningful words, require stricter matching
  if (words1.size <= 2 || words2.size <= 2) {
    return words1.size === words2.size && [...words1].every(w => words2.has(w)) ? 1 : 0;
  }
  
  // Calculate intersection and union for Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export async function GET() {
  try {
    const client = getOpenSearchClient();
    const opensearchIndex = process.env.OPENSEARCH_INDEX || 'rag-interactions';
    
    // Get all queries from OpenSearch with aggregations
    const response = await client.search({
      index: opensearchIndex,
      body: {
        size: 0,
        aggs: {
          unique_queries: {
            terms: {
              field: "query.keyword",
              size: 100, // Get top 100 queries to process
              order: { "_count": "desc" }
            }
          }
        }
      }
    });
    
    // Extract unique queries with their counts
    if (!response.body.aggregations || !('unique_queries' in response.body.aggregations)) {
      throw new Error('Aggregations or unique_queries is missing in the response');
    }

    const queryBuckets = (response.body.aggregations.unique_queries as { buckets: Array<{ key: string; doc_count: number }> }).buckets;
    const queries = queryBuckets.map(bucket => ({
      text: bucket.key,
      count: bucket.doc_count
    }));
    
    // Group semantically similar queries
    const similarityThreshold = 0.6; // Adjust as needed
    const queryGroups = [];
    const processedIndices = new Set();
    
    for (let i = 0; i < queries.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const currentQuery = queries[i];
      const similarQueries = [currentQuery];
      let totalCount = currentQuery.count;
      
      for (let j = i + 1; j < queries.length; j++) {
        if (processedIndices.has(j)) continue;
        
        const similarity = semanticSimilarity(
          currentQuery.text,
          queries[j].text
        );
        
        if (similarity >= similarityThreshold) {
          similarQueries.push(queries[j]);
          totalCount += queries[j].count;
          processedIndices.add(j);
        }
      }
      
      processedIndices.add(i);
      
      // Find the most frequent query to use as representative
      const representativeQuery = similarQueries.reduce(
        (prev, current) => (current.count > prev.count ? current : prev),
        similarQueries[0]
      );
      
      queryGroups.push({
        representativeQuery: representativeQuery.text,
        variants: similarQueries.map(q => q.text),
        totalCount,
        variantCounts: similarQueries.map(q => ({
          query: q.text,
          count: q.count
        }))
      });
    }
    
    // Sort by total count and get top 5
    const topQueryGroups = queryGroups
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 5);
    
    return NextResponse.json({ topQueryGroups });
    
  } catch (error) {
    console.error('Error getting common queries:', error);
    return NextResponse.json(
      { error: 'Failed to get common queries' },
      { status: 500 }
    );
  }
}
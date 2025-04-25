import opensearchClient from './OpensearchClient';

// Create the 'user_queries' index if it doesn't already exist
export async function createIndex(): Promise<void> {
  const indexName = 'user_queries';
  const exists = await opensearchClient.indices.exists({ index: indexName });

  if (!exists.body) {
    await opensearchClient.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            question: {
              type: 'text',                    // Full-text field
              fields: {
                keyword: {                     // Keyword subfield for aggregations
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            count: { type: 'integer' },       // Frequency count
            timestamp: { type: 'date' }       // Creation timestamp
          }
        }
      }
    });
    console.log(`Created index: ${indexName}`);
  }
}

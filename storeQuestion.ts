import OpensearchClient from './OpensearchClient';

// Store a new question or increment the count if it already exists
export async function storeOrUpdateQuestion(question: string): Promise<void> {
  const indexName = 'user_queries';

  // Search if the question already exists
  const result = await OpensearchClient.search({
    index: indexName,
    body: {
      query: { match: { question } }
    }
  });

  if (result.body.hits.total.value > 0) {

    // If found, update the count by incrementing it
    const docId = result.body.hits.hits[0]._id;
    await OpensearchClient.update({
      index: indexName,
      id: docId,
      refresh: 'wait_for',
      body: {
        script: {
          source: 'ctx._source.count += 1',
          lang: 'painless'
        }
      }
    });
  } else {

    // If not found, insert a new document with count = 1
    await OpensearchClient.index({
      index: indexName,
      body: {
        question,
        count: 1,
        timestamp: new Date().toISOString()
      }
    });
  }
}

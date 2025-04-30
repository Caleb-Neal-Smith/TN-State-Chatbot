import OpensearchClient from './OpensearchClient';

// Retrieve the top 5 most frequently asked questions

export async function getTopFAQs(): Promise<string[]> {
  const result = await OpensearchClient.search({
    index: 'user_queries',
    body: {
      size: 0, 
      aggs: {
        top_questions: {
          terms: {
            field: 'question.keyword', // Aggregate on keyword version of question
            size: 5,
            order: { _count: 'desc' } // Sort by frequency
          }
        }
      }
    }
  });

  // Return only the question strings
  return result.body.aggregations.top_questions.buckets.map((b: any) => b.key);
}


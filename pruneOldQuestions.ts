import opensearchClient from './OpensearchClient';
import { getTopFAQs } from './GetFAQS';

// Configuration
const INDEX = 'user_queries';
const RETENTION_DAYS = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Deletes entries older than cutoff and not in current top 5
async function pruneOld(): Promise<void> {
  try {
    const cutoff = `now-${RETENTION_DAYS}d`;
    const top5 = await getTopFAQs();

    const resp = await opensearchClient.deleteByQuery({
      index: INDEX,
      body: {
        query: {
          bool: {
            must: [{ range: { timestamp: { lt: cutoff } } }],
            must_not: [{ terms: { 'question.keyword': top5 } }]
          }
        }
      }
    });
    console.log(`Pruned ${resp.body.deleted} old FAQ entries not in top 5`);
  } catch (err) {
    console.error('Failed to prune old FAQs:', err);
  }
}

// On startup, only prune if index exists; then schedule daily pruning 
(async () => {
  const exists = await opensearchClient.indices.exists({ index: INDEX });
  if (exists.body) {
    await pruneOld();
    setInterval(pruneOld, MS_PER_DAY);
  } else {
    console.log('Index not found, skipping initial prune');
  }
})();

// testConnection.ts not needed for actual use
import { Client } from '@opensearch-project/opensearch';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({
    node: process.env.OPENSEARCH_URL ?? 'https://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USER ?? 'admin',
      password: process.env.OPENSEARCH_PASS ?? 'admin'
    },
    ssl: { rejectUnauthorized: false }
  });

  try {
    const info = await client.info();
    console.log('✅ OpenSearch info:', info.body);
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

run();

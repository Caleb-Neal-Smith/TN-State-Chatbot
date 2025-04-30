import { Client } from '@opensearch-project/opensearch';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the OpenSearch client with environment credentials
const OpensearchClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USER || 'admin',
    password: process.env.OPENSEARCH_PASS || 'admin'
  },
  ssl: { rejectUnauthorized: false }
});

export default OpensearchClient;

//start opensearch.bat
// npm start
// curl -k http://localhost:9200 -u admin:admin shows connection,
// test question- curl -X POST "http://localhost:3000/chat" -H "Content-Type: application/json" -d "{\"question\":\"Can you reset my password for me?\"}"
// curl -u admin:admin -X POST "http://localhost:9200/user_queries/_refresh" 
// curl http://localhost:3000/faq  
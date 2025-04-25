import http from 'http';
import fs from 'fs';
import path from 'path';
import { initFAQSystem, handleUserInput } from './handler';
import './pruneOldQuestions';               
import { getFaqsResponse } from './faqController';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function start() {
  try {
    // Ensure the OpenSearch index exists
    await initFAQSystem();
    console.log('FAQ system initialized.');

    const server = http.createServer(async (req, res) => {
      const urlPath = (req.url || '').split('?')[0];

      // Serve the HTML page at root or /faq.html
      if (req.method === 'GET' && (urlPath === '/' || urlPath === '/faq.html')) {
        console.log('Serving faq.html'); 
        const filePath = path.join(__dirname, 'public', 'faq.html');
        const html = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(html);
      }

      // Serve the front-end JavaScript
      if (req.method === 'GET' && urlPath === '/faq.js') {
        const filePath = path.join(__dirname, 'public', 'faq.js');
        const js = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(js);
      }

      // return top 5 FAQs
      if (req.method === 'GET' && urlPath === '/faq') {
        try {
          const faqs = await getFaqsResponse();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ faqs }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'FAQ service unavailable' }));
        }
      }

      // handle chat messages
      if (req.method === 'POST' && urlPath === '/chat') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', async () => {
          try {
            const { question } = JSON.parse(body);
            // Log question into FAQ index
            await handleUserInput(question);
            
            // TODO: Call your LLM here (Ollama) and get the reply // change this not needed for actual use
            const reply = 'Thank you for your question!'; // Placeholder response

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply }));
          } catch (err) {
            console.error('Chat error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Chat failed' }));
          }
        });
        return;
      }

      // Fallback: not found
      res.writeHead(404);
      res.end('Not Found');
    });

    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();

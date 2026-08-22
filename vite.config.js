import { defineConfig, loadEnv } from 'vite';
import handler from './api/evaluate.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 5173
    },
    plugins: [
      {
        name: 'vercel-api-dev-server',
        configureServer(server) {
          server.middlewares.use('/api/evaluate', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                req.body = JSON.parse(body || '{}');
              } catch (e) {
                req.body = {};
              }

              // Mock Vercel response helper methods
              res.status = (statusCode) => {
                res.statusCode = statusCode;
                return res;
              };
              res.json = (jsonData) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(jsonData));
                return res;
              };

              // Ensure GROQ_API_KEY is available from .env or process.env
              if (!process.env.GROQ_API_KEY && env.GROQ_API_KEY) {
                process.env.GROQ_API_KEY = env.GROQ_API_KEY;
              }

              try {
                await handler(req, res);
              } catch (err) {
                console.error('[API dev error]', err);
                if (!res.writableEnded) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              }
            });
          });
        }
      }
    ]
  };
});

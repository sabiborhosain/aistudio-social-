import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './backend/db/index.ts';
import apiRouter from './backend/routes/index.ts';
import { initWebSocketServer } from './backend/services/websocketService.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Basic middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Initialize database connectivity & seed
  await initDatabase();

  // Initialize WebSocket server for realtime chat & WebRTC signaling
  initWebSocketServer(httpServer);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', name: 'DevSphere Social Platform' });
  });

  // REST API Routes under /api/v1
  app.use('/api/v1', apiRouter);

  // Vite development middleware or static production fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevSphere] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[DevSphere] Fatal server boot error:', err);
});

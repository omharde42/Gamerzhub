import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrf';
import prisma from './config/database';
import { chatService } from './services/chat.service';

// Route imports
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import postRoutes from './routes/post.routes';
import teamRoutes from './routes/team.routes';
import tournamentRoutes from './routes/tournament.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import aiRoutes from './routes/ai.routes';
import analyticsRoutes from './routes/analytics.routes';
import feedRoutes from './routes/feed.routes';
import jobRoutes from './routes/job.routes';
import organizationRoutes from './routes/organization.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';
import matchmakingRoutes from './routes/matchmaking.routes';
import passportRoutes from './routes/passport.routes';
import serverRoutes from './routes/server.routes';
import friendRoutes from './routes/friend.routes';
import presenceRoutes from './routes/presence.routes';
import newsRoutes from './routes/news.routes';
import gameRequestRoutes from './routes/game-request.routes';
import appRoutes from './routes/app.routes';
import cryptoRoutes from './routes/crypto.routes';
import steamRoutes from './routes/steam.routes';
import gameStatsRoutes from './routes/game-stats.routes';
import clashOfClansRoutes from './routes/clashofclans.routes';
import freeFireRoutes from './routes/freefire.routes';
import challengeRoutes from './routes/challenge.routes';
import videoRoutes from './routes/video.routes';
import { setSocketIo } from './socket-emitter';
import { challengeService } from './services/challenge.service';
import { registerSocketEvents } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

// Dynamic Allowed Frontend URLs
const allowedOrigins = [
  "http://localhost:3000",
  "https://web-drab-nu-21.vercel.app",
  "https://gamerhub-web.onrender.com",
  process.env.FRONTEND_URL
].filter((origin): origin is string => Boolean(origin));

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Chat/call socket handlers with participant authorization live in
// src/socket/handlers.ts (see registerSocketEvents). Sender identity is always
// derived from the verified JWT; client-supplied ids/callerInfo are never
// trusted for authorization.
registerSocketEvents(io, { prisma, chatService });

setSocketIo(io);

// Middleware
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Express automatically manages array origins & handles Preflight properly
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Ensure public/uploads directories exist
const uploadsRoot = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
const postsDir = path.join(uploadsRoot, 'posts');
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}
const avatarsDir = path.join(uploadsRoot, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
const bannersDir = path.join(uploadsRoot, 'banners');
if (!fs.existsSync(bannersDir)) {
  fs.mkdirSync(bannersDir, { recursive: true });
}
app.use(cookieParser());
// Keep the raw request body available: Stripe webhook signature verification
// (stripe.webhooks.constructEvent) must run against the exact bytes received,
// not the JSON-parsed object (re-serialization would break the HMAC).
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf: Buffer) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/downloads', express.static(path.join(__dirname, '../public/downloads')));
app.use(generalLimiter);

import { requestTimingMiddleware } from './middleware/timing';

// CSRF Protection (double-submit cookie pattern for browser-based requests)
app.use(csrfProtection);
app.use(requestTimingMiddleware);

// Health check & root endpoints
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'GamerHub API', timestamp: new Date().toISOString() });
});
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'GamerHub API is running', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'gamerzhub-api', message: 'GamerZHub API is running', timestamp: new Date().toISOString() });
});
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'unready', database: 'disconnected', error: err?.message || 'Database error' });
  }
});

// Routes
app.use('/api/app', appRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/game-requests', gameRequestRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/steam', steamRoutes);
// Public keep-alive health check (no auth, no DB, used by the Render keep-alive workflow)
app.get('/health', (_req: any, res: any) => res.status(200).json({ status: 'ok', service: 'gamerzhub-api', message: 'GamerZHub API is running', timestamp: new Date().toISOString() }));
app.get('/riot.txt', (_req: any, res: any) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('71dcd910-804e-42e8-8e2a-91d7bb1b93af\n');
});
import gameSyncRoutes from './routes/game-sync.routes';
import gameModularRoutes from './routes/game-modular.routes';
import pubgRoutes from './routes/pubg.routes';
import compareRoutes from './routes/compare.routes';
import { clashOfClansController } from './controllers/clashofclans.controller';
import { pubgController } from './controllers/pubg.controller';
app.use('/api/clashofclans', clashOfClansRoutes);
app.get('/player/:tag', clashOfClansController.getPlayer);
app.get('/api/player/:tag', clashOfClansController.getPlayer);
app.get('/pubg/player/:platform/:playerName', pubgController.getPlayer);
app.get('/api/pubg/player/:platform/:playerName', pubgController.getPlayer);
app.use('/api/pubg', pubgRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/game-sync', gameSyncRoutes);
app.use('/api/game-stats', gameStatsRoutes);
app.use('/api/game', gameModularRoutes);
app.use('/api/freefire', freeFireRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/video', videoRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Automatic challenge expiry sweep (every 15 minutes)
setInterval(() => {
  challengeService.expireOverdue().catch((err: any) => console.error('[challenge-sweep]', err?.message));
}, 15 * 60 * 1000);

httpServer.listen(config.port, () => {
  console.log(`GamerHub API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Automatically clean synthetic seeded users on startup (preserving genuine real users)
  try {
    const { cleanSeededUsers } = require('../prisma/clean-seeded-users');
    cleanSeededUsers().catch((err: any) => console.error('[clean-seeded-users]', err?.message));
  } catch (e: any) {
    console.warn('[clean-seeded-users] Skipped startup cleanup:', e?.message);
  }

  // Self Keep-Alive ping to keep Render web service warm and eliminate cold starts
  const BACKEND_URL = process.env.BACKEND_URL || 'https://gamerhub-api-6lga.onrender.com';
  setInterval(() => {
    try {
      const http = BACKEND_URL.startsWith('https') ? require('https') : require('http');
      http.get(`${BACKEND_URL}/health`, (res: any) => {
        console.log(`[Keep-Alive] Pinged ${BACKEND_URL}/health - Status: ${res.statusCode}`);
      }).on('error', (err: any) => {
        console.warn(`[Keep-Alive] Ping warn:`, err?.message);
      });
    } catch (e: any) {
      console.warn(`[Keep-Alive] Exception:`, e?.message);
    }
  }, 5 * 60 * 1000);
});

export { app, httpServer, io };
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { Server } = require('socket.io');

require('dotenv').config();

const prisma = new PrismaClient();
let redis;

// Initialize Redis with a mock fallback if it fails to connect
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // Don't retry indefinitely
  });
  redis.on('error', (err) => {
    fastify.log.warn(`Redis error: ${err.message}. Falling back to in-memory presence cache.`);
    redis = null;
  });
} catch (err) {
  fastify.log.warn(`Failed to initialize Redis: ${err.message}. Using in-memory fallback.`);
  redis = null;
}

// Memory fallback for Redis-like operations if Redis is unavailable
const memoryCache = {
  store: new Map(),
  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      setTimeout(() => this.store.delete(key), duration * 1000);
    }
  },
  async get(key) {
    return this.store.get(key) || null;
  },
  async del(key) {
    this.store.delete(key);
  },
  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }
};

const dynamicCache = {
  async set(key, value, mode, duration) {
    const active = redis || memoryCache;
    return active.set(key, value, mode, duration);
  },
  async get(key) {
    const active = redis || memoryCache;
    return active.get(key);
  },
  async del(key) {
    const active = redis || memoryCache;
    return active.del(key);
  },
  async keys(pattern) {
    const active = redis || memoryCache;
    return active.keys(pattern);
  }
};

// Decorate fastify with prisma and redis/cache helpers
fastify.decorate('prisma', prisma);
fastify.decorate('cache', dynamicCache);

const path = require('path');
const fastifyStatic = require('@fastify/static');

// Register Fastify plugins
fastify.register(cors, {
  origin: '*', // Adjust for production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'funchat_super_secret_jwt_key_123!'
});

// Serve frontend assets
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/build'),
  prefix: '/'
});

// SPA fallback: redirect non-API routes to index.html
fastify.setNotFoundHandler((request, reply) => {
  const url = request.raw.url;
  if (url.startsWith('/auth') || url.startsWith('/users') || url.startsWith('/chats')) {
    return reply.status(404).send({ error: 'Not Found', message: 'API route not found' });
  }
  return reply.sendFile('index.html');
});

// Authentication hook for protected routes
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: err.message });
  }
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/auth' });
fastify.register(require('./routes/users'), { prefix: '/users' });
fastify.register(require('./routes/chats'), { prefix: '/chats' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date() };
});

// Start fastify and bind Socket.IO
const start = async () => {
  try {
    const port = process.env.PORT || 5000;
    
    // Attach Socket.IO to Fastify server BEFORE start
    const io = new Server(fastify.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    fastify.decorate('io', io);

    // Initialize Socket.IO namespace handlers
    require('./sockets/presence')(fastify, io);
    require('./sockets/chat')(fastify, io);

    // Seed default admin and user accounts if they do not exist
    try {
      const bcrypt = require('bcryptjs');
      
      // Admin Seeding
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' }
      });
      if (!adminUser) {
        const passwordHash = await bcrypt.hash('adminpassword123', 10);
        const dob = new Date('1990-01-01');
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: 'admin@funchat.com',
              phone: '+0000000000',
              passwordHash,
              dateOfBirth: dob,
              country: 'System',
              role: 'admin'
            }
          });
          await tx.profile.create({
            data: {
              userId: user.id,
              username: 'admin',
              displayName: 'System Administrator',
              gender: 'other',
              bio: 'fuN ChaT System Administrator'
            }
          });
        });
        fastify.log.info('Default admin account seeded successfully (admin@funchat.com / adminpassword123).');
      }

      // Regular Test User Seeding
      const testUser = await prisma.user.findFirst({
        where: { email: 'user@funchat.com' }
      });
      if (!testUser) {
        const passwordHash = await bcrypt.hash('userpassword123', 10);
        const dob = new Date('1995-05-05');
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: 'user@funchat.com',
              phone: '+1111111111',
              passwordHash,
              dateOfBirth: dob,
              country: 'United States',
              role: 'user'
            }
          });
          await tx.profile.create({
            data: {
              userId: user.id,
              username: 'user_test',
              displayName: 'Test User',
              gender: 'male',
              bio: 'Hello fuN ChaT!'
            }
          });
        });
        fastify.log.info('Default test user account seeded successfully (user@funchat.com / userpassword123).');
      }
    } catch (seedErr) {
      fastify.log.error(`Failed to seed default accounts: ${seedErr.message}`);
    }

    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server is running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

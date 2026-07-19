# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Set up the Fastify server and bundle static files
FROM node:20-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend files and pre-compiled frontend static folder
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Navigate to backend, load env, and compile Prisma ORM client
WORKDIR /app/backend
RUN npx prisma generate

# Expose server port
EXPOSE 5000

# Push SQLite schema migrations at startup and boot monolith Fastify app
CMD ["sh", "-c", "npx prisma db push && npm run start"]

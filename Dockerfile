# Use Node.js 20 on Alpine Linux (required for cheerio@1.1.2+)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
# Default port for Cloud Run
ENV PORT=8080
# Allow all hosts by default in container environment
ENV ALLOWED_HOSTS=*

# Expose the port
EXPOSE 8080

# Start the server in HTTP mode
CMD ["npm", "run", "start:http"]


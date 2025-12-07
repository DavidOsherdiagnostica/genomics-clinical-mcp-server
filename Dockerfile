# Use Node.js 18 on Alpine Linux
FROM node:18-alpine AS builder

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
FROM node:18-alpine

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

# Expose the port
EXPOSE 8080

# Start the server in HTTP mode
CMD ["npm", "run", "start:http"]


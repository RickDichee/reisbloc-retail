# 🐳 REISBLOC POS - Enterprise Dockerfile
# Base image: Node.js 20 Alpine for stability and small size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port (Vite default is 5173)
EXPOSE 5173

# Standard environment variables
ENV NODE_ENV=development
ENV HOST=0.0.0.0

# Start development server
CMD ["npm", "run", "dev", "--", "--host"]

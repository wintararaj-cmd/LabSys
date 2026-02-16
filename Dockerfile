FROM node:18-slim AS builder

WORKDIR /app
COPY client/package*.json ./
RUN npm install --include=dev
COPY client/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:18-slim

# Install system dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./

# Create directory where client build will go
RUN mkdir -p public
COPY --from=builder /app/dist ./public

EXPOSE 5000

# Start script
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node server.js"]

FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy frontend package
COPY packages/frontend/package*.json ./packages/frontend/

# Install dependencies
RUN npm install

# Copy frontend source
COPY packages/frontend ./packages/frontend

WORKDIR /app/packages/frontend

EXPOSE 3000

CMD ["npm", "run", "dev"]

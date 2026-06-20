# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# bcrypt is a native module that requires python3/make/g++ to build
# via node-gyp on Alpine. Install build tools before `npm ci` and remove
# them at the end of this stage to keep the image small.
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install only production dependencies. The bcrypt native module still
# needs build tools on Alpine because npm rebuilds it from source unless
# a prebuilt binary matches the platform.
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 4002

# Start the application
CMD ["node", "dist/main"]
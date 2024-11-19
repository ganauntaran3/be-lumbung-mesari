# Stage 1: Build
FROM node:22 AS build
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
COPY . .
RUN npm run build users

# Stage 2: Runtime
FROM node:22
WORKDIR /app
COPY --from=build /app/dist/apps/users ./dist
COPY --from=build /app/node_modules ./node_modules
COPY ./package.json ./package.json
RUN npm install --production
CMD ["node", "dist/main.js"]

FROM node:22-alpine

WORKDIR /app

# Najpierw tylko pliki zależności - warstwa z npm ci zostaje w cache, dopóki nie zmieni się lock
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# exec: node zastępuje sh jako PID 1, więc to on dostaje SIGTERM od docker compose down
CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]

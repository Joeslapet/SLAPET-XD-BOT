FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production || true
COPY . .
ENV PORT=3001
EXPOSE 3001
CMD ["node","server.js"]

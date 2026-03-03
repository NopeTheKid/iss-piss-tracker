FROM node:lts-alpine

WORKDIR /app
# Install git for dependencies that might require it
RUN apk add --no-cache git

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

FROM node:lts-slim

WORKDIR /src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8080
CMD ["node", "index.js"]

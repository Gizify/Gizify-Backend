FROM node:lts-slim

WORKDIR /src

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8080
CMD ["node", "index.js"]

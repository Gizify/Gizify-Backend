FROM node:lts-slim

# Set working directory ke /app
WORKDIR /app

# Salin package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Salin seluruh isi repo (termasuk server.js & src/)
COPY . .

# Port yang digunakan server kamu
EXPOSE 8080

# Jalankan server
CMD ["node", "server.js"]

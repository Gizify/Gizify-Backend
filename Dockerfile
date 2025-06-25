# ────────────────────────────────
# 🐳 Base image
# ────────────────────────────────
FROM node:lts-slim

# ────────────────────────────────
# 📁 Set working directory
# ────────────────────────────────
WORKDIR /app

# ────────────────────────────────
# 📦 Copy dependency files
# ────────────────────────────────
COPY package*.json ./

# 🛠️ Install only production dependencies
RUN npm install --production

# ────────────────────────────────
# 📂 Copy application source
# ────────────────────────────────
COPY . .

# ────────────────────────────────
# 🌐 Expose port
# ────────────────────────────────
EXPOSE 8080

# ────────────────────────────────
# 🚀 Run the application
# ────────────────────────────────
CMD ["node", "server.js"]
# Use official Node.js image
FROM node:20-slim

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose Vite port
EXPOSE 5173

# Start Vite with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

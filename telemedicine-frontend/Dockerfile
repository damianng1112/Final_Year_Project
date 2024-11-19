# Use the official Node.js image as a base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application
RUN npm run build

# Install serve to serve the static files
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]

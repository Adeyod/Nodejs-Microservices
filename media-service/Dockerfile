# use the official node.js 18 image with alpine linux as the base image(that is what the immediate below command is doing.)
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependencies files
COPY package*.json ./

# Install only production dependencies - helps to keep docker image size smaller
RUN npm ci --only=production

# Copy source code
COPY . .

# This tells Docker and other developers that your app runs on port 4000. NOTE: EXPOSE does not actually opens the port or publish it to your machine
EXPOSE 4003

# This tells Docker what command to run by default when the container starts
CMD [ "node", "src/server.js" ]

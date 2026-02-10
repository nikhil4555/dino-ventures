FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

# We will use a script or command in docker-compose to handle DB setup
CMD ["npm", "start"]

FROM node:lts-alpine
WORKDIR /use/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3002
CMD ["npm", "start"]

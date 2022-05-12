FROM node:14
WORKDIR /app
COPY package*.json /app
RUN yarn
COPY . /app
EXPOSE 8050
CMD ["yarn", "start"]
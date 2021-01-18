FROM node

WORKDIR /app

ADD sparkplug_connector .

EXPOSE 1883
EXPOSE 80
EXPOSE 3010

RUN npm install 

CMD ["node" , "server.js"]
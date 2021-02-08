FROM debian

WORKDIR /app

ADD sparkplug_connector .

EXPOSE 1883
EXPOSE 80
EXPOSE 3010

RUN apt update
RUN apt upgrade -y
RUN apt install nodejs -y

CMD ["node" , "server.js"]
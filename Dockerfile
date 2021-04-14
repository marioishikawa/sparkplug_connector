FROM ubuntu

WORKDIR /app

ADD sparkplug_connector .

EXPOSE 1883
EXPOSE 80
EXPOSE 3010

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt upgrade -y
RUN apt update -y
RUN apt-get install python -y
RUN curl -sL https://deb.nodesource.com/setup_10.16.0 | bash -
RUN apt install nodejs -y
RUN apt-get install npm -y
RUN npm config set registry http://registry.npmjs.org/
RUN npm install -y


CMD ["node" , "plcnext-sparkplug.js"]
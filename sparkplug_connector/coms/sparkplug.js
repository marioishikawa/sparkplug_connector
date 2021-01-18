//TODO: TLS to Ignition.
//TODO: Catch server error for invalid username/password so client doesn't crash.

const SparkplugClient = require('sparkplug-client');
const fs = require('fs');
const fsp = require('fs').promises;
const deviceInputData = require('./plcnextAPI');
const axios = require('axios');
const { isObjEmpty, isObjArrayDiff } = require('../helpers.js');
const EventEmitter = require('events');
const gateway = new EventEmitter();


let publishInterval = 1000;
let updating = false;
let clientId = "";
let config = {};
let outputObj = {};
let deviceOutputData = {
  pathPrefix: 'Arp.Plc.Eclr/',
  variables: [],
};
let serverConnection = {
  connecting: 'false',
  connected: 'false',
  msgCount: 0
};


console.clear();

async function getConfig(){
  console.log('Reading configurations.');
  let nodeBirthCert = await fsp.readFile('./config/nodeBirthCert.json', 'utf8');
  let deviceBirthCert = await fsp.readFile('./config/deviceBirthCert.json', 'utf8');
  let deviceConfig = await fsp.readFile('./config/deviceConfig.json', 'utf8');

  nodeBirthCert = JSON.parse(nodeBirthCert);
  deviceBirthCert = JSON.parse(deviceBirthCert);
  deviceConfig = JSON.parse(deviceConfig);

  return {
    nodeBirthCert,
    deviceBirthCert,
    deviceConfig
  };
}

async function main(){
  //INIT
  config = await getConfig();
  clientId = config.deviceConfig.clientId;

  console.log('Creating Ignition device.');
  sparkplugClient = SparkplugClient.newClient(config.deviceConfig);
  serverConnection.connecting = sparkplugClient.connecting;
  serverConnection.connected = sparkplugClient.connected;

  //SPARKPLUG EVENTS
  sparkplugClient.on('birth', () => {
    console.log('Publishing Node BIRTH certificate.');
    config.nodeBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishNodeBirth(config.nodeBirthCert);

    console.log('Publishing Device BIRTH certificate.');
    config.deviceBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishDeviceBirth(clientId, config.deviceBirthCert);
  });

  sparkplugClient.on('dcmd', (clientId, payload) => {
    for (i = 0; i < payload.metrics.length; i++){
      outputObj.path = payload.metrics[i].name.replace("/", ".");
      outputObj.value = payload.metrics[i].value;
      outputObj.valueType = payload.metrics[i].valueType = "Constant";
      deviceOutputData.variables[i] = outputObj;
    }

    //Write to PLCnext API
    axios.put('https://192.168.1.10/_pxc_api/api/variables/', deviceOutputData)
      .then(res => {
          console.log("State: Publishing to PLCnext");
      })
      .catch(err => {
          console.log(err);
      });
  });

  sparkplugClient.on('connect', () => {
    console.log('connect');
  });

  sparkplugClient.on('birth', () => {
    console.log('birth');
  });

  sparkplugClient.on('error', () => {
    console.log('error');
  });

  sparkplugClient.on('close', () => {
    console.log('close');
  });

  sparkplugClient.on('reconnect', () => {
    console.log('reconnect');
  });

  sparkplugClient.on('offline', () => {
    console.log('offline');
  });

  //GATEWAY EVENTS
  gateway.on('updateTags', async () => {
    console.log('State: Updating Configuration');

    if (isObjEmpty(deviceInputData)){
      console.log('No PLCnext API payload.');
      updating = false;
    } else {
      fs.writeFile('./config/deviceBirthCert.json', JSON.stringify(deviceInputData), (err) => {
          if(err){
            console.log('Error opening deviceBirthCert.json.');
            updating = false;
          } else {
            console.log('deviceBirthCert.json updated.');
            serverConnection.connecting = sparkplugClient.connecting;
            serverConnection.connected = sparkplugClient.connected;
            gateway.emit('updateDevice');
          }
        }
      );
    }
  });

  gateway.on('updateDevice', async () => {
    config = await getConfig();
    clientId = config.deviceConfig.clientId;
    console.log('Publishing Node BIRTH certificate.');
    config.nodeBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishNodeBirth(config.nodeBirthCert);
    console.log('Publishing Device BIRTH certificate.');
    config.deviceBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishDeviceBirth(clientId, config.deviceBirthCert);
    serverConnection.connecting = sparkplugClient.connecting;
    serverConnection.connected = sparkplugClient.connected;
    updating = false;
  });

  //MAIN
  setInterval(() => {
    if(isObjArrayDiff(deviceInputData.metrics, config.deviceBirthCert.metrics) && !updating ){
      gateway.emit('updateTags');
      updating = true;
    } else if (!updating){
      console.log('State: Publishing to Ignition');
      sparkplugClient.publishDeviceData(clientId, deviceInputData);
      serverConnection.connecting = sparkplugClient.connecting;
      serverConnection.connected = sparkplugClient.connected;
      serverConnection.msgCount++;
    }
  }, publishInterval);
}

main();

module.exports = serverConnection;
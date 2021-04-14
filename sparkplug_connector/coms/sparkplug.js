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
const logger = require('winston');


let publishInterval = 1000;
let updating = false;
let driverReady = false;
let clientId = "";
let config = {};
let outputObj = {};
let deviceOutputData = {
  pathPrefix: 'Arp.Plc.Eclr/',
  variables: [],
};
let sparkplugStatus = {
  driver: {
    connecting: 'false',
    connected: 'false',
    msgCount: 0,
    state: ''
  },
  gateway: {
    state: ''
  }
};


async function getConfig(){
  logger.info('Gateway State: Reading configurations.');
  sparkplugStatus.gateway.state = "Gateway State: Reading configurations.";
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

  logger.info('Gateway State: Creating Ignition device');
  sparkplugStatus.gateway.state = 'Gateway State: Creating Ignition device';
  sparkplugClient = SparkplugClient.newClient(config.deviceConfig);
  sparkplugStatus.driver.connecting = sparkplugClient.connecting;
  sparkplugStatus.driver.connected = sparkplugClient.connected;

  //DRIVER EVENTS
  sparkplugClient.on('birth', () => {
    logger.info('Gateway State: Publishing node');
    sparkplugStatus.gateway.state = 'Gateway State: Publishing node';
    config.nodeBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishNodeBirth(config.nodeBirthCert);

    logger.info('Gateway State: Publishing device');
    sparkplugStatus.gateway.state = 'Gateway State: Publishing device';
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
    axios.put('https://localhost:1443/_pxc_api/api/variables/', deviceOutputData)
      .then(res => {
          logger.info('API State: Publishing to PLCnext');
          sparkplugStatus.gateway.state = 'Gateway State: Publishing to PLCnext';
      })
      .catch(err => {
          logger.error(err);
          sparkplugStatus.gateway.state = `Gateway State: ${err}`;
      });
  });

  sparkplugClient.on('connect', () => {
    logger.info('Driver State: Connected');
    sparkplugStatus.driver.state = 'Driver State: Connected';
    driverReady = true; //See if once connected, you can emit a birth event.
  });

  sparkplugClient.on('birth', () => {
    logger.info('Driver State: Birth');
    sparkplugStatus.driver.state = 'Driver State: Connected';
    driverReady = true;
  });

  sparkplugClient.on('error', (e) => {
    logger.error(`Driver State: ${e}`);
    sparkplugStatus.driver.state = `Driver State: ${e}`;
    driverReady = false;
  });

  sparkplugClient.on('close', () => {
    logger.info('Driver State: Closing connection');
    sparkplugStatus.driver.state = 'Driver State: Closing connection';
    driverReady = false;
  });

  sparkplugClient.on('reconnect', () => {
    logger.info('Driver State: Reconnecting');
    sparkplugStatus.driver.state = 'Driver State: Reconnecting';
    driverReady = false;
  });

  sparkplugClient.on('offline', () => {
    logger.info('Driver State: Server offline');
    sparkplugStatus.driver.state = 'Driver State: Server offline';
    driverReady = false;
  });

  //GATEWAY EVENTS
  gateway.on('updateTags', async () => {
    logger.info('Gateway State:  Updating configuration');
    sparkplugStatus.gateway.state = 'Gateway State:  Updating configuration';

    if (isObjEmpty(deviceInputData)){
      logger.info('Gateway State: No PLCnext API payload');
      sparkplugStatus.gateway.state = 'Gateway State: No PLCnext API payload';
      updating = false;
    } else {
      fs.writeFile('./config/deviceBirthCert.json', JSON.stringify(deviceInputData), (err) => {
          if(err){
            logger.info('Gateway State: Error opening deviceBirthCert.json');
            sparkplugStatus.gateway.state = 'Gateway State: Error opening deviceBirthCert.json';
            updating = false;
          } else {
            logger.info('Gateway State: deviceBirthCert.json updated.');
            sparkplugStatus.gateway.state = 'Gateway State: deviceBirthCert.json updated';
            sparkplugStatus.driver.connecting = sparkplugClient.connecting;
            sparkplugStatus.driver.connected = sparkplugClient.connected;
            gateway.emit('updateDevice');
          }
        }
      );
    }
  });

  gateway.on('updateDevice', async () => {
    config = await getConfig();
    clientId = config.deviceConfig.clientId;
    logger.info('Gateway State: Publishing node.');
    sparkplugStatus.gateway.state = 'Gateway State: Publishing node.';
    config.nodeBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishNodeBirth(config.nodeBirthCert);
    logger.info('Gateway State: Publishing device');
    sparkplugStatus.gateway.state = 'Gateway State: Publishing device';
    config.deviceBirthCert.timestamp = new Date().getTime();
    sparkplugClient.publishDeviceBirth(clientId, config.deviceBirthCert);
    sparkplugStatus.driver.connecting = sparkplugClient.connecting;
    sparkplugStatus.driver.connected = sparkplugClient.connected;
    updating = false;
  });

  //MAIN
  setInterval(() => {
    if(driverReady){
      if(isObjArrayDiff(deviceInputData.metrics, config.deviceBirthCert.metrics) && !updating ){
        gateway.emit('updateTags');
        updating = true;
      } else if (!updating){
        logger.info('Gateway State: Publishing to Ignition');
        sparkplugStatus.gateway.state = 'Gateway State: Publishing to Ignition';
        sparkplugClient.publishDeviceData(clientId, deviceInputData);
        sparkplugStatus.driver.connecting = sparkplugClient.connecting;
        sparkplugStatus.driver.connected = sparkplugClient.connected;
        sparkplugStatus.driver.msgCount++; //Need to put a rollover here!
      }
    }
  }, publishInterval);
}

main();

module.exports = sparkplugStatus;
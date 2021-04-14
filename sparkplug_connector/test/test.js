// /^HostName=[a-zA-Z]([a-zA-Z0-9_\-]+).azure-devices.net;DeviceId=[a-zA-Z]([a-zA-Z0-9_\-]+);SharedAccessKey=([a-zA-Z0-9_\-]+)=$/
// (25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)

// const reServerString = /^tcp:\/\/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):1883$/igm;
// let testString = 'tcp://192.168.1.10:1883';

// if(reServerString.test(testString)){
//     console.log('valid');
// } else {
//     console.log('invalid');
// }

const ip = require('ip');

let localAddress = ip.address();

console.log(`https://${localAddress}:1443`);
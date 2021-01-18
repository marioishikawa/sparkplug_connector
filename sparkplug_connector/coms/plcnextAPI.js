const axios = require('axios');


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Do not require TLS certs for internal API communications.
let publishInterval = 1000;
let varNameList = [];
let varTypeList = [];
let readString = "";
let varObj = {};
let varList = [];
let deviceInputData = {
    "timestamp" : new Date().getTime(),
    "metrics" : []
};


setInterval(() => {
    //Get data dictionary and extract info
    axios.get('https://192.168.1.10/ehmi/data.dictionary.json')
        .then(resp => {

            varNameList = [];
            varTypeList = [];
            
            Object.keys(resp.data.HmiVariables2).forEach(variable => {
                varNameList.push(variable.slice(13));
                varTypeList.push(resp.data.HmiVariables2[variable].Type);
            });
            varNameList.shift();
            varTypeList.shift();
        })
        .catch(err => console.log("Updating..."));

    //Build new read request with updated var list
    readString = "";

    varNameList.forEach(variable => {
        readString = readString + variable + ',';
    });

    readString = readString.substring(0, readString.length - 1);

    //Read from PLCnext API
    axios.get('https://192.168.1.10/_pxc_api/api/variables/?pathPrefix=Arp.Plc.Eclr/&paths=' + readString)
        .then(resp => {
            varList = [];

            //Format payload to be sent to Ignition
            Object.keys(resp.data.variables).forEach((variable) => {
                varObj.name = resp.data.variables[variable].path.slice(13).replace(".", "/");
                varObj.value = resp.data.variables[variable].value;

                switch(varTypeList[variable]){
                    case 'BOOL':
                        varObj.type = 'boolean';
                        break;
                    case 'SINT':
                        varObj.type = 'int8';
                        break;
                    case 'INT':
                        varObj.type = 'int16';
                        break;
                    case 'DINT':
                        varObj.type = 'int32';
                        break;
                    case 'LINT':
                        varObj.type = 'int64';
                        break;
                    case 'USINT':
                        varObj.type = 'uint8';
                        break;
                    case 'UINT':
                        varObj.type = 'uint16';
                        break;
                    case 'UDINT':
                        varObj.type = 'uint32';
                        break;
                    case 'ULINT':
                        varObj.type = 'uint64';
                        break;
                    case 'REAL':
                        varObj.type = 'float';
                        break;
                    case 'LREAL':
                        varObj.type = 'double';
                        break;
                    case 'STRING':
                        varObj.type = 'string';
                        break;
                    default:
                        varObj.type = 'unknown';
                }

                //Must not allow any unsupported types because it can disrupt the connection if one is published.
                if(varObj.type !== 'unknown'){
                    varList.push(varObj);
                }
                
                varObj = {};
            });

            deviceInputData.timestamp = new Date().getTime();
            deviceInputData.metrics = varList;
        })
        .catch(err => console.log("The PLCnext API cannot make a request to the PLCnext runtime at this time."));
}, publishInterval);

module.exports = deviceInputData;
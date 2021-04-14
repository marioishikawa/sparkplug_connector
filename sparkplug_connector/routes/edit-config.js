require('dotenv').config();
const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const deviceInputData = require('../coms/plcnextAPI');
const sparkplugStatus = require('../coms/sparkplug');


let deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));

router.get('/edit-config', passport.authenticate('jwt', { session: false }), (req, res) => {
    deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));
    res.render('edit-config', {deviceConfig, deviceInputData, sparkplugStatus});
    global.location = req.originalUrl;
});

router.post('/edit-config', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { serverUrl, clientId, version, username, password  } = req.body;
    // console.log(req.body);
    let errors = [];
    let reServerUrl = /^tcp:\/\/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):1883$/igm;

    if(!serverUrl || !clientId || !version || !username || !password){
        //Browser validation should catch first
        errors.push({ errorMsg: 'Please fill in all required fields!' });
    }
    
    if(!reServerUrl.test(serverUrl)){
        errors.push({ errorMsg: 'Invalid server string!' });
    }
    
    if(version !== "spBv1.0"){
        //If 'version' is disabled on the form and the form is submitted, the config will be overwritten with no version parameter!
        errors.push({ errorMsg: 'The version cannot be changed by a human!' });
    }
    
    if(username !== deviceConfig.username && password !== deviceConfig.password){
        errors.push({ errorMsg: 'Incorrect username and/or password!' });
    } 
    
    if(errors.length > 0){
        errors.forEach(error => req.flash('error_msg', `${error.errorMsg}`));
        res.redirect('edit-config');
    } else {
        fs.writeFile('./config/deviceConfig.json', JSON.stringify(req.body), (err) => {
            if (err){
                //Exit here
                errors.push({ errorMsg: 'Failed to write configuration to device!' });
                errors.forEach(error => req.flash('error_msg', `${error.errorMsg}`));
                res.redirect('edit-config');
            } else {
                res.redirect('config');
            }
        });
    }
});


module.exports = router;
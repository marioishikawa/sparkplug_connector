//TODO: Secure server password?

const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');


let deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));

router.get('/edit-config', passport.authenticate('jwt', { session: false }), (req, res) => {
    deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));
    res.render('edit-config', {deviceConfig});
    global.location = req.originalUrl;
});

router.post('/edit-config', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { serverUrl, clientId, version, username, password  } = req.body;
    let errors = [];

    if(!serverUrl || !clientId || !version || !username || !password){
        errors.push({ errorMsg: 'Please fill in all required fields!' });
    }

    if(errors.length > 0){
        res.render('edit-config', {
            deviceConfig,
            errors,
            serverUrl,
            clientId,
            username
        });
    } else {
        let reServerUrl = /^tcp:\/\/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):1883$/igm;

        if (!reServerUrl.test(serverUrl)){
            errors.push({ errorMsg: 'Invalid server string!' });

            res.render('edit-config', {
                deviceConfig,
                errors,
                serverUrl,
                clientId
            });
        } else if (version !== 'spBv1.0'){
            //If 'version' is disabled on the form and the form is submitted, the config will be overwritten with no version parameter!
            errors.push({ errorMsg: 'The version \'spBv1.0\' cannot be changed!' });

            res.render('edit-config', {
                deviceConfig,
                errors,
                serverUrl,
                clientId
            });
        } else if (username === deviceConfig.username && password === deviceConfig.password){
            fs.writeFile('./config/deviceConfig.json', JSON.stringify(req.body), (err) => {
                if (err){
                    errors.push({ errorMsg: 'Failed to write configuration to device!' });

                    res.render('edit-config', {
                        deviceConfig,
                        errors,
                        serverUrl,
                        clientId,
                        username
                    });
                } else {
                    res.redirect('config');
                }
            });
        } else {
            errors.push({ errorMsg: 'Incorrect username and/or password!' });

            res.render('edit-config', {
                deviceConfig,
                errors,
                serverUrl,
                clientId
            });
        }     
    }
});


module.exports = router;
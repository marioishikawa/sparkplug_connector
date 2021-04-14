const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const deviceInputData = require('../coms/plcnextAPI');
const sparkplugStatus = require('../coms/sparkplug');


let deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));

router.get('/config', passport.authenticate('jwt', { session: false }), (req, res) => {
    deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));
    res.render('config', {deviceConfig, deviceInputData, sparkplugStatus});
    global.location = req.originalUrl;
});

module.exports = router;
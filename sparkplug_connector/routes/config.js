const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');


let deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));

router.get('/config', passport.authenticate('jwt', { session: false }), (req, res) => {
    deviceConfig = JSON.parse(fs.readFileSync('./config/deviceConfig.json'));
    res.render('config', {deviceConfig});
    global.location = req.originalUrl;
});

module.exports = router;
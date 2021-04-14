const express = require('express');
const router = express.Router();
const passport = require('passport');
const deviceInputData = require('../coms/plcnextAPI');
const sparkplugStatus = require('../coms/sparkplug');


router.get('/dashboard', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.render('dashboard', {deviceInputData, sparkplugStatus});
    global.location = req.originalUrl;
});

module.exports = router;
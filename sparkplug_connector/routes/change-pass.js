const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const uniqid = require('uniqid');
const deviceInputData = require('../coms/plcnextAPI');
const sparkplugStatus = require('../coms/sparkplug');


router.get('/change-pass', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.render('change-pass', {deviceInputData, sparkplugStatus});
    global.location = req.originalUrl;
});

router.post('/change-pass', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { password, passwordNew, passwordNewConf  } = req.body;
    let errors = [];
    let user = JSON.parse(fs.readFileSync('./config/user.json'));

    if( !password || !passwordNew || !passwordNewConf ){
        //Browser validation should catch first. If it doesn't, exit here.
        errors.push({ errorMsg: 'Please fill in all required fields!' });
        errors.forEach(error => req.flash('error_msg', `${error.errorMsg}`));
        res.redirect('change-pass');
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
        if(err) throw err;

        if(isMatch){
            if(passwordNew === passwordNewConf && passwordNew.length >= 6){
                let updatedUser = {
                    "id": uniqid(),
                    "username": user.username,
                    "password": passwordNew
                }
    
                bcrypt.genSalt(10, (err, salt) => {
                    if(err) throw err;
    
                    bcrypt.hash(updatedUser.password, salt, (err, hash) => {
                        if(err) throw err;
    
                        updatedUser.password = hash;
    
                        fs.writeFile('./config/user.json', JSON.stringify(updatedUser), (err) => {
                            if (err){
                                //Exit here
                                errors.push({ errorMsg: 'Failed to write configuration to device!' });
                                errors.forEach(error => req.flash('error_msg', `${error.errorMsg}`));
                                res.redirect('change-pass');
                            } else {
                                req.flash('success_msg', 'Password updated!');
                                res.redirect('dashboard');
                            }
                        });
                    });
                });
            } else if (passwordNew !== passwordNewConf){
                errors.push({ errorMsg: 'New passwords do not match!' });
            } else if (passwordNew.length < 6){
                errors.push({ errorMsg: 'Password must be at least 6 characters!' });
            }
        } else {
            errors.push({ errorMsg: 'Incorrect password!' });
        }
    });
    
    if(errors.length > 0){
        errors.forEach(error => req.flash('error_msg', `${error.errorMsg}`));
        res.redirect('change-pass');
    }
});

module.exports = router;
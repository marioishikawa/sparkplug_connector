//TODO: Possible help page for connecting to Ignition.

const path = require('path');
const http = require('http');
require('dotenv').config();
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const socketio = require('socket.io');
const flash = require('connect-flash');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('./config/passport')(passport);
const sparkplug = require('./coms/sparkplug');
const deviceInputData = require('./coms/plcnextAPI');
//os.networkInterfaces()

const PORT = 3010 || process.env.PORT;
const server = http.createServer(app);
const io = socketio(server);


//Server configs
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false })); //New body parser to get data from forms via req.body
app.use(cookieParser());
app.use(session(
  {
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
  }
));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


//Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

//Web socket
io.on('connection', socket => {
  socket.emit('welcomeMessage', 'Welcome to Ignition Gateway by Phoenix Contact.');

  setInterval(() => {
    if(global.location !== '/'){
      socket.emit('connection', sparkplug);
    }

    if(global.location === '/dashboard'){
      socket.emit('data', deviceInputData);
    }
  }, 1000)
});

//Routes
app.use('/', require('./routes/login'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/config'));
app.use('/', require('./routes/edit-config'));
app.use('/', require('./routes/change-pass'));
app.use('/', require('./routes/logout'));

//Error Handler
app.use((err, req, res, next) => {
  res.json(err);
});

//Start Server
server.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}.`);
});

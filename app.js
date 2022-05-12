var socketConfig = require('./app/socketConfig');
var mysql = require('mysql');
var Configuration = require('./library/Configs');
global.baseDir = __dirname;

var express = require('express');
const listener = require('./app/socket')
const backgoundService = require('./app/background-service')

const cors = require('cors');
const logger = require('./middleware/logger');

var app = express();
var http = socketConfig.isSecure ? require('https') : require('http');
var server = socketConfig.isSecure ? http.createServer(socketConfig.cert, app) : http.createServer(app);
var io = require('socket.io')(server, { origins: "*" });


// set up rate limiter: maximum of five requests per minute
var rateLimit = require('express-rate-limit');
const { connected } = require('process');
const { now } = require('moment');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// apply rate limiter to all requests
app.use(limiter);

app.use(cors());
app.disable('etag')

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(express.static('public'))

const conf = Configuration.getConfig();

// app.use(logger); // log all request
require('./middleware/router')(app); // set up routers

app.use(function(req, res, next) {
    res.status(404);
    res.send({ success: false, message: '404 page not found' });
});

backgoundService.start()
listener.start(io)
server.listen(conf.socket_port, async() => {
    console.log('Server listening on :%d ', conf.socket_port);
});
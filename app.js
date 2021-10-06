var socketConfig = require('./app/socketConfig');
var mysql = require('mysql');
var Configuration = require('./library/Configs');
global.baseDir = __dirname;

var express = require('express');
const listener = require('./app/socket')

const cors = require('cors');
const logger = require('./middleware/logger');

var app = express();
var http = socketConfig.isSecure ? require('https') : require('http');
var server = socketConfig.isSecure ? http.createServer(socketConfig.cert, app) : http.createServer(app);
var io = require('socket.io')(server, { origins: "*" });

app.use(cors());
app.disable('etag')

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(express.static('public'))

var sqlConn;
const conf = Configuration.getConfig();

// app.use(logger); // log all request
require('./middleware/router')(app); // set up routers

app.use(function(req, res, next) {
    res.status(404);
    res.send({ success: false, message: '404 page not found' });
});

// create mysql connection to database
sqlConn = mysql.createConnection(conf.db_config);
sqlConn.connect(function(err) {
    if (err) return console.log(err);
    listener.start(io, conf.db_config)
    server.listen(conf.socket_port, async() => {
        console.log('Server listening on :%d ', conf.socket_port);
    });
});

function getTime(dateTime) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    if (dateTime) {
        var today = new Date();
        var time = [pad(today.getFullYear()), pad(today.getMonth() + 1), today.getDate()].join('-') + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        return time;
    }
    var today = new Date();
    var time = pad(today.getHours()) + ":" + pad(today.getMinutes()) + ":" + pad(today.getSeconds());
    return time;
}
/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/

var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var port = Number(process.env.PORT || 5000);

server.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});




//connection procedure event
io.sockets.on('connection', function (socket) {

  socket.emit('connection_confirmation');
  


});

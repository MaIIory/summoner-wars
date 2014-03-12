/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/

var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 5000;

server.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});


/**************************************************
** GAME PLAYER CLASS
**************************************************/
var Player = function() {
	var that = this;
	that.id = 5;

};


/**************************************************
** GAME VARIABLES
**************************************************/

var players = []; // Array of connected players


/**************************************************
** GAME EVENTS
**************************************************/

//connection procedure event
io.sockets.on('connection', function (socket) {

  socket.emit('connection_confirmation', { id: socket.id });
  
  //creating new player
  socket.on('add_new_player', function() {
    
    var new_player = new Player()  
    players.push(new_player);

    //update number of players in all connected sockets
    io.sockets.emit('update_players_nb', { nb: players.length });
  });

});




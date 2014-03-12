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

var Player = function(login) {
	var that = this;
        that.name = login;
};


var Room = function(Name) {
        var that = this;
        that.name = Name;
        that.first_player = "none";
        that.second_player = "none";
        that.status = 0; // 0 - waiting for players
                         // 1 - ready to start
                         // 2 - battle in progress
};

/**************************************************
** GAME VARIABLES
**************************************************/

var players = []; // Array of connected players
var rooms = [];   // Array of rooms

/**************************************************
** SERVER FUNCTIONS
**************************************************/


/**************************************************
** GAME EVENTS
**************************************************/

//connection procedure event
io.sockets.on('connection', function (socket) {

  socket.emit('connection_confirmation', { id: socket.id });
  
  //creating new player
  socket.on('add_new_player', function(data) 
    {
       var new_player = new Player(data.login)  
       players.push(new_player);

       //update number of players in all connected sockets
       io.sockets.emit('update_players_list', { players: players });
    
       //init room table for new player
       socket.emit('update_room_table', { rooms: rooms });
   });
   
  //listen for new room creation request
  socket.on('create_new_room',function(data)
     {
     
     //check if this room dont exist already
     for(var i=0; i<rooms.length; i=i+1)
        {
        if(rooms[i].name === data.room_name)
           {
           socket.emit('error', { message: "Room already exist" });
           return;
           }
        }
        
     for(var i=0; i<rooms.length; i=i+1)
        {
        if((rooms[i].first_player === data.player_login) || (rooms[i].second_player === data.player_login))
           {
           socket.emit('error', { message: "You have to leave any other rooms" });
           return;
           }
        }
     
     var new_room = new Room(data.room_name);
     new_room.first_player = data.player_login;
     rooms.push(new_room);
     
     //broadcast rooms to all clients
     io.sockets.emit('update_room_table', { rooms: rooms } );
     
     //TODO socket.emit update player room status
     });  

   socket.on('join_to_room', function(data)
      {
      
      for(var i=0; i<rooms.length; i=i+1)
         {
          if(rooms[i].name === data.room_name)
          {
          rooms[i].second_player = data.player_login;
          io.sockets.emit('update_room_table', { rooms: rooms } );
          }
         }
      });
      
   socket.on('assign_player_to_room', function(data)
      {
          for(var i=0; i < rooms.length; i=i+1)
          {
            if(rooms[i].name === data.room_name)
            {
               if(data.player_login === rooms[i].first_player)
                  {
                  rooms[i].first_player = "none";
                  if(rooms[i].second_player === "none")
                     rooms.splice(i,1);
                  }
               else if(data.player_login === rooms[i].second_player)
                  {
                  rooms[i].second_player = "none";
                  if(rooms[i].first_player === "none")
                     rooms.splice(i,1);
                  }
               else
                  {
                   if(rooms[i].first_player === "none" )
                      rooms[i].first_player = data.player_login;
                   else if(rooms[i].second_player === "none")
                      rooms[i].second_player = data.player_login;
                   else 
                      {
                      socket.emit('error', { message: "No empty seat in the room" });
                      return;
                      }
                   
                   //remove player from any other rooms any delete empty rooms
                   for(var j=0;j<rooms.length;j=j+1)
                      {
                       if(rooms[j].name != data.room_name)
                       {
                        if(rooms[j].first_player === data.player_login)
                           rooms[j].first_player = "none";
                        if(rooms[j].second_player === data.player_login)
                           rooms[j].second_player = "none";
                        if((rooms[j].first_player === "none") && (rooms[j].second_player === "none"))
                           {
                           rooms.splice(j,1);
                           j=j-1;
                           }
                       }
                      }
                  }
                  io.sockets.emit('update_room_table', { rooms: rooms } );
            }
          }
      });

});


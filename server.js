/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
//var fs = require('fs') ,express = require('express'),
//app = express.createServer();

//app.use(express.static(__dirname + "/public"));


var express = require('express');
var app = express.createServer();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 8000;

server.listen(port);

app.use(express.static(__dirname + "/"));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});


/**************************************************
** GAME PLAYER CLASS
**************************************************/

var Player = function (login, socket_id) {
    var that = this;
    that.name = login;
    that.socket_id = socket_id; //using during disconnection
    that.selected_faction = null; //0 - phoenix elves, 1 - tundra orcs
    that.ready_to_start_game = false;
    that.ready_to_start_play = false; 
};


var Room = function (Name) {
    var that = this;
    that.name = Name;
    that.first_player = "none";  /*  containers for */
    that.second_player = "none"; /*  Player class   */
    that.status = 0; // 0 - waiting for players, 1 - ready to start, 2 - battle in progress

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

    socket.on('disconnect', function () {

        //TODO remove from rooms
        for (var i = 0; i < players.length; i = i + 1) {
            if (players[i].socket_id === socket.id) {
                players.splice(i, 1);
                io.sockets.emit('update_players_list', { players: players });
                return;
            }
        }
    });

    socket.emit('connection_confirmation');

    //creating new player
    socket.on('add_new_player', function (data) {
        var new_player = new Player(data.login, socket.id)
        players.push(new_player);

        //update number of players in all connected sockets
        io.sockets.emit('update_players_list', { players: players });

        //init room table for new player
        socket.emit('update_room_table', { rooms: rooms });
    });

    //listen for new room creation request
    socket.on('create_new_room', function (data) {

        //check if this room dont exist already
        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].name === data.room_name) {
                socket.emit('error', { message: "Room already exist" });
                return;
            }
        }

        for (var i = 0; i < rooms.length; i = i + 1) {
            if ((rooms[i].first_player.name === data.player_login) || (rooms[i].second_player.name === data.player_login)) {
                socket.emit('error', { message: "You have to leave any other rooms" });
                return;
            }
        }

        var new_room = new Room(data.room_name);
        new_room.first_player = new Player(data.player_login, socket.id);
        rooms.push(new_room);

        //broadcast rooms to all clients
        io.sockets.emit('update_room_table', { rooms: rooms });
    });

    //request for assignment to specific room
    socket.on('assign_player_to_room', function (data) {
        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].name === data.room_name) {

                //case 1: unassign first player
                //and reset players status
                if (data.player_login === rooms[i].first_player.name) {
                    rooms[i].first_player = "none";

                    if (rooms[i].second_player === "none") {
                        rooms.splice(i, 1);
                        break;
                    }

                }
                    //case 2: unassign second player
                    //and reset players status
                else if (data.player_login === rooms[i].second_player.name) {
                    rooms[i].second_player = "none";

                    if (rooms[i].first_player === "none") {
                        rooms.splice(i, 1);
                        break;
                    }
                }
                    //case 3: assign player
                    //to first free seat
                else {
                    if (rooms[i].first_player === "none")
                        rooms[i].first_player = new Player(data.player_login, socket.id);
                    else if (rooms[i].second_player === "none")
                        rooms[i].second_player = new Player(data.player_login, socket.id);
                    else {
                        socket.emit('error', { message: "No empty seat in the room" });
                        return;
                    }


                    //remove player from any other rooms any delete empty rooms
                    for (var j = 0; j < rooms.length; j = j + 1) {
                        if (rooms[j].name != data.room_name) {
                            if (rooms[j].first_player.name === data.player_login) //TODO moze byc blad przy probie dostepu
                                rooms[j].first_player = "none";
                            if (rooms[j].second_player.name === data.player_login)
                                rooms[j].second_player = "none";
                            if ((rooms[j].first_player === "none") && (rooms[j].second_player === "none")) {
                                rooms.splice(j, 1);
                                j = j - 1;
                            }
                        }
                    }
                }

                //check this room status
                if ((rooms[i].first_player != "none") && (rooms[i].second_player != "none")) {
                    rooms[i].status = 1; //ready to play
                }
                else {
                    rooms[i].status = 0; //waiting for players
                }
            }
        }

        io.sockets.emit('update_room_table', { rooms: rooms });

    });

    //report that player is ready to start game
    socket.on('join_to_game', function (data) {

        socket.join(data.room_name)

        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].name === data.room_name) {

                if (rooms[i].first_player.name === data.player_login) //TODO moze byc blad przy probie dostepu
                    rooms[i].first_player.ready_to_start_game = true;
                else if (rooms[i].second_player.name === data.player_login)
                    rooms[i].second_player.ready_to_start_game = true;
                else {
                    socket.emit('error', { message: "Something went wrong!" });
                    return;
                }

                if (rooms[i].first_player.ready_to_start_game && rooms[i].second_player.ready_to_start_game) {
                    rooms[i].status = 2; //battle in progress
                    io.sockets.in(data.room_name).emit('start_game');
                }

                io.sockets.emit('update_room_table', { rooms: rooms });
                return;
            }


        }
    });

    //report that player is ready to play battle
    socket.on('player_ready_to_play', function (data) {

        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].name === data.room_name) {

                if (data.player_login === rooms[i].first_player.name) {
                    rooms[i].first_player.ready_to_start_play = true;
                    rooms[i].first_player.selected_faction = data.player_faction;
                }
                else {
                    rooms[i].second_player.ready_to_start_play = true;
                    rooms[i].second_player.selected_faction = data.player_faction;
                }

                //if both players are ready start game
                if (rooms[i].first_player.ready_to_start_play && rooms[i].second_player.ready_to_start_play) {
                                        
                    io.sockets.in(data.room_name).emit('start_play', { 
                        starting_player: Math.floor(Math.random() * 2),
                        first_player_name: rooms[i].first_player.name,
                        second_player_name: rooms[i].second_player.name,
                        first_player_faction: rooms[i].first_player.selected_faction,
                        second_player_faction: rooms[i].second_player.selected_faction
                                       });
                }
            }
        }

        //TODO not sure if necessary (by now disabled)
        //io.sockets.emit('update_room_table', { rooms: rooms });

    });

    //move card event
    socket.on('move_card', function (data) {

        // sending to all clients in 'game' room(channel) except sender
        io.sockets.in(data.room_name).emit('move_card', { data: data });
    });


});

/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
//var fs = require('fs') ,express = require('express'),
//app = express.createServer();

//app.use(express.static(__dirname + "/public"));


var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var port = process.env.PORT || 9000;
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

        var player_name = "";

        //remove player from list
        for (var i = 0; i < players.length; i = i + 1) {
            if (players[i].socket_id === socket.id) {
                player_name = players[i].name;
                players.splice(i, 1);
                io.sockets.emit('update_players_list', { players: players });
            }
        }

        var emit_update_room = false;

        //remove player from room
        if (player_name != "") {

            for (var i = 0; i < rooms.length; i = i + 1) {

                if (rooms[i].first_player.name === player_name) {
                    rooms[i].first_player = "none";
                    emit_update_room = true;
                }
                else if (rooms[i].second_player.name === player_name) {
                    rooms[i].second_player = "none";
                    emit_update_room = true;
                }

                if ((rooms[i].first_player === "none") && (rooms[i].second_player === "none")) {
                    rooms.splice(i, 1);
                    emit_update_room = true;
                    break;
                }

            }
        }

        if (emit_update_room)
            io.sockets.emit('update_room_table', { rooms: rooms });
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
        socket.broadcast.to(data.room_name).emit('move_card', { card_id: data.card_id, dest_x: data.dest_x, dest_y: data.dest_y });
    });

    //resolve attack
    socket.on('resolve_attack', function (data) {
        // sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('resolve_attack', {
            hits: data.hits,
            attack_strangth: data.attack_strangth,
            attacking_card_id: data.attacking_card_id,
            hitted_card_id: data.hitted_card_id
        });
    });

    //game over
    socket.on('game_over', function (data) {
        // sending to all clients in 'game' room(channel) except sender

        io.sockets.in(data.room_name).emit('game_over', {
            win: data.win,
            lost: data.lost
        });
    });

    //step game phase
    socket.on('step_phase', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('step_phase');
    });

    //resolve attack
    socket.on('end_turn', function (data) {
        // sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('end_turn');
    });

    //build magic event handling
    socket.on('add_to_magic_pile', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('add_to_magic_pile', { card_id: data.card_id });
    });

    //summoning handling
    socket.on('summon_card', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('summon_card', { summoned_card_id: data.summoned_card_id, card_x: data.card_x, card_y: data.card_y });
    });

    //HANDLING EVENTS
    //PE
    socket.on('PE_event_burn', function(data) { 

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('PE_event_burn', { card_id: data.card_id, player_name: data.player_name });
    });

    socket.on('PE_greater_burn_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('PE_greater_burn_event', { card_id: data.card_id, player_name: data.player_name });
    });

    socket.on('PE_spirit_of_the_phoenix_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('PE_spirit_of_the_phoenix_event', { card_id: data.card_id });
    });

    socket.on('PE_wall_summon_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('PE_wall_summon_event', { card_id: data.card_id, i: data.i, j: data.j });
    });

    //TO
    socket.on('TO_wall_summon_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('TO_wall_summon_event', { card_id: data.card_id, i: data.i, j: data.j });
    });

    socket.on('TO_ice_wall_summon_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('TO_ice_wall_summon_event', { card_id: data.card_id, i: data.i, j: data.j });
    });

    socket.on('TO_freeze_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('TO_freeze_event', { freezed_card_id: data.freezed_card_id, freezing_card_id: data.freezing_card_id });
    });

    socket.on('TO_unfreeze_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('TO_unfreeze_event', { freezed_card_id: data.freezed_card_id,});
    });

    //ALL
    socket.on('ALL_magic_drain_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('ALL_magic_drain_event', { card_id: data.card_id });
    });

    socket.on('ALL_hero_is_born_event', function (data) {

        //sending to all clients in 'game' room(channel) except sender
        socket.broadcast.to(data.room_name).emit('ALL_hero_is_born_event');
    });

});

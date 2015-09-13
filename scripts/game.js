//alert("asdasd");

/*********************VARIABLES DECLARATION********************/
//-----------------------------------------------------------//

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var width = 1024;   //canvas width and background image
var height = 768;   //canvas height and background image

//load background images
var background_image = new Image();
background_image.src = "/img/background.jpg";

var background_image_with_board = new Image();
background_image_with_board.src = "/img/board.jpg";

//game state indicators
var state = 0; /* 0 - main menu
                  1 - briefing (faction selection)
                  2 - waiting for other players 
                  3 - game in progress 
                  */

var start_play_event = false; //indicates if 'start_play' event came
var end_turn_event = false;   //indicates if 'end turn' event came

//game phase indicators
var game_phase = 3; /* 0 - draw phase
                       1 - summon phase
                       2 - event phase
                       3 - move phase (start phase)
                       4 - atack phase
                       5 - build magic phase
                       6 - "Blaze Step" phase (in case one of the player plays pheonix elves deck) 
                       7 - game over 
                       8 - "Reinforcement" - specific phase for Tundra Orcs 
                       9 - "Fury" phase */

var your_turn = false;

//actual page handler
var page_handler = null;

//mouse settings
var mouse_x = 0;
var mouse_y = 0;
var mouse_button_down = false;
var mouse_state = 0; /* 0 - standby
                        1 - clicked
                        2 - used */
var mouse_used = false; //additional indicator for cohesction purpose

//players settings
var player = null;
var opponent = null;

//fps counter
var fps = 0;
var fps_sum = [];
var lastRun;

//iteration counters
var ite1 = 0;
var ite2 = 0;
var ite_dif = 0;

//gameLoop data
var previous = Date.now();
var lag = 0.0;
var MS_PER_UPDATE = 10;

/*************************DEFINE EVENTS*************************/
//-----------------------------------------------------------//

//requestAnim
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 50);
        };
})();

canvas.addEventListener('mousemove', function (evt) {
    var rect = canvas.getBoundingClientRect();
    mouse_x = evt.clientX - rect.left,
    mouse_y = evt.clientY - rect.top
}, false);

canvas.addEventListener('mousedown', function (evt) {
    mouse_button_down = true;
    mouse_used = false;
}, false);

canvas.addEventListener('mouseup', function (evt) {
    mouse_button_down = false;
    //mouse_state = 0;
}, false);

socket.on('ping', function (data) {

    socket.emit('pong');
    console.log('pong');

})

socket.on('start_play', function (data) {

    //create new oppponent instance and determine faction
    if (player.name != data.first_player_name) {
        opponent = new Player(data.first_player_name);
        if (data.first_player_faction === 0)
            opponent.faction = new PheonixElves(opponent.name)
        else
            opponent.faction = new TundraOrcs(opponent.name)
    }
    else {
        opponent = new Player(data.second_player_name);
        if (data.second_player_faction === 0)
            opponent.faction = new PheonixElves(opponent.name)
        else
            opponent.faction = new TundraOrcs(opponent.name)
    }

    //determine which player starts 
    //data.starting_player: 0 - first player, 1 - second player
    if (((player.name === data.first_player_name) && (data.starting_player === 0)) || ((player.name === data.second_player_name) && (data.starting_player === 1))) {
        your_turn = true;
    }

    start_play_event = true;
})

//incoming move card event
socket.on('move_card', function (data) {
    page_handler.board.moveCard(data.card_id, data.dest_x, data.dest_y);
})

//incoming resolve attack event
socket.on('resolve_attack', function (data) {
    page_handler.board.resolveAttack(data.hits, data.attack_strangth, data.attacking_card_id, data.hitted_card_id);
})

//incoming step phase event
socket.on('step_phase', function (data) {

    if (game_phase === 8)
        game_phase = 2;
    else if (game_phase === 9)
        game_phase = 4;
    else
        game_phase += 1;

    //add 'end phase' animation
    page_handler.animations = [];
    page_handler.animations.push(new page_handler.Animation(0));
})

//incoming end turn event - start your turn
socket.on('end_turn', function (data) {

    end_turn_event = true;
    page_handler.animations.push(new page_handler.Animation(0));
})

//incoming game over event
socket.on('game_over', function (data) {

    if (state != 3) {
        $("#dialog").text("Opponent has disconnected! Refresh page the page!");
        $('#dialog').dialog('open');
    }

    game_phase = 7;

    if (player.name === data.win)
        player.win = 1;
    else if (opponent.name === data.win)
        opponent.win = 1;

    page_handler.animations.push(new page_handler.Animation(3));

})

//incoming add card to magic pile event
socket.on('add_to_magic_pile', function (data) {

    var card_ref = null;

    for (var i = 0; opponent.faction.deck.length; i++) {

        console.log('card_id' + data.card_id)

        if (opponent.faction.deck[i].id === data.card_id) {

            card_ref = opponent.faction.deck[i];
            opponent.faction.deck.splice(i, 1);
            break;
        }
    }

    if (card_ref === null) return;

    opponent.magic_pile.push(card_ref);
})

socket.on('summon_card', function (data) {
    //run animation
    page_handler.animations.push(new page_handler.Animation(13, null, null, null, null, data.card_y, data.card_x));

    for (var i = 0; i < opponent.faction.deck.length; i++) {
        if (opponent.faction.deck[i].id === data.summoned_card_id) {
            page_handler.board.addCard(opponent.faction.deck[i], data.card_y, data.card_x);

            var cost = opponent.faction.deck[i].cost;
            opponent.faction.deck.splice(i, 1);

            if (game_phase != 8) {
                for (var i = 0; i < cost; i++) {
                    opponent.discard_pile.push(opponent.magic_pile.pop());
                }
            }
            return
        }
    }
})

//Events and abilities handling
socket.on('PE_event_burn', function (data) {

    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.card_id) {

                page_handler.board.matrix[i][j].wounds += 1;

                //add 'Burn' animation
                page_handler.animations.push(new page_handler.Animation(4, null, null, null, null, j, i));
                
                if (page_handler.board.matrix[i][j].wounds >= page_handler.board.matrix[i][j].lives) {
                    page_handler.board.matrix[i][j].wounds = page_handler.board.matrix[i][j].lives; //only for displaying purpose
                    page_handler.board.matrix[i][j].killed_by = data.player_name; //store card killer name
                    page_handler.board.matrix[i][j].dying = true;
                    page_handler.board.matrix[i][j].hover = false;
                    page_handler.board.matrix[i][j].selected = false;
                }
                for (var i = 0; i < opponent.faction.deck.length; i++) {

                    if (opponent.faction.deck[i].name === 'Burn') {
                        opponent.discard_pile.push(opponent.faction.deck[i]);
                        opponent.faction.deck.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }
})

socket.on('PE_greater_burn_event', function (data) {

    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.card_id) {

                page_handler.board.matrix[i][j].wounds += 2;

                //add 'Burn' animation
                page_handler.animations.push(new page_handler.Animation(5, null, null, null, null, j, i));

                if (page_handler.board.matrix[i][j].wounds >= page_handler.board.matrix[i][j].lives) {
                    page_handler.board.matrix[i][j].wounds = page_handler.board.matrix[i][j].lives; //only for displaying purpose
                    page_handler.board.matrix[i][j].killed_by = data.player_name; //store card killer name
                    page_handler.board.matrix[i][j].dying = true;
                    page_handler.board.matrix[i][j].hover = false;
                    page_handler.board.matrix[i][j].selected = false;
                }
                for (var i = 0; i < opponent.faction.deck.length; i++) {

                    if (opponent.faction.deck[i].name === 'Greater Burn') {
                        opponent.discard_pile.push(opponent.faction.deck[i]);
                        opponent.faction.deck.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }
})

socket.on('PE_spirit_of_the_phoenix_event', function (data) {

    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.card_id) {

                page_handler.board.matrix[i][j].spirit_of_the_phoenix = true;

                //add 'Spirit of the phoenix' animation
                page_handler.animations.push(new page_handler.Animation(6, null, null, data.card_id));

                for (var i = 0; i < opponent.faction.deck.length; i++) {

                    if (opponent.faction.deck[i].name === 'Spirit of the Phoenix') {
                        opponent.discard_pile.push(opponent.faction.deck[i]);
                        opponent.faction.deck.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }
})

socket.on('PE_blaze_step_phase', function (data) {
    game_phase = 6;
    page_handler.animations.push(new page_handler.Animation(15));
})

socket.on('PE_wall_summon_event', function (data) {

    for (var i = 0; i < opponent.faction.deck.length; i++) {

        if (opponent.faction.deck[i].name === 'Wall') {

            page_handler.animations.push(new page_handler.Animation(7));
            page_handler.board.addCard(opponent.faction.deck[i], data.j, data.i);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

socket.on('PE_blaze_step', function (data) {

    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.card_id) {

                page_handler.board.addCard(page_handler.board.matrix[i][j], data.x, data.y);
                page_handler.board.matrix[i][j] = null;
                page_handler.animations.push(new page_handler.Animation(17, null, null, null, null, data.x, data.y));
                return;

            }
        }
    }
})

socket.on('PE_resolve_fire_breath', function (data) {
    page_handler.board.resolveFireBreath(data.impacted_cards);
})

socket.on('PE_blazing_consription', function (data) {

    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.card_id) {

                page_handler.board.matrix[i][j].owner = opponent.name;
                page_handler.board.matrix[i][j].taken = true;
                page_handler.animations.push(new page_handler.Animation(22, null, null, null, null, null, null, { id: data.card_id }));
                return;

            }
        }
    }
})

socket.on('TO_wall_summon_event', function (data) {

    for (var i = 0; i < opponent.faction.deck.length; i++) {

        if (opponent.faction.deck[i].name === 'Wall') {

            page_handler.animations.push(new page_handler.Animation(7));
            page_handler.board.addCard(opponent.faction.deck[i], data.j, data.i);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

socket.on('TO_ice_wall_summon_event', function (data) {

    for (var i = 0; i < opponent.faction.deck.length; i++) {

        if (opponent.faction.deck[i].name === 'Ice Wall') {

            page_handler.animations.push(new page_handler.Animation(8));
            page_handler.board.addCard(opponent.faction.deck[i], data.j, data.i);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

socket.on('TO_freeze_event', function (data) {

    //run animation
    page_handler.animations.push(new page_handler.Animation(11));

    //Freeze specific card
    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.freezed_card_id) {
                page_handler.board.matrix[i][j].freezed = true;

                //add 'Freeze' card to discard pile
                for (var k = 0; k < opponent.faction.deck.length; k++) {
                    if (opponent.faction.deck[k].id === data.freezing_card_id) {
                        page_handler.board.matrix[i][j].freeze_card_ref = opponent.faction.deck[k];
                        opponent.discard_pile.push(opponent.faction.deck[k]);
                        console.log("card discarded");
                        opponent.faction.deck.splice(k, 1);
                        return;
                    }
                }

            }
        }
    }
})

socket.on('TO_unfreeze_event', function (data) {

    //run animation
    page_handler.animations.push(new page_handler.Animation(12));

    //Freeze specific card
    for (var i = 0; i < page_handler.board.matrix.length; i++) {
        for (var j = 0; j < page_handler.board.matrix[i].length; j++) {

            if (page_handler.board.matrix[i][j] != null && page_handler.board.matrix[i][j].id === data.freezed_card_id) {
                page_handler.board.matrix[i][j].freezed = false;
            }
        }
    }
})

socket.on('TO_reinforcements_event', function (data) {

    //run animation
    page_handler.animations.push(new page_handler.Animation(14));
    game_phase = 8;

    for (var i = 0; i < opponent.faction.deck.length; i++) {
        if (opponent.faction.deck[i].id === data.card_id) {
            opponent.discard_pile.push(opponent.faction.deck[i]);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

socket.on('TO_fury_phase', function (data) {

    console.log("event received");

    if (data.fury) {
        console.log("point 1");
        page_handler.animations.push(new page_handler.Animation(16));
        game_phase = 9;
    } else {
        console.log("point 2");
        page_handler.animations.push(new page_handler.Animation(18));
    }
})

socket.on('TO_walls_of_ice_shards', function (data) {

    page_handler.board.handleWallsOfIceShards(data.dice_roll);
})

socket.on('TO_wild_swing', function (data) {

    page_handler.board.handleWildSwing(data.dice_roll, data.krung_id, data.hits)
})

socket.on('ALL_magic_drain_event', function (data) {

    var magic_pile_len = player.magic_pile.length

    for (var i = 0; i < magic_pile_len && i < 2; i++) {
        opponent.magic_pile.push(player.magic_pile.pop());
    }
    page_handler.animations.push(new page_handler.Animation(9));

    for (var i = 0; i < opponent.faction.deck.length; i++) {

        if (opponent.faction.deck[i].name === 'Magic Drain') {
            opponent.discard_pile.push(opponent.faction.deck[i]);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

socket.on('ALL_hero_is_born_event', function (data) {

    page_handler.animations.push(new page_handler.Animation(10));

    for (var i = 0; i < opponent.faction.deck.length; i++) {

        if (opponent.faction.deck[i].name === 'A Hero Is Born') {
            opponent.discard_pile.push(opponent.faction.deck[i]);
            opponent.faction.deck.splice(i, 1);
            return;
        }
    }
})

/***************************CLASSES****************************/
//-----------------------------------------------------------//

var Player = function (name) {

    var that = this;
    that.name = name;
    that.selected_faction = 0; //0 - Phoenics Elves by default, 1 - Tundra Orcs
    that.faction = null;
    that.moves_left = 2;   //in the first turn player has 2 moves
    that.attacks_left = 2; //in the first turn player has 2 attacks
    that.magic_pile = [];
    that.discard_pile = [];
    that.win = 0; //0 - player lost, 1 - player win
    that.reinforcement_cnt = 0; //for reinforcement event purpose
}

var Card = function (card_name, id, x, y, owner_name, range, attack, lives, cost, card_class) {
    var that = this;

    //basic data
    that.name = card_name;
    that.id = id;
    that.original_owner = owner_name
    that.owner = owner_name;

    //image source and draw data
    that.pos_x = x;
    that.pos_y = y;
    that.board_w = 130;
    that.board_h = 85;
    that.height = 239;
    that.width = 367;
    that.hover = false;
    that.hover_eyeglass = false;
    that.selected = false;
    that.draw_big_picture = false;
    that.draw_big_picture_from_hand = false;

    //summon phase data
    that.cost = cost;

    //move phase data
    that.moves_left = 2;
    that.previous_moves = []; //container for coordinates with previous moves in the same turn

    //atack phase data
    that.lives = lives;
    that.wounds = 0; //received wounds
    that.attacked = false; //indicates if card already attacked in this turn
    that.in_range = false; //indicates if this card may be attacked (for the drawing purpose)
    /* range of card attacks
       event cards has range 0, so wall cant attacks */
    that.range = range;
    that.attack = attack; //attack strength
    that.dying = false; //indicator if card is going to die
    that.alpha = 1; //when card is dying alpha should be decremented
    that.cnt = 0; //for delay during dying
    that.killed_by = ""; //name of the card killer
    that.card_class = card_class;

    //abilities assignment
    that.precise = false;

    if (that.name === 'Guardian')
        that.precise = true;

    that.fury = false;
    that.is_fury_active = false;
    that.power_active = false;
    that.taken = false;

    if (that.name === 'Kaeseeall')
        that.power_active = true;

    if (that.name === 'Fighter' || that.name === 'Ragnor')
        that.fury = true;

    //events handling
    that.spirit_of_the_phoenix = false;
    that.freezed = false;
    that.freeze_card_ref = null; //for printing purpose

    //TODO draw method should be removed
    that.draw = function (image) {

    }
}

//Page Handlers Definitions
var MainMenu = function () {

    //Set context
    var that = this;

    //ATTRIBUTES
    that.image = new Image(); //background image
    that.image.src = "/img/main_menu.png";

    //logo settings
    that.logo_src_y = 240; //logo source y coordinate (x = 0)
    that.logo_width = 600; //logo width
    that.logo_height = 250; //logo height

    //button settings
    that.b_width = 300; //button width
    that.b_height = 60;  //button height

    //buttons initialization 
    that.buttons = [0, 0, 0, 0]; /* button table with hoover data
                                   0 - mouse out
                                   1 - mouse over */

    that.state = 0; /* 0 - main maenu, 1 - draw credits */

    that.checkHover = function () {

        for (var i = 0; i < that.buttons.length; i++) {
            if ((mouse_y > (height / 2) + (i * (that.b_height + 20))) &&
                (mouse_y < (height / 2) + ((i * (that.b_height + 20)) + that.b_height)) &&
                (mouse_x > (width / 2) - (that.b_width / 2)) &&
                (mouse_x < ((width / 2) - (that.b_width / 2)) + that.b_width)) {
                that.buttons[i] = 1; //mouse over 
            }
            else {
                that.buttons[i] = 0; //mouse out 
            }
        }
    }

    that.draw = function () {

        //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
        if (that.state === 0) {
            //draw buttons
            for (var i = 0; i < that.buttons.length; i++) {
                ctx.drawImage(that.image,
                    that.buttons[i] * that.b_width,
                    that.b_height * i,
                    that.b_width,
                    that.b_height,
                    (width / 2) - (that.b_width / 2),
                    (height / 2) + (i * (that.b_height + 20)),
                    that.b_width,
                    that.b_height);
            }

            //draw logo
            ctx.drawImage(that.image, 0, that.logo_src_y, that.logo_width, that.logo_height, (width / 2) - (that.logo_width / 2), 50, that.logo_width, that.logo_height);
        }
        else if (that.state === 1) {

            //ctx.font = 'Bold 20pt Times New Roman';
            ctx.fillText("Credits: ", 400, 400);

            //draw logo
            ctx.drawImage(that.image, 0, that.logo_src_y, that.logo_width, that.logo_height, (width / 2) - (that.logo_width / 2), 50, that.logo_width, that.logo_height);

        }

    }

    that.checkAction = function () {

        if (mouse_state === 1 && that.state != 0) {
            mouse_state = 2;
            return 9;
        }
        else if (that.buttons[0] && mouse_state === 1) {
            mouse_state = 2;
            return 1;
        }
        else if (that.buttons[1] && mouse_state === 1) {
            mouse_state = 2;
            null; //TODO draw options
        }
        else if (that.buttons[2] && mouse_state === 1) {
            mouse_state = 2;
            return 2;
        }
        else if (that.buttons[3] && mouse_state === 1) {
            mouse_state = 2;
            null; //TODO exit game
        }

    }
}

var BriefingMenu = function () {

    //Set context
    var that = this;

    //ATTRIBUTES
    that.image = new Image(); //background image
    that.image.src = "/img/briefing_menu.png";

    //header settings
    that.header_src_y = 1053;
    that.header_w = 300;
    that.header_h = 50;

    //faction desciption container
    that.faction_desc_src_y = 500;
    that.faction_desc_w = 306;
    that.faction_desc_h = 463;

    //faction frame
    that.faction_frame_src_y = 1103;
    that.faction_frame_w = 320;
    that.faction_frame_h = 490;

    //faction image
    that.faction_image_w = 320;
    that.faction_image_h = 500;

    //begin button settings
    that.btn_begin_src_y = 993;
    that.btn_begin_width = 300; // "Begin" button width
    that.btn_begin_height = 60; // "Begin" button height
    that.btn_begin_hoover = 0;  /* button table with hoover data
                                   0 - mouse out
                                   1 - mouse over */

    //faction selection buttons initialization 
    that.btn_sel_src_y = 963;
    that.btn_sel_w = 30;
    that.btn_sel_h = 30;
    that.buttons = [0, 0]; /* button table with hoover data [left, right]
                                   0 - mouse out
                                   1 - mouse over */

    that.checkHover = function () {

        //check begin button hoover
        if ((mouse_x > (width / 2) - (that.btn_begin_width / 2)) &&
            (mouse_x < ((width / 2) - (that.btn_begin_width / 2)) + that.btn_begin_width) &&
            (mouse_y > 675) &&
            (mouse_y < 675 + that.btn_begin_height)) {

            that.btn_begin_hoover = 1;
        }
        else {
            that.btn_begin_hoover = 0;
        }

        //check faction selection buttons
        //left
        if ((mouse_x > 253 - (that.btn_sel_w / 2)) &&
            (mouse_x < (253 - (that.btn_sel_w / 2)) + that.btn_sel_w) &&
            (mouse_y > 575) &&
            (mouse_y < 575 + that.btn_sel_h)) {

            that.buttons[0] = 1;
        }
        else {
            that.buttons[0] = 0;
        }

        //right
        if ((mouse_x > 353 - (that.btn_sel_w / 2)) &&
            (mouse_x < (353 - (that.btn_sel_w / 2)) + that.btn_sel_w) &&
            (mouse_y > 575) &&
            (mouse_y < 575 + that.btn_sel_h)) {

            that.buttons[1] = 1;
        }
        else {
            that.buttons[1] = 0;
        }

    }

    that.draw = function (player) {

        //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)

        //draw header
        ctx.drawImage(that.image, 0, that.header_src_y, that.header_w, that.header_h,
            150, 75, that.header_w, that.header_h);

        //draw faction description
        ctx.drawImage(that.image, player.selected_faction * that.faction_desc_w,
            that.faction_desc_src_y, that.faction_desc_w, that.faction_desc_h,
            150, 175, that.faction_desc_w, that.faction_desc_h);

        //draw faction frame
        ctx.drawImage(that.image, 0, that.faction_frame_src_y, that.faction_frame_w, that.faction_frame_h,
            (width / 2) + 50, 150, that.faction_frame_w, that.faction_frame_h);

        //draw faction image
        ctx.drawImage(that.image, player.selected_faction * that.faction_image_w, 0, that.faction_image_w, that.faction_image_h,
            (width / 2) + 50, 150, that.faction_image_w, that.faction_image_h);

        //draw begin button
        ctx.drawImage(that.image, that.btn_begin_hoover * that.btn_begin_width,
            that.btn_begin_src_y, that.btn_begin_width, that.btn_begin_height,
            (width / 2) - (that.btn_begin_width / 2), 675, that.btn_begin_width, that.btn_begin_height);

        //draw selection buttons
        //left
        ctx.drawImage(that.image, that.buttons[0] * that.btn_sel_w, that.btn_sel_src_y, that.btn_sel_w, that.btn_sel_h,
            253 - (that.btn_sel_w / 2), 575, that.btn_sel_w, that.btn_sel_h);
        //right
        ctx.drawImage(that.image, (that.buttons[1] * that.btn_sel_w) + 60, that.btn_sel_src_y, that.btn_sel_w, that.btn_sel_h,
            353 - (that.btn_sel_w / 2), 575, that.btn_sel_w, that.btn_sel_h);

    }

    that.checkAction = function () {

        if (that.btn_begin_hoover === 1 && mouse_state === 1) {
            mouse_state = 2;
            return 1;
        }

        if (that.buttons[0] === 1 && mouse_state === 1) {
            mouse_state = 2;
            return 2;
        }
        if (that.buttons[1] === 1 && mouse_state === 1) {
            mouse_state = 2;
            return 3;
        }
        return 0;
    }
}

var WaitingMenu = function () {

    //Set context
    var that = this;

    //ATTRIBUTES
    that.image = new Image(); //background image
    that.image.src = "/img/waiting_menu.png";

    //logo settings
    that.img_width = 600; //logo width
    that.img_height = 100; //logo height

    that.draw = function () {

        //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
        //draw logo
        ctx.drawImage(that.image, 0, 0, that.img_width, that.img_height, (width / 2) - (that.img_width / 2), (height / 2) - (that.img_height / 2), that.img_width, that.img_height);

    }
}

var PlaygroundHandler = function () {

    //set context
    var that = this;

    that.image = new Image();
    that.image.src = "/img/playground_handler.png";

    //phase button settings
    that.btn_phase_wh = 150; //button width and height
    that.btn_phase_frame = 0; //0 - not active, 1 - active not hovered, 1 - active hovered
    that.btn_phase_hover = false;
    that.btn_phase_x = 835;
    that.btn_phase_y = 605;
    that.btn_phase_src_y = 0;
    that.btn_phase_padding = 30;

    //hand button settings
    that.btn_hand_wh = 90;
    that.btn_hand_frame = 0; // 0 - active, 1 - hovered
    that.btn_hand_hover = false;
    that.btn_hand_x = 895;
    that.btn_hand_y = 540;
    that.btn_hand_src_y = 150;
    that.btn_hand_padding = 10;

    //surrender button settings
    that.btn_surrender_wh = 60;
    that.btn_surrender_frame = 0; //0 - active, 1 - hovered
    that.btn_surrender_hover = false;
    that.btn_surrender_x = 845;
    that.btn_surrender_y = 570;
    that.btn_surrender_src_y = 240;
    that.btn_surrender_padding = 5;

    //build magic button settings
    that.btn_build_magic_wh = 40;
    that.btn_build_magic_state = 0; //0 - not active, 1 - active, 2 - hovered
    that.btn_build_magic_x = 822;
    that.btn_build_magic_y = 614;
    that.btn_build_magic_src_y = 1761;
    that.btn_build_magic_padding = 3;

    //'game over' print settings
    that.go_s_x = 0;    //source start x for game over screen
    that.go_s_y = 1461; //source start y for game over screen

    that.animations = [];

    //draw in big picture indicator
    that.draw_big_picture = false;            //indicates if any card from BOARD is drawn in big picture
    that.draw_big_picture_from_hand = false;  //indicates if any card from HAND is drawn in big picture

    //parent pointer for inner classes
    var parent = this;

    //Inner classes
    var Board = function () {

        var that = this;

        that.s_x = 40; /*   Starting    */
        that.s_y = 40; /* coordinations */

        that.square_w = 130;
        that.square_h = 85;

        //image settings
        that.sheet_origin = 300; //indicates start 'y' point for board graphics in the parent sheet

        //wounds data - small icons
        that.wounds_src_x = 18;
        that.wounds_src_y = 85;
        that.wounds_s_x = 30;
        that.wounds_s_y = 21;
        that.wounds_w = 7;
        that.wounds_h = 7;
        that.hor_diff_between = 6;
        that.ver_diff_between = 7;

        //wounds data - 'draw in big picture' icons
        that.wounds_big_src_x = 0;
        that.wounds_big_src_y = 85;
        that.wounds_big_s_x = 84;
        that.wounds_big_s_y = 61;
        that.wounds_big_w = 18;
        that.wounds_big_h = 16;
        that.hor_big_diff_between = 19;
        that.ver_big_diff_between = 20;

        //Summon phase data
        that.hovered_tile_for_summon = [null, null];

        //init board
        that.matrix =
            [[null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null],
            [null, null, null, null, null, null]]

        /* c (column), r (row) - position from matrix */
        that.addCard = function (card, c, r) {
            for (var i = 0; i < that.matrix.length; i++) {
                if (r === i) {
                    for (var j = 0; j < that.matrix[i].length; j++) {
                        if (c === j) {
                            that.matrix[i][j] = card;
                        }
                    }
                }
            }
        }

        that.moveCard = function (id, dest_x, dest_y) {


            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].id === id)) {

                        card_i = i;
                        card_j = j;
                    }
                }
            }

            //decrease number of left moves
            that.matrix[card_i][card_j].moves_left = that.matrix[card_i][card_j].moves_left - (Math.abs(card_i - dest_x) + Math.abs(card_j - dest_y));

            //store previous moves
            //firsly store base position
            that.matrix[card_i][card_j].previous_moves[that.matrix[card_i][card_j].previous_moves.length] = [card_i, card_j];

            //if necessary store coordinates laying beetwen
            if (Math.abs(card_j - dest_y) === 2) {
                that.matrix[card_i][card_j].previous_moves[that.matrix[card_i][card_j].previous_moves.length] = [dest_x, dest_y + ((card_j - dest_y) / Math.abs(card_j - dest_y))];
            }
            else if (Math.abs(card_i - dest_x) === 2) {
                that.matrix[card_i][card_j].previous_moves[that.matrix[card_i][card_j].previous_moves.length] = [dest_x + ((card_i - dest_x) / Math.abs(card_i - dest_x)), dest_y];
            }
            else if ((Math.abs(Math.abs(card_i - dest_x) === 1)) && (Math.abs(card_j - dest_y) === 1)) {
                if (that.matrix[card_i - (card_i - dest_x)][card_j] === null)
                    that.matrix[card_i][card_j].previous_moves[that.matrix[card_i][card_j].previous_moves.length] = [card_i - (card_i - dest_x), card_j];
                else if (that.matrix[card_i][card_j - (card_j - dest_y)] === null)
                    that.matrix[card_i][card_j].previous_moves[that.matrix[card_i][card_j].previous_moves.length] = [card_i, card_j - (card_j - dest_y)];
            }

            //move card to selected destination
            that.matrix[dest_x][dest_y] = that.matrix[card_i][card_j];
            that.matrix[card_i][card_j] = null;
        }

        that.resolveAttack = function (hits, attack_strangth, attacking_card_id, hitted_card_id) {

            //hitted card coordinates
            var hit_card_i = null;
            var hit_card_j = null;

            //reference to attacking card object
            var attacking_card_ref = null;

            //get hitted cards coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].id === hitted_card_id)) {

                        hit_card_i = i;
                        hit_card_j = j;

                    }

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].id === attacking_card_id)) {

                        attacking_card_ref = that.matrix[i][j];

                    }
                }
            }

            //add wounds to hited card
            that.matrix[hit_card_i][hit_card_j].wounds += hits;

            if (that.matrix[hit_card_i][hit_card_j].wounds >= that.matrix[hit_card_i][hit_card_j].lives) {
                that.matrix[hit_card_i][hit_card_j].wounds = that.matrix[hit_card_i][hit_card_j].lives; //only for displaying purpose
                that.matrix[hit_card_i][hit_card_j].killed_by = attacking_card_ref.owner; //store card killer name
                that.matrix[hit_card_i][hit_card_j].dying = true;
                that.matrix[hit_card_i][hit_card_j].hover = false;
                that.matrix[hit_card_i][hit_card_j].selected = false;

                //handle GAME OVER
                if ((that.matrix[hit_card_i][hit_card_j].id) === 'pe31' && (that.matrix[hit_card_i][hit_card_j].owner === player.name)) {
                    socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                }
                else if ((that.matrix[hit_card_i][hit_card_j].id) === 'to25' && (that.matrix[hit_card_i][hit_card_j].owner === player.name)) {
                    socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                }

            }

            //add 'nb of hits' animation and clear container if any animation is hanging
            //parent.animations = [];
            parent.animations.push(new parent.Animation(2, hits, attack_strangth, attacking_card_id, hitted_card_id));
            parent.animations.push(new parent.Animation(1, hits, attack_strangth));

            //'Fury' ability handling
            //Note: owner should be checked to avoid sending fury event twice (from opponent side)
            if (attacking_card_ref.fury && attacking_card_ref.owner === player.name) {

                if (Math.floor((Math.random() * 6) + 1) > 4) {

                    parent.animations.push(new parent.Animation(16));
                    game_phase = 9;
                    attacking_card_ref.is_fury_active = true;
                    attacking_card_ref.moves_left = 2;
                    attacking_card_ref.attacked = false;
                    socket.emit('TO_fury_phase', { room_name: room_name, fury: true });


                } else {
                    parent.animations.push(new parent.Animation(18));
                    socket.emit('TO_fury_phase', { room_name: room_name, fury: false });

                }

            }
        }

        that.unselectAll = function () {

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && that.matrix[i][j].selected) {

                        that.matrix[i][j].selected = false;
                        return;
                    }
                }
            }
        }

        that.resetPreviousMoves = function () {

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if (that.matrix[i][j] != null) {

                        that.matrix[i][j].previous_moves = [];
                        that.matrix[i][j].moves_left = 2;
                        that.matrix[i][j].attacked = false;
                    }
                }
            }
        }

        that.checkMouseActivity = function () {

            if (parent.draw_big_picture_from_hand)
                return;

            /* This function is independent from game phase
            
               function of this method:
               - in case of hover change "hover indicator" in Card object
               - in case of click on card change "selection indicator" in Card object
            */



            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if (that.matrix[i][j] === null || that.matrix[i][j].draw_big_picture === false || that.matrix[i][j].owner != player.name)
                        continue;

                    //firstly check if player want to unfreeze frezzed card
                    if (that.matrix[i][j].freezed) {

                        if ((mouse_state === 1) && (player.magic_pile.length >= 2) && mouse_x > 415 && mouse_x < 610 && mouse_y > 560 && mouse_y < 640) {
                            that.matrix[i][j].freezed = false;
                            player.discard_pile.push(player.magic_pile.pop());
                            player.discard_pile.push(player.magic_pile.pop());
                            mouse_state = 2;
                            socket.emit('TO_unfreeze_event', { room_name: room_name, freezed_card_id: that.matrix[i][j].id });
                            parent.animations.push(new parent.Animation(12));
                            return;
                        }
                        //FIRE BLAST - PE 
                    } else if (that.matrix[i][j].name === 'Prince Elien' && your_turn) {

                        if ((mouse_state === 1) && mouse_x > 447 && mouse_x < 577 && mouse_y > 495 && mouse_y < 545) {
                            that.matrix[i][j].power_active = !that.matrix[i][j].power_active;

                            if (that.matrix[i][j].power_active) {
                                that.matrix[i][j].precise = true;
                                that.matrix[i][j].range = 2;
                                that.matrix[i][j].attack = 2;
                            } else {
                                that.matrix[i][j].precise = false;
                                that.matrix[i][j].range = 3;
                                that.matrix[i][j].attack = 3;
                            }

                            mouse_state = 2;
                            return;
                        }
                        //BREATH OF FLAME - PE 
                    } else if (that.matrix[i][j].name === 'Fire Drake' && your_turn) {

                        if ((mouse_state === 1) && mouse_x > 447 && mouse_x < 577 && mouse_y > 495 && mouse_y < 545) {
                            that.matrix[i][j].power_active = !that.matrix[i][j].power_active;

                            if (that.matrix[i][j].power_active) {
                                that.matrix[i][j].precise = true;
                                that.matrix[i][j].range = 3;
                                that.matrix[i][j].attack = 1;
                            } else {
                                that.matrix[i][j].precise = false;
                                that.matrix[i][j].range = 1;
                                that.matrix[i][j].attack = 3;
                            }

                            mouse_state = 2;
                            return;
                        }
                        //WALLS OF ICE SHARD - TO 
                    } else if (that.matrix[i][j].name === 'Grognack' && !that.matrix[i][j].attacked && your_turn && game_phase === 4 && !that.matrix[i][j].freezed) {

                        var use_button_xywh = [437, 450, 150, 100];

                        //check hover
                        if ((mouse_state === 1) &&
                            (mouse_x > use_button_xywh[0]) &&
                            (mouse_x < use_button_xywh[0] + use_button_xywh[2]) &&
                            (mouse_y > use_button_xywh[1]) &&
                            (mouse_y < use_button_xywh[1] + use_button_xywh[3])) {

                            that.matrix[i][j].draw_big_picture = false;
                            parent.draw_big_picture = false;


                            var dice_roll = Math.floor((Math.random() * 6) + 1);
                            console.log("Dice roll: " + dice_roll);
                            that.handleWallsOfIceShards(dice_roll);
                            //send event to your opponent
                            socket.emit('TO_walls_of_ice_shards', { room_name: room_name, dice_roll: dice_roll });

                            player.attacks_left--;
                            that.matrix[i][j].attacked = true;
                            mouse_state = 2;
                            return;
                        }

                    }
                }
            }


            //check if player wants to unselect focused card
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].draw_big_picture === true)) {
                        if (mouse_state === 1) {
                            that.matrix[i][j].draw_big_picture = false;
                            parent.draw_big_picture = false;
                            mouse_state = 2;
                        }
                        return;
                    }
                }
            }

            var new_card_selected = false;

            //rest functonality described above
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if (that.matrix[i][j] != null && !that.matrix[i][j].dying) {

                        //check if mouse is over card
                        if ((mouse_x > that.s_x + (j * that.square_w)) &&
                            (mouse_x < that.s_x + (j * that.square_w) + that.square_w) &&
                            (mouse_y > that.s_y + (i * that.square_h)) &&
                            (mouse_y < that.s_y + (i * that.square_h) + that.square_h)) {

                            that.matrix[i][j].hover = true;

                            //check if player wish to select this card
                            if ((mouse_state === 1) && that.matrix[i][j].selected === false) {
                                that.matrix[i][j].selected = true;
                                parent.hand.unselectAll();
                                new_card_selected = true;
                            }
                                //check if player click eyeglass (20x20px in the middle of the card)
                            else if (that.matrix[i][j].selected &&
                                (mouse_state === 1) &&
                                (mouse_x > ((that.s_x + (j * that.square_w) + (that.square_w / 2))) - 15) &&
                                (mouse_x < ((that.s_x + (j * that.square_w) + (that.square_w / 2))) + 15) &&
                                (mouse_y > ((that.s_y + (i * that.square_h) + (that.square_h / 2))) - 15) &&
                                (mouse_y < ((that.s_y + (i * that.square_h) + (that.square_h / 2))) + 15)) {
                                that.matrix[i][j].draw_big_picture = true;
                                parent.draw_big_picture = true;
                                mouse_state = 2;
                            }
                        }
                        else {

                            that.matrix[i][j].hover = false;

                            //check id player wish to deselect card
                            if (mouse_state === 1) {
                                that.matrix[i][j].selected = false;
                                that.matrix[i][j].draw_big_picture = false;
                            }
                        }

                    }
                }
            }

            if (new_card_selected)
                mouse_state = 2;
        }

        that.handleDyingCards = function () {

            if (parent.draw_big_picture_from_hand || parent.draw_big_picture)
                return;

            //step frames for all dying card on a board
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if (that.matrix[i][j] != null && that.matrix[i][j].dying) {

                        that.matrix[i][j].cnt++;
                        if (that.matrix[i][j].cnt > 100)
                            that.matrix[i][j].alpha -= 0.005;

                        //check if any card is permanently dead
                        if (that.matrix[i][j].alpha <= 0) {

                            //add magic for proper player
                            if (that.matrix[i][j].killed_by == player.name)
                                player.magic_pile.push(that.matrix[i][j]);
                            else
                                opponent.magic_pile.push(that.matrix[i][j]);

                            //remove card from board
                            that.matrix[i][j] = null;
                        }
                    }
                }
            }
        }

        that.draw = function () {

            ctx.fillStyle = "rgba(233, 233, 233, 0.3)";

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if (that.matrix[i][j] != null) {

                        //handles dying cards
                        if (that.matrix[i][j].dying) {
                            ctx.save();
                            ctx.globalAlpha = that.matrix[i][j].alpha;
                        }

                        //check card owner in order to load proper faction image
                        if (that.matrix[i][j].original_owner === player.name)
                            //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
                            ctx.drawImage(player.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].board_w, (2 * that.matrix[i][j].height) + (that.matrix[i][j].pos_y * that.matrix[i][j].board_h),
                                that.matrix[i][j].board_w, that.matrix[i][j].board_h, that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                        else if (that.matrix[i][j].original_owner === opponent.name) {
                            ctx.drawImage(opponent.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].board_w, (2 * that.matrix[i][j].height) + (that.matrix[i][j].pos_y * that.matrix[i][j].board_h),
                                that.matrix[i][j].board_w, that.matrix[i][j].board_h, that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                        }
                        else {
                            $("#dialog").text("Error: Card owner not found!");
                            $('#dialog').dialog('open');
                        }


                        //draw wounds on board
                        if (that.matrix[i][j].name != 'Wall' && that.matrix[i][j].name != 'Ice Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_src_x, that.sheet_origin + that.wounds_src_y, that.wounds_w, that.wounds_h, that.s_x + (j * that.square_w) + that.wounds_s_x + (k % 3 * that.hor_diff_between),
                                    that.s_y + (i * that.square_h) + that.wounds_s_y + (Math.floor(k / 3) * that.ver_diff_between), that.wounds_w, that.wounds_h);
                            }
                        } else if (that.matrix[i][j].name === 'Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_src_x, that.sheet_origin + that.wounds_src_y, that.wounds_w, that.wounds_h, that.s_x + (j * that.square_w) + 9 + (k * 13),
                                    that.s_y + (i * that.square_h) + 72, that.wounds_w, that.wounds_h);
                            }
                        } else if (that.matrix[i][j].name === 'Ice Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_src_x, that.sheet_origin + that.wounds_src_y, that.wounds_w, that.wounds_h, that.s_x + (j * that.square_w) + 14 + (k * 13),
                                    that.s_y + (i * that.square_h) + 70, that.wounds_w, that.wounds_h);
                            }
                        }

                        //draw hover
                        ctx.fillStyle = "rgba(233, 233, 233, 0.3)";
                        if (that.matrix[i][j].hover)
                            ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                        //draw freeze rectangle
                        ctx.fillStyle = "rgba(0, 169, 205, 0.5)";
                        if (that.matrix[i][j].freezed)
                            ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                        //draw eyeglass for selected card
                        if (that.matrix[i][j].selected) {
                            if (((mouse_x > ((that.s_x + (j * that.square_w) + (that.square_w / 2))) - 15) &&
                            (mouse_x < ((that.s_x + (j * that.square_w) + (that.square_w / 2))) + 15) &&
                            (mouse_y > ((that.s_y + (i * that.square_h) + (that.square_h / 2))) - 15) &&
                            (mouse_y < ((that.s_y + (i * that.square_h) + (that.square_h / 2))) + 15)) ||
                                that.matrix[i][j].draw_big_picture)
                                ctx.drawImage(parent.image, 0, that.sheet_origin, that.square_w, that.square_h, that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                            else
                                ctx.drawImage(parent.image, 130, that.sheet_origin, that.square_w, that.square_h, that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                        }

                        //handles dying cards
                        if (that.matrix[i][j].dying) {
                            ctx.restore();
                        }
                    }
                }

            }

            //draw card in big picture
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if (that.matrix[i][j] != null && that.matrix[i][j].draw_big_picture) {
                        ctx.fillStyle = "rgba(185, 185, 185, 0.6)";
                        ctx.fillRect(12, 12, width - 22, height - 22);

                        //check card owner in order to load proper faction image
                        if (that.matrix[i][j].original_owner === player.name)
                            ctx.drawImage(player.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].width, that.matrix[i][j].pos_y * that.matrix[i][j].height,
                                that.matrix[i][j].width, that.matrix[i][j].height, 329, 200, that.matrix[i][j].width, that.matrix[i][j].height);
                        else if (that.matrix[i][j].original_owner === opponent.name)
                            ctx.drawImage(opponent.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].width, that.matrix[i][j].pos_y * that.matrix[i][j].height,
                                that.matrix[i][j].width, that.matrix[i][j].height, 329, 200, that.matrix[i][j].width, that.matrix[i][j].height);

                        ctx.fillStyle = "rgba(0, 0, 0, 1)";
                        ctx.fillText('owner: ' + that.matrix[i][j].owner, 740, 520);
                        ctx.fillText('orig owner: ' + that.matrix[i][j].original_owner, 740, 530);
                        ctx.fillText('attacked: ' + that.matrix[i][j].attacked, 740, 540);
                        ctx.fillText('moves left: ' + that.matrix[i][j].moves_left, 740, 550);

                        //draw wounds
                        if (that.matrix[i][j].name != 'Wall' && that.matrix[i][j].name != 'Ice Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_big_src_x, that.sheet_origin + that.wounds_big_src_y, that.wounds_big_w, that.wounds_big_h, 329 + that.wounds_big_s_x + (k % 3 * that.hor_big_diff_between),
                                    200 + that.wounds_big_s_y + (Math.floor(k / 3) * that.ver_big_diff_between), that.wounds_big_w, that.wounds_big_h);
                            }
                        } else if (that.matrix[i][j].name === 'Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_big_src_x, that.sheet_origin + that.wounds_big_src_y, that.wounds_big_w, that.wounds_big_h, 355 + (k * 37), 398, that.wounds_big_w, that.wounds_big_h);
                            }
                        } else if (that.matrix[i][j].name === 'Ice Wall') {
                            for (var k = 0; k < that.matrix[i][j].wounds; k++) {
                                ctx.drawImage(parent.image, that.wounds_big_src_x, that.sheet_origin + that.wounds_big_src_y, that.wounds_big_w, that.wounds_big_h, 370 + (k * 37), 398, that.wounds_big_w, that.wounds_big_h);
                            }
                        }

                        //EVENTS ANIMATION HANDLING
                        //draw 'Spirit of the phoenix' animation
                        if (that.matrix[i][j].spirit_of_the_phoenix && !that.matrix[i][j].freezed)
                            ctx.drawImage(parent.image, 0, 1901, 650, 100, 350, 450, 325, 50);

                        //draw 'Freeze' animation
                        if (that.matrix[i][j].freezed) {
                            ctx.fillStyle = "rgba(0, 169, 205, 0.2)";
                            ctx.fillRect(329, 200, that.matrix[i][j].width, that.matrix[i][j].height);

                            if (that.matrix[i][j].freeze_card_ref.owner === player.name)
                                ctx.drawImage(player.faction.board_image, that.matrix[i][j].freeze_card_ref.pos_x * that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.pos_y * that.matrix[i][j].freeze_card_ref.height,
                                    that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.height, 530, 330, that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.height);
                            else if (that.matrix[i][j].freeze_card_ref.owner === opponent.name)
                                ctx.drawImage(opponent.faction.board_image, that.matrix[i][j].freeze_card_ref.pos_x * that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.pos_y * that.matrix[i][j].freeze_card_ref.height,
                                    that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.height, 530, 330, that.matrix[i][j].freeze_card_ref.width, that.matrix[i][j].freeze_card_ref.height);

                            //check if viewer is an owner of the card (for unfreeze purposes)
                            if (that.matrix[i][j].owner === player.name) {

                                //print proper "Unfreeze" animation according to hover state
                                if (player.magic_pile.length >= 2) {

                                    if (mouse_x > 415 && mouse_x < 610 && mouse_y > 560 && mouse_y < 640)
                                        ctx.drawImage(parent.image, 430, 2301, 215, 100, 405, 550, 215, 100);
                                    else
                                        ctx.drawImage(parent.image, 215, 2301, 215, 100, 405, 550, 215, 100);


                                } else {

                                    ctx.drawImage(parent.image, 0, 2301, 215, 100, 405, 550, 215, 100);

                                }
                            }

                        }

                        //ABILITIES HANDLING
                        //Fire Blast and //Breath of Flame
                        if ((that.matrix[i][j].name === 'Prince Elien' || that.matrix[i][j].name === 'Fire Drake') && your_turn && that.matrix[i][j].owner === player.name && !that.matrix[i][j].freezed) {

                            if (that.matrix[i][j].power_active) {
                                //draw disable
                                if (mouse_x > 447 && mouse_x < 577 && mouse_y > 495 && mouse_y < 545)
                                    ctx.drawImage(parent.image, 480, 2670, 160, 60, 432, 490, 160, 60);
                                else
                                    ctx.drawImage(parent.image, 320, 2670, 160, 60, 432, 490, 160, 60);
                            } else {
                                //draw enable
                                if (mouse_x > 447 && mouse_x < 577 && mouse_y > 495 && mouse_y < 545)
                                    ctx.drawImage(parent.image, 160, 2670, 160, 60, 432, 490, 160, 60);
                                else
                                    ctx.drawImage(parent.image, 0, 2670, 160, 60, 432, 490, 160, 60);
                            }
                            //Walls of Ice Shard
                        } else if (that.matrix[i][j].name === 'Grognack' && !that.matrix[i][j].attacked && your_turn && game_phase === 4 && that.matrix[i][j].owner === player.name && !that.matrix[i][j].freezed) {

                            var use_button_src_xywh = [0, 2101, 150, 100];
                            var use_button_xywh = [437, 450, 150, 100];

                            ctx.drawImage(parent.image, use_button_src_xywh[2], use_button_src_xywh[1], use_button_src_xywh[2], use_button_src_xywh[3], use_button_xywh[0], use_button_xywh[1], use_button_xywh[2], use_button_xywh[3]);

                            //check hover
                            if ((mouse_x > use_button_xywh[0]) &&
                                (mouse_x < use_button_xywh[0] + use_button_xywh[2]) &&
                                (mouse_y > use_button_xywh[1]) &&
                                (mouse_y < use_button_xywh[1] + use_button_xywh[3])) {

                                ctx.drawImage(parent.image, use_button_src_xywh[2] * 2, use_button_src_xywh[1], use_button_src_xywh[2], use_button_src_xywh[3], use_button_xywh[0], use_button_xywh[1], use_button_xywh[2], use_button_xywh[3]);
                            }
                        }
                    }
                }
            }
        }

        that.drawPreviousMoves = function () {

            /* selected card moves path should be drawn at the
            end in order to show whole path */
            card_selected = null; //indidcate if any card is selected
            sel_card_x = null;
            sel_card_y = null;

            for (var card_i = 0; card_i < that.matrix.length; card_i++) {
                for (var card_j = 0; card_j < that.matrix[card_i].length; card_j++) {

                    //draw previous moves
                    if (that.matrix[card_i][card_j] != null) {

                        //selected cards moves should be draw at the end
                        if (!that.matrix[card_i][card_j].selected) {

                            //handles dying cards
                            if (that.matrix[card_i][card_j].dying) {
                                ctx.save();
                                ctx.globalAlpha = that.matrix[card_i][card_j].alpha;
                            }

                            for (var k = 0; k < that.matrix[card_i][card_j].previous_moves.length; k++) {

                                if ((k + 1) === that.matrix[card_i][card_j].previous_moves.length) {
                                    /* This is last move - draw line from last position to current position */
                                    ctx.strokeStyle = '#003300';  // Purple path
                                    if (that.matrix[card_i][card_j].selected)
                                        ctx.strokeStyle = '#000000';  // Purple path
                                    ctx.lineWidth = "5";
                                    ctx.beginPath();
                                    ctx.moveTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2));
                                    ctx.lineTo(that.s_x + (card_j * that.square_w) + (that.square_w / 2), that.s_y + (card_i * that.square_h) + (that.square_h / 2));
                                    ctx.stroke();
                                } else {
                                    ctx.strokeStyle = '#003300';  // Purple path
                                    if (that.matrix[card_i][card_j].selected)
                                        ctx.strokeStyle = '#000000';  // Purple path
                                    ctx.lineWidth = "5";
                                    ctx.beginPath();
                                    ctx.moveTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2));
                                    ctx.lineTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k + 1][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k + 1][0] * that.square_h) + (that.square_h / 2));
                                    ctx.stroke();
                                }

                                ctx.beginPath();
                                ctx.arc(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2),
                                    that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2), 10, 0, 2 * Math.PI, false);
                                ctx.fillStyle = 'green';
                                ctx.fill();
                                ctx.lineWidth = 4;
                                ctx.strokeStyle = '#003300';
                                ctx.stroke();

                            }

                            //handles dying cards
                            if (that.matrix[card_i][card_j].dying) {
                                ctx.restore();
                            }
                        }
                        else {
                            //selected data should be store for further actions
                            sel_card_x = card_i;
                            sel_card_y = card_j;
                            card_selected = true;
                        }
                    }
                }
            }
            //if any card is selected its moves should be draw at the end (now)
            if (card_selected) {

                card_i = sel_card_x;
                card_j = sel_card_y;

                for (var k = 0; k < that.matrix[card_i][card_j].previous_moves.length; k++) {

                    if ((k + 1) === that.matrix[card_i][card_j].previous_moves.length) {
                        /* This is last move - draw line from last position to current position */
                        ctx.strokeStyle = '#003300';  // Purple path
                        ctx.lineWidth = "5";
                        ctx.beginPath();
                        ctx.moveTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2));
                        ctx.lineTo(that.s_x + (card_j * that.square_w) + (that.square_w / 2), that.s_y + (card_i * that.square_h) + (that.square_h / 2));
                        ctx.stroke();
                    } else {
                        ctx.strokeStyle = '#003300';  // Purple path
                        ctx.lineWidth = "5";
                        ctx.beginPath();
                        ctx.moveTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2));
                        ctx.lineTo(that.s_x + (that.matrix[card_i][card_j].previous_moves[k + 1][1] * that.square_w) + (that.square_w / 2), that.s_y + (that.matrix[card_i][card_j].previous_moves[k + 1][0] * that.square_h) + (that.square_h / 2));
                        ctx.stroke();
                    }

                    ctx.beginPath();
                    ctx.arc(that.s_x + (that.matrix[card_i][card_j].previous_moves[k][1] * that.square_w) + (that.square_w / 2),
                        that.s_y + (that.matrix[card_i][card_j].previous_moves[k][0] * that.square_h) + (that.square_h / 2), 10, 0, 2 * Math.PI, false);
                    ctx.fillStyle = 'orange';
                    ctx.fill();
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = '#003300';
                    ctx.stroke();

                }
            }
        }

        that.handleMoves = function () {


            var card_i = null;
            var card_j = null;

            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].selected)) {
                        card_i = i;
                        card_j = j;
                    }
                }
            }

            //if there is no selected card break function
            if ((card_i === null) || (card_j === null))
                return;

            //if draw in big picture is active break function
            if (that.matrix[card_i][card_j].draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            //if cards owner is not a player break function
            if (that.matrix[card_i][card_j].owner != player.name)
                return;

            //if card is freezed break function
            if (that.matrix[card_i][card_j].freezed)
                return;

            //draw available places
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //Wall cant moves 
                    if (that.matrix[card_i][card_j].name != 'Wall' && that.matrix[card_i][card_j].name != 'Ice Wall') {


                        if ((Math.abs(card_i - i) + Math.abs(card_j - j)) <= that.matrix[card_i][card_j].moves_left) {

                            //check if there is no blocking card in row
                            if ((Math.abs(card_j - j) === 2) && (that.matrix[i][j + ((card_j - j) / Math.abs(card_j - j))] != null)) {
                                continue;
                            }

                            //check if there is no blocking card in column
                            if ((Math.abs(card_i - i) === 2) && (that.matrix[i + ((card_i - i) / Math.abs(card_i - i))][j] != null)) {
                                continue;
                            }

                            //check if there is no blocking card diagonally
                            if ((Math.abs(Math.abs(card_i - i) === 1)) && (Math.abs(card_j - j) === 1)) {
                                if ((that.matrix[card_i - (card_i - i)][card_j] != null) && (that.matrix[card_i][card_j - (card_j - j)] != null)) {
                                    continue;
                                }
                            }

                            if ((parseInt((((mouse_x - that.s_x) / that.square_w))) === j) &&
                                (parseInt((((mouse_y - that.s_y) / that.square_h))) === i) &&
                                ((i != card_i) || (j != card_j)) &&
                                (that.matrix[i][j] === null)) {

                                //handle user input
                                if (mouse_state === 1) {

                                    //send move card event
                                    var dest_x = null;
                                    var dest_y = null;
                                    [dest_y, dest_x] = rotate180(j, i);
                                    var id = that.matrix[card_i][card_j].id;
                                    socket.emit('move_card', { room_name: room_name, card_id: id, dest_x: dest_x, dest_y: dest_y })

                                    //finally move card
                                    that.moveCard(that.matrix[card_i][card_j].id, i, j);
                                    mouse_state = 2;
                                    return;
                                }
                            }
                        }

                    }
                }
            }
        }

        that.drawAvailMoves = function () {


            var card_i = null;
            var card_j = null;

            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].selected)) {
                        card_i = i;
                        card_j = j;
                    }
                }
            }

            //if there is no selected card break function
            if ((card_i === null) || (card_j === null))
                return;

            //if draw in big picture is active break function
            if (that.matrix[card_i][card_j].draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            //if cards owner is not a player break function
            if (that.matrix[card_i][card_j].owner != player.name)
                return;

            //if card is freezed break function
            if (that.matrix[card_i][card_j].freezed)
                return;

            //draw available places
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //Wall cant moves 
                    if (that.matrix[card_i][card_j].name != 'Wall' && that.matrix[card_i][card_j].name != 'Ice Wall') {


                        if ((Math.abs(card_i - i) + Math.abs(card_j - j)) <= that.matrix[card_i][card_j].moves_left) {

                            //check if there is no blocking card in row
                            if ((Math.abs(card_j - j) === 2) && (that.matrix[i][j + ((card_j - j) / Math.abs(card_j - j))] != null)) {
                                continue;
                            }

                            //check if there is no blocking card in column
                            if ((Math.abs(card_i - i) === 2) && (that.matrix[i + ((card_i - i) / Math.abs(card_i - i))][j] != null)) {
                                continue;
                            }

                            //check if there is no blocking card diagonally
                            if ((Math.abs(Math.abs(card_i - i) === 1)) && (Math.abs(card_j - j) === 1)) {
                                if ((that.matrix[card_i - (card_i - i)][card_j] != null) && (that.matrix[card_i][card_j - (card_j - j)] != null)) {
                                    continue;
                                }
                            }

                            //highlight this tile if available (soft green)
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                            if ((parseInt((((mouse_x - that.s_x) / that.square_w))) === j) &&
                                (parseInt((((mouse_y - that.s_y) / that.square_h))) === i) &&
                                ((i != card_i) || (j != card_j)) &&
                                (that.matrix[i][j] === null)) {

                                //hover available tile (green)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                            }
                        }

                    }
                }
            }
        }

        that.handleAttacks = function () {

            if (parent.draw_big_picture_from_hand)
                return;

            //reset in_range indicator
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if (that.matrix[i][j] != null)
                        that.matrix[i][j].in_range = false;
                }
            }

            var card_i = null;
            var card_j = null;

            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].selected)) {
                        card_i = i;
                        card_j = j;
                    }
                }
            }

            //if there is no selected card break function
            if ((card_i === null) || (card_j === null))
                return;

            //if draw in big picture is active break function
            if (that.matrix[card_i][card_j].draw_big_picture)
                return;

            //if cards owner is not a player break function
            if (that.matrix[card_i][card_j].owner != player.name)
                return;

            //if card already attacked break function
            if (that.matrix[card_i][card_j].attacked)
                return;

            //if card is dying break function
            if (that.matrix[card_i][card_j].dying)
                return;

            //if card is freezed break function
            if (that.matrix[card_i][card_j].freezed)
                return;

            //if card is 'Fire Drake' redirect handling
            if (that.matrix[card_i][card_j].name === 'Fire Drake' && that.matrix[card_i][card_j].power_active) {

                var card_ref = that.matrix[card_i][card_j];
                card_ref.i = card_i;
                card_ref.j = card_j;

                that.handleFireBreath(card_ref);
                return;
            }


            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //check if card is not dying
                    if ((that.matrix[i][j] != null) && ((card_i != i) || (card_j != j)) && ((!that.matrix[i][j].dying))) {

                        //check if card is in horizontal range
                        if (((Math.abs(card_i - i) <= that.matrix[card_i][card_j].range)) && (card_j === j)) {

                            that.matrix[i][j].in_range = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_i - i) ; k++) {
                                if (that.matrix[card_i - (k * ((card_i - i) / (card_i - i)))][j] != null) {
                                    that.matrix[i][j].in_range = false;
                                }
                            }
                        }

                        //check if card is in vertical range
                        if (((Math.abs(card_j - j) <= that.matrix[card_i][card_j].range)) && (card_i === i)) {

                            that.matrix[i][j].in_range = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_j - j) ; k++) {
                                if (that.matrix[i][card_j - (k * ((card_j - j) / (card_j - j)))] != null) {
                                    that.matrix[i][j].in_range = false;
                                }
                            }
                        }

                        if (!that.matrix[i][j].in_range)
                            continue;

                        if (mouse_state === 1) {

                            if (
                                (mouse_x > (that.s_x + (j * that.square_w))) &&
                                (mouse_x < (that.s_x + (j * that.square_w) + that.square_w)) &&
                                (mouse_y > (that.s_y + (i * that.square_h))) &&
                                (mouse_y < (that.s_y + (i * that.square_h) + that.square_h))
                                ) {

                                var hits = 0;
                                for (var k = 0; k < that.matrix[card_i][card_j].attack; k++) {
                                    if (Math.floor((Math.random() * 6) + 1) > 2)
                                        hits++;
                                }


                                //'Precise' ability, 'Spirit of the phoenix' event and 'Sluggish' ability handling
                                if (that.matrix[card_i][card_j].precise || that.matrix[card_i][card_j].spirit_of_the_phoenix || that.matrix[i][j].name === "Smasher")
                                    hits = that.matrix[card_i][card_j].attack;

                                //'Unwieldy Magic' ability handling
                                if (that.matrix[card_i][card_j].name === "Shaman") {
                                    if (hits != that.matrix[card_i][card_j].attack)
                                        hits = 0;
                                }

                                //'Reckless' ability handling
                                if (that.matrix[card_i][card_j].name === "Blagog") {
                                    hits = 0;
                                    for (var k = 0; k < that.matrix[card_i][card_j].attack; k++) {
                                        if (Math.floor((Math.random() * 6) + 1) > 3)
                                            hits++;
                                    }
                                }

                                //'Reckless' ability handling
                                if (that.matrix[card_i][card_j].name === "Maelena") {
                                    if (hits > 0)
                                        hits++;
                                }

                                that.matrix[card_i][card_j].attacked = true;
                                mouse_state = 2;

                                if (that.matrix[card_i][card_j].name === "Krung") {

                                    var dice_roll = Math.floor((Math.random() * 6) + 1);

                                    that.handleWildSwing(dice_roll, that.matrix[card_i][card_j].id, hits);

                                    socket.emit('TO_wild_swing', { room_name: room_name, dice_roll: dice_roll, krung_id: that.matrix[card_i][card_j].id, hits: hits });

                                    if (dice_roll > 3) {
                                        //thats mean everything has been handled already
                                        return;
                                    }

                                }

                                socket.emit('resolve_attack', {
                                    room_name: room_name,
                                    hits: hits,
                                    attack_strangth: that.matrix[card_i][card_j].attack,
                                    attacking_card_id: that.matrix[card_i][card_j].id,
                                    hitted_card_id: that.matrix[i][j].id
                                });

                                that.resolveAttack(hits, that.matrix[card_i][card_j].attack, that.matrix[card_i][card_j].id, that.matrix[i][j].id);
                            }
                        }
                    }
                }
            }
        }

        that.drawAvailAttacks = function () {

            //draw available attacks
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && that.matrix[i][j].in_range) {

                        if (that.matrix[i][j].owner === player_login)
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            //ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                        else
                            ctx.fillStyle = "rgba(216, 25, 0, 0.4)";

                        ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                    }

                }
            }
        }

        that.drawAvailSummonTails = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var mouse_over_board = false; //indicate if mouse is over board
            var hovered_tile = [0, 0]; //stores point coordinates


            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            if (mouse_over_board) {

                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);

                ctx.fillText("hovered_tile_x: " + hovered_tile[0], 840, 580);
                ctx.fillText("hovered_tile_y: " + hovered_tile[1], 840, 590);

            }

            //find selected card in container and trigger appropriate rendering actions
            for (var i = 0; i < parent.hand.card_container.length; i++) {

                //highlights available tiles for card which meet the following requirements:
                // - it is selected
                // - it is unit (range > 0)
                // - player has enought magic points
                // - is not a Wall
                if (parent.hand.card_container[i].selected && parent.hand.card_container[i].range > 0 && parent.hand.card_container[i].cost <= player.magic_pile.length && parent.hand.card_container[i].name != "Wall") {

                    for (var j = 0; j < that.matrix.length; j++) {
                        for (var k = 0; k < that.matrix[j].length; k++) {

                            if ((that.matrix[j][k] != null) && (that.matrix[j][k].name === "Wall" || that.matrix[j][k].name === "Ice Wall") && (that.matrix[j][k].owner === player.name)) {

                                //mark green tiles adjacent to Wall, additional check if tile is not out of board
                                if (that.matrix[j + 1][k] === null && (j + 1) <= 8) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j + 1) * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j + 1))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j - 1][k] === null && (j - 1) >= 0) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j - 1) * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j - 1))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j][k + 1] === null && (k + 1) <= 6) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + ((k + 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k + 1) && (hovered_tile[1] === j))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j][k - 1] === null && (k - 1) >= 0) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + ((k - 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k - 1) && (hovered_tile[1] === j))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                            }
                        }
                    }
                }
            }
        }

        that.handleSummon = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var mouse_over_board = false; //indicate if mouse is over board

            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            var selected_card_ref = null; //selected card in a hand


            //Get ref card which meet the following requirements:
            // - it is selected
            // - it is unit (range > 0)
            // - player has enought magic points
            // - is not a Wall
            for (var i = 0; i < parent.hand.card_container.length; i++) {

                if (parent.hand.card_container[i].selected && parent.hand.card_container[i].range > 0 && parent.hand.card_container[i].cost <= player.magic_pile.length && parent.hand.card_container[i].name != "Wall") {
                    selected_card_ref = parent.hand.card_container[i];
                    break;
                }
            }

            var hovered_tile = [0, 0]; //stores point coordinates

            if (mouse_over_board && selected_card_ref != null && mouse_state === 1) {


                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);

                if ((parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1] != null && (parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].name === "Wall" || parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].name === "Ice Wall") && parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1] != null && (parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].name === "Wall" || parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].name === "Ice Wall") && parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]] != null && (parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].name === "Wall" || parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].name === "Ice Wall") && parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]] != null && (parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].name === "Wall" || parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].name === "Ice Wall") && parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].owner === player.name)
                    ) {

                    //add to board
                    that.addCard(selected_card_ref, hovered_tile[0], hovered_tile[1]);
                    mouse_state = 2;

                    for (var i = 0; i < selected_card_ref.cost; i++) {
                        player.discard_pile.push(player.magic_pile.pop());
                    }

                    var card_x = null;
                    var card_y = null;
                    console.log('hovered_tile[1] ' + hovered_tile[1] + ' hovered_tile[0] ' + hovered_tile[0]);
                    [card_y, card_x] = rotate180(hovered_tile[0], hovered_tile[1]);
                    console.log('card_y ' + card_y + ' card_x ' + card_x);
                    socket.emit('summon_card', { room_name: room_name, summoned_card_id: selected_card_ref.id, card_x: card_x, card_y: card_y });

                    //remove from hand
                    parent.hand.unselectAll();
                    parent.hand.removeCard(selected_card_ref);
                }
            }

        }

        that.drawAvailSummonTailsReinforcementsPhase = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            if (player.reinforcement_cnt <= 0)
                return;

            var mouse_over_board = false; //indicate if mouse is over board
            var hovered_tile = [0, 0]; //stores point coordinates


            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            if (mouse_over_board) {

                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);
            }

            //find selected card in container and trigger appropriate rendering actions
            for (var i = 0; i < parent.hand.card_container.length; i++) {

                //highlights available tiles for card which meet the following requirements:
                // - it is selected
                // - it is common card
                if (parent.hand.card_container[i].selected && parent.hand.card_container[i].card_class === 'common') {

                    for (var j = 0; j < that.matrix.length; j++) {
                        for (var k = 0; k < that.matrix[j].length; k++) {

                            if ((that.matrix[j][k] != null) && (that.matrix[j][k].name === "Wall" || that.matrix[j][k].name === "Ice Wall") && (that.matrix[j][k].owner === player.name)) {


                                //mark green tiles adjacent to Wall, additional check if tile is not out of board
                                if (that.matrix[j + 1][k] === null && (j + 1) <= 8) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j + 1) * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j + 1))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j - 1][k] === null && (j - 1) >= 0) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j - 1) * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j - 1))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j][k + 1] === null && (k + 1) <= 6) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + ((k + 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k + 1) && (hovered_tile[1] === j))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                                if (that.matrix[j][k - 1] === null && (k - 1) >= 0) {
                                    ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                    ctx.fillRect(that.s_x + ((k - 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                    ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                    if (mouse_over_board && (hovered_tile[0] === k - 1) && (hovered_tile[1] === j))
                                        ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                }
                            }
                        }
                    }
                }
            }
        }

        that.handleSummonReinforcementsPhase = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            if (player.reinforcement_cnt <= 0)
                return;

            var mouse_over_board = false; //indicate if mouse is over board

            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            var selected_card_ref = null; //selected card in a hand


            //Get ref card which meet the following requirements:
            // - it is selected
            // - it is common unit card
            for (var i = 0; i < parent.hand.card_container.length; i++) {

                if (parent.hand.card_container[i].selected && parent.hand.card_container[i].card_class === 'common') {
                    selected_card_ref = parent.hand.card_container[i];
                    break;
                }
            }

            var hovered_tile = [0, 0]; //stores point coordinates

            if (mouse_over_board && selected_card_ref != null && mouse_state === 1) {


                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);

                if ((parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1] != null && (parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].name === "Wall" || parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].name === "Ice Wall") && parent.board.matrix[hovered_tile[1]][hovered_tile[0] - 1].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1] != null && (parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].name === "Wall" || parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].name === "Ice Wall") && parent.board.matrix[hovered_tile[1]][hovered_tile[0] + 1].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]] != null && (parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].name === "Wall" || parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].name === "Ice Wall") && parent.board.matrix[hovered_tile[1] + 1][hovered_tile[0]].owner === player.name) ||
                    (parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]] != null && (parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].name === "Wall" || parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].name === "Ice Wall") && parent.board.matrix[hovered_tile[1] - 1][hovered_tile[0]].owner === player.name)
                    ) {

                    //add to board
                    that.addCard(selected_card_ref, hovered_tile[0], hovered_tile[1]);
                    mouse_state = 2;

                    //decrement reinforcement counter
                    player.reinforcement_cnt--;

                    var card_x = null;
                    var card_y = null;
                    console.log('hovered_tile[1] ' + hovered_tile[1] + ' hovered_tile[0] ' + hovered_tile[0]);
                    [card_y, card_x] = rotate180(hovered_tile[0], hovered_tile[1]);
                    console.log('card_y ' + card_y + ' card_x ' + card_x);
                    socket.emit('summon_card', { room_name: room_name, summoned_card_id: selected_card_ref.id, card_x: card_x, card_y: card_y });

                    //remove from hand
                    parent.hand.unselectAll();
                    parent.hand.removeCard(selected_card_ref);
                }
            }

        }

        that.drawBlazeStepAvailTails = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var mouse_over_board = false; //indicate if mouse is over board
            var hovered_tile = [0, 0]; //stores point coordinates

            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            if (mouse_over_board) {
                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);
            }

            for (var m = 0; m < that.matrix.length; m++) {
                for (var n = 0; n < that.matrix[m].length; n++) {

                    if ((that.matrix[m][n] != null) && (that.matrix[m][n].name === "Warrior") && (that.matrix[m][n].selected)) {

                        for (var j = 0; j < that.matrix.length; j++) {
                            for (var k = 0; k < that.matrix[j].length; k++) {

                                if ((that.matrix[j][k] != null) && (that.matrix[j][k].name === "Wall") && (that.matrix[j][k].owner === player.name)) {


                                    //mark green tiles adjacent to Wall, additional check if tile is not out of board
                                    if (that.matrix[j + 1][k] === null && (j + 1) <= 8) {
                                        ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                        ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j + 1) * that.square_h), that.square_w, that.square_h);

                                        ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                        if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j + 1))
                                            ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                    }
                                    if (that.matrix[j - 1][k] === null && (j - 1) >= 0) {
                                        ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                        ctx.fillRect(that.s_x + (k * that.square_w), that.s_y + ((j - 1) * that.square_h), that.square_w, that.square_h);

                                        ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                        if (mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j - 1))
                                            ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                    }
                                    if (that.matrix[j][k + 1] === null && (k + 1) <= 6) {
                                        ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                        ctx.fillRect(that.s_x + ((k + 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                        ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                        if (mouse_over_board && (hovered_tile[0] === k + 1) && (hovered_tile[1] === j))
                                            ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                    }
                                    if (that.matrix[j][k - 1] === null && (k - 1) >= 0) {
                                        ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                                        ctx.fillRect(that.s_x + ((k - 1) * that.square_w), that.s_y + (j * that.square_h), that.square_w, that.square_h);

                                        ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                        if (mouse_over_board && (hovered_tile[0] === k - 1) && (hovered_tile[1] === j))
                                            ctx.fillRect(that.s_x + (hovered_tile[0] * that.square_w), that.s_y + (hovered_tile[1] * that.square_h), that.square_w, that.square_h);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        that.handleBlazeStepPhase = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var mouse_over_board = false; //indicate if mouse is over board
            var hovered_tile = [0, 0]; //stores point coordinates

            if ((mouse_x > that.s_x) &&
                (mouse_x < that.s_x + (6 * that.square_w)) &&
                (mouse_y > that.s_y) &&
                (mouse_y < that.s_y + (8 * that.square_h)))
                mouse_over_board = true;

            if (mouse_over_board) {
                hovered_tile[0] = parseInt((mouse_x - that.s_x) / that.square_w);
                hovered_tile[1] = parseInt((mouse_y - that.s_y) / that.square_h);
            }

            for (var m = 0; m < that.matrix.length; m++) {
                for (var n = 0; n < that.matrix[m].length; n++) {

                    if ((that.matrix[m][n] != null) && (that.matrix[m][n].name === "Warrior") && (that.matrix[m][n].selected)) {

                        for (var j = 0; j < that.matrix.length; j++) {
                            for (var k = 0; k < that.matrix[j].length; k++) {

                                if ((that.matrix[j][k] != null) && (that.matrix[j][k].name === "Wall") && (that.matrix[j][k].owner === player.name)) {

                                    //mark green tiles adjacent to Wall, additional check if tile is not out of board
                                    if ((that.matrix[j + 1][k] === null) && ((j + 1) <= 8) && mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j + 1) && (mouse_state === 1)) {
                                        that.matrix[m][n].selected = false;
                                        parent.animations.push(new parent.Animation(17, null, null, null, null, k, j + 1))
                                        that.addCard(that.matrix[m][n], k, j + 1);
                                        [k, j] = rotate180(k, j + 1);
                                        socket.emit('PE_blaze_step', { room_name: room_name, card_id: that.matrix[m][n].id, x: k, y: j });
                                        that.matrix[m][n] = null;
                                        mouse_state = 2;
                                        return;
                                    }
                                    if (that.matrix[j - 1][k] === null && (j - 1) >= 0 && mouse_over_board && (hovered_tile[0] === k) && (hovered_tile[1] === j - 1) && (mouse_state === 1)) {
                                        that.matrix[m][n].selected = false;
                                        parent.animations.push(new parent.Animation(17, null, null, null, null, k, j - 1))
                                        that.addCard(that.matrix[m][n], k, j - 1);
                                        [k, j] = rotate180(k, j - 1);
                                        socket.emit('PE_blaze_step', { room_name: room_name, card_id: that.matrix[m][n].id, x: k, y: j });
                                        that.matrix[m][n] = null;
                                        mouse_state = 2;
                                        return;
                                    }
                                    if (that.matrix[j][k + 1] === null && (k + 1) <= 6 && mouse_over_board && (hovered_tile[0] === k + 1) && (hovered_tile[1] === j) && (mouse_state === 1)) {
                                        that.matrix[m][n].selected = false;
                                        parent.animations.push(new parent.Animation(17, null, null, null, null, k + 1, j))
                                        that.addCard(that.matrix[m][n], k + 1, j);
                                        [k, j] = rotate180(k + 1, j);
                                        socket.emit('PE_blaze_step', { room_name: room_name, card_id: that.matrix[m][n].id, x: k, y: j });
                                        that.matrix[m][n] = null;
                                        mouse_state = 2;
                                        return;
                                    }
                                    if (that.matrix[j][k - 1] === null && (k - 1) >= 0 && mouse_over_board && (hovered_tile[0] === k - 1) && (hovered_tile[1] === j) && (mouse_state === 1)) {
                                        that.matrix[m][n].selected = false;
                                        parent.animations.push(new parent.Animation(17, null, null, null, null, k - 1, j))
                                        that.addCard(that.matrix[m][n], k - 1, j);
                                        [k, j] = rotate180(k - 1, j);
                                        socket.emit('PE_blaze_step', { room_name: room_name, card_id: that.matrix[m][n].id, x: k, y: j });
                                        that.matrix[m][n] = null;
                                        mouse_state = 2;
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        that.handleFuryPhaseLogic = function () {

            var card_ref = null;

            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //reset in_range indicator
                    if (that.matrix[i][j] != null)
                        that.matrix[i][j].in_range = false;

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].selected) && that.matrix[i][j].is_fury_active && that.matrix[i][j].owner === player.name) {

                        card_ref = that.matrix[i][j];

                        //type modification - add two new attributes
                        card_ref.x = i;
                        card_ref.y = j;
                    }
                }
            }

            //check some restrictions
            if (card_ref === null || card_ref.freezed || parent.draw_big_picture || parent.draw_big_picture_from_hand || card_ref.dying || card_ref.attacked)
                return;

            //handle attacks
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //check if card is not dying
                    if ((that.matrix[i][j] != null) && ((card_ref.x != i) || (card_ref.y != j)) && ((!that.matrix[i][j].dying))) {

                        //check if card is in horizontal range
                        if (((Math.abs(card_ref.x - i) <= card_ref.range)) && (card_ref.y === j)) {

                            that.matrix[i][j].in_range = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_ref.x - i) ; k++) {
                                if (that.matrix[card_ref.x - (k * ((card_ref.x - i) / (card_ref.x - i)))][j] != null) {
                                    that.matrix[i][j].in_range = false;
                                }
                            }
                        }

                        //check if card is in vertical range
                        if (((Math.abs(card_ref.y - j) <= card_ref.range)) && (card_ref.x === i)) {

                            that.matrix[i][j].in_range = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_ref.y - j) ; k++) {
                                if (that.matrix[i][card_ref.y - (k * ((card_ref.y - j) / (card_ref.y - j)))] != null) {
                                    that.matrix[i][j].in_range = false;
                                }
                            }
                        }

                        if (!that.matrix[i][j].in_range)
                            continue;

                        if (mouse_state === 1) {

                            if (
                                (mouse_x > (that.s_x + (j * that.square_w))) &&
                                (mouse_x < (that.s_x + (j * that.square_w) + that.square_w)) &&
                                (mouse_y > (that.s_y + (i * that.square_h))) &&
                                (mouse_y < (that.s_y + (i * that.square_h) + that.square_h))
                                ) {

                                var hits = 0;
                                for (var k = 0; k < card_ref.attack; k++) {
                                    if (Math.floor((Math.random() * 6) + 1) > 2)
                                        hits++;
                                }

                                card_ref.attacked = true;
                                mouse_state = 2;
                                card_ref.is_fury_active = false;

                                socket.emit('resolve_attack', {
                                    room_name: room_name,
                                    hits: hits,
                                    attack_strangth: card_ref.attack,
                                    attacking_card_id: card_ref.id,
                                    hitted_card_id: that.matrix[i][j].id
                                });

                                that.resolveAttack(hits, card_ref.attack, card_ref.id, that.matrix[i][j].id);
                            }
                        }
                    }
                }
            }

            //handle moves
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //draw available moves
                    if (that.matrix[i][j] === null && (Math.abs(card_ref.x - i) + Math.abs(card_ref.y - j)) <= card_ref.moves_left) {

                        //check if there is no blocking card in row
                        if ((Math.abs(card_ref.y - j) === 2) && (that.matrix[i][j + ((card_ref.y - j) / Math.abs(card_ref.y - j))] != null)) {
                            continue;
                        }

                        //check if there is no blocking card in column
                        if ((Math.abs(card_ref.x - i) === 2) && (that.matrix[i + ((card_ref.x - i) / Math.abs(card_ref.x - i))][j] != null)) {
                            continue;
                        }

                        //check if there is no blocking card diagonally
                        if ((Math.abs(Math.abs(card_ref.x - i) === 1)) && (Math.abs(card_ref.y - j) === 1)) {
                            if ((that.matrix[card_ref.x - (card_ref.x - i)][card_ref.y] != null) && (that.matrix[card_ref.x][card_ref.y - (card_ref.y - j)] != null)) {
                                continue;
                            }
                        }

                        if (mouse_state === 1) {

                            //hover available tile (green)
                            if ((parseInt((((mouse_x - that.s_x) / that.square_w))) === j) &&
                                (parseInt((((mouse_y - that.s_y) / that.square_h))) === i) &&
                                ((i != card_ref.x) || (j != card_ref.y))) {

                                //handle user input


                                //send move card event
                                var dest_x = null;
                                var dest_y = null;
                                [dest_y, dest_x] = rotate180(j, i);
                                socket.emit('move_card', { room_name: room_name, card_id: card_ref.id, dest_x: dest_x, dest_y: dest_y })

                                //finally move card
                                that.moveCard(card_ref.id, i, j);
                                mouse_state = 2;
                                return;
                            }

                        }

                    }
                }
            }

        }

        that.handleFuryPhaseRender = function () {

            var card_ref = null;

            //get selected card coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].selected) && that.matrix[i][j].is_fury_active && that.matrix[i][j].owner === player.name) {

                        card_ref = that.matrix[i][j];

                        //type modification - add two new attributes
                        card_ref.x = i;
                        card_ref.y = j;
                    }
                }
            }

            //check some restrictions
            if (card_ref === null || card_ref.freezed || parent.draw_big_picture || parent.draw_big_picture_from_hand || card_ref.dying || card_ref.attacked)
                return;


            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //draw available moves
                    if (that.matrix[i][j] === null && (Math.abs(card_ref.x - i) + Math.abs(card_ref.y - j)) <= card_ref.moves_left) {

                        //check if there is no blocking card in row
                        if ((Math.abs(card_ref.y - j) === 2) && (that.matrix[i][j + ((card_ref.y - j) / Math.abs(card_ref.y - j))] != null)) {
                            continue;
                        }

                        //check if there is no blocking card in column
                        if ((Math.abs(card_ref.x - i) === 2) && (that.matrix[i + ((card_ref.x - i) / Math.abs(card_ref.x - i))][j] != null)) {
                            continue;
                        }

                        //check if there is no blocking card diagonally
                        if ((Math.abs(Math.abs(card_ref.x - i) === 1)) && (Math.abs(card_ref.y - j) === 1)) {
                            if ((that.matrix[card_ref.x - (card_ref.x - i)][card_ref.y] != null) && (that.matrix[card_ref.x][card_ref.y - (card_ref.y - j)] != null)) {
                                continue;
                            }
                        }

                        //highlight this tile if available (soft green)
                        ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                        ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                        //hover available tile (green)
                        if ((parseInt((((mouse_x - that.s_x) / that.square_w))) === j) &&
                            (parseInt((((mouse_y - that.s_y) / that.square_h))) === i) &&
                            ((i != card_ref.x) || (j != card_ref.y))) {

                            ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                            ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                        }

                    } else if ((that.matrix[i][j] != null) && that.matrix[i][j].in_range) {

                        //draw available attacks
                        if (that.matrix[i][j].owner === player_login)
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                        else
                            ctx.fillStyle = "rgba(216, 25, 0, 0.4)";

                        ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                    }
                }
            }
        }

        that.handleWallsOfIceShards = function (dice_roll) {

            var impacted_cards_by_ids = [];

            if (dice_roll > 3) {

                //get name of player that has Tundra Orcs deck
                var to_player_ref = null;

                if (your_turn)
                    to_player_ref = player;
                else
                    to_player_ref = opponent;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        var card_ref = null;

                        if (parent.board.matrix[i][j] === null)
                            continue;

                        if (parent.board.matrix[i][j].owner != to_player_ref.name) {

                            if (((j + 1) < 6) && parent.board.matrix[i][j + 1] != null && (parent.board.matrix[i][j + 1].name === "Wall" || parent.board.matrix[i][j + 1].name === "Ice Wall") && parent.board.matrix[i][j + 1].owner === to_player_ref.name) {
                                parent.board.matrix[i][j].wounds += 1;
                                impacted_cards_by_ids.push(parent.board.matrix[i][j].id);
                            }
                            else if (((j - 1) >= 0) && parent.board.matrix[i][j - 1] != null && (parent.board.matrix[i][j - 1].name === "Wall" || parent.board.matrix[i][j - 1].name === "Ice Wall") && parent.board.matrix[i][j - 1].owner === to_player_ref.name) {
                                parent.board.matrix[i][j].wounds += 1;
                                impacted_cards_by_ids.push(parent.board.matrix[i][j].id);
                            }
                            else if (((i + 1) < 8) && parent.board.matrix[i + 1][j] != null && (parent.board.matrix[i + 1][j].name === "Wall" || parent.board.matrix[i + 1][j].name === "Ice Wall") && parent.board.matrix[i + 1][j].owner === to_player_ref.name) {
                                parent.board.matrix[i][j].wounds += 1;
                                impacted_cards_by_ids.push(parent.board.matrix[i][j].id);
                            }
                            else if (((i - 1) >= 0) && parent.board.matrix[i - 1][j] != null && (parent.board.matrix[i - 1][j].name === "Wall" || parent.board.matrix[i - 1][j].name === "Ice Wall") && parent.board.matrix[i - 1][j].owner === to_player_ref.name) {
                                parent.board.matrix[i][j].wounds += 1;
                                impacted_cards_by_ids.push(parent.board.matrix[i][j].id);
                            }

                        }

                        if (parent.board.matrix[i][j].wounds >= parent.board.matrix[i][j].lives) {
                            parent.board.matrix[i][j].wounds = parent.board.matrix[i][j].lives; //only for displaying purpose
                            parent.board.matrix[i][j].killed_by = to_player_ref.name; //store card killer name
                            parent.board.matrix[i][j].dying = true;
                            parent.board.matrix[i][j].hover = false;
                            parent.board.matrix[i][j].selected = false;

                            //handle GAME OVER
                            if ((parent.board.matrix[i][j].id) === 'pe31' && (parent.board.matrix[i][j].owner === player.name)) {
                                socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                            }
                            else if ((parent.board.matrix[i][j].id) === 'to25' && (parent.board.matrix[i][j].owner === player.name)) {
                                socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                            }

                        }

                    }
                }

                parent.animations.push(new parent.Animation(19, null, null, null, null, null, null, { imp_cards_list: impacted_cards_by_ids, dice_roll: dice_roll }));

            }
            else {
                parent.animations.push(new parent.Animation(19, null, null, null, null, null, null, { imp_cards_list: impacted_cards_by_ids, dice_roll: dice_roll }));

            }
        }

        that.handleWildSwing = function (dice_roll, krung_id, hits) {

            var impacted_cards_by_ids = [];

            //get name of player that has Tundra Orcs deck
            var to_player_ref = null;

            if (your_turn)
                to_player_ref = player;
            else
                to_player_ref = opponent;

            if (dice_roll > 3) {

                for (var i = 0; i < that.matrix.length; i++) {
                    for (var j = 0; j < that.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null)
                            continue;

                        if (((j + 1) < 6) && that.matrix[i][j + 1] != null && that.matrix[i][j + 1].id === krung_id) {
                            that.matrix[i][j].wounds += hits;
                            impacted_cards_by_ids.push(that.matrix[i][j].id);
                        }
                        else if (((j - 1) >= 0) && that.matrix[i][j - 1] != null && that.matrix[i][j - 1].id === krung_id) {
                            that.matrix[i][j].wounds += hits;
                            impacted_cards_by_ids.push(that.matrix[i][j].id);
                        }
                        else if (((i + 1) < 8) && that.matrix[i + 1][j] != null && that.matrix[i + 1][j].id === krung_id) {
                            that.matrix[i][j].wounds += hits;
                            impacted_cards_by_ids.push(that.matrix[i][j].id);
                        }
                        else if (((i - 1) >= 0) && that.matrix[i - 1][j] != null && that.matrix[i - 1][j].id === krung_id) {
                            that.matrix[i][j].wounds += hits;
                            impacted_cards_by_ids.push(that.matrix[i][j].id);
                        }

                        if (that.matrix[i][j].wounds >= that.matrix[i][j].lives) {
                            that.matrix[i][j].wounds = that.matrix[i][j].lives; //only for displaying purpose
                            that.matrix[i][j].killed_by = to_player_ref.name; //store card killer name
                            that.matrix[i][j].dying = true;
                            that.matrix[i][j].hover = false;
                            that.matrix[i][j].selected = false;

                            //handle GAME OVER
                            if ((that.matrix[i][j].id) === 'pe31' && (that.matrix[i][j].owner === player.name)) {
                                socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                            }
                            else if ((that.matrix[i][j].id) === 'to25' && (that.matrix[i][j].owner === player.name)) {
                                socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                            }
                        }
                    }
                }

                parent.animations.push(new parent.Animation(1, hits, 3));
                parent.animations.push(new parent.Animation(20, null, null, null, null, null, null, { imp_cards_list: impacted_cards_by_ids, dice_roll: dice_roll }));

            } else {

                parent.animations.push(new parent.Animation(20, null, null, null, null, null, null, { imp_cards_list: impacted_cards_by_ids, dice_roll: dice_roll }));
            }

        }

        that.handleFireBreath = function (card_ref) {

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    //check if card is not dying
                    if ((that.matrix[i][j] != null) && ((card_ref.i != i) || (card_ref.j != j)) && ((!that.matrix[i][j].dying))) {

                        //check if card is in horizontal range
                        var hor_diff = card_ref.i - i;
                        if ((Math.abs(hor_diff) <= card_ref.range) && (card_ref.j === j)) {
                            that.matrix[i][j].in_range = true;
                        }

                        //check if card is in vertical range
                        var ver_diff = card_ref.j - j;
                        if ((Math.abs(ver_diff) <= card_ref.range) && (card_ref.i === i)) {
                            that.matrix[i][j].in_range = true;
                        }

                        if (!that.matrix[i][j].in_range)
                            continue;

                        if ((mouse_state === 1) &&
                            (mouse_x > (that.s_x + (j * that.square_w))) &&
                            (mouse_x < (that.s_x + (j * that.square_w) + that.square_w)) &&
                            (mouse_y > (that.s_y + (i * that.square_h))) &&
                            (mouse_y < (that.s_y + (i * that.square_h) + that.square_h))
                            ) {

                            var impacted_cards = [that.matrix[i][j].id];

                            for (var k = 1; k < Math.abs(hor_diff) ; k++)
                                if (that.matrix[i - k][j] != null) impacted_cards.push(that.matrix[i - k][j].id);

                            for (var k = 1; k < Math.abs(ver_diff) ; k++)
                                if (that.matrix[i][j - k] != null) impacted_cards.push(that.matrix[i][j - k].id);

                            that.resolveFireBreath(impacted_cards);

                            socket.emit('PE_resolve_fire_breath', { room_name: room_name, impacted_cards: impacted_cards });

                            card_ref.attacked = true;
                            mouse_state = 2;
                        }
                    }

                }
            }

        }

        that.resolveFireBreath = function (impacted_cards) {

            console.log("impacted cards " + impacted_cards)

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if (that.matrix[i][j] === null)
                        continue;

                    for (var k = 0; k < impacted_cards.length; k++) {

                        if (that.matrix[i][j].id === impacted_cards[k]) {

                            console.log('id found ' + impacted_cards[k]);

                            that.matrix[i][j].wounds++;

                            if (that.matrix[i][j].wounds >= that.matrix[i][j].lives) {
                                that.matrix[i][j].wounds = that.matrix[i][j].lives; //only for displaying purpose

                                if (your_turn)
                                    that.matrix[i][j].killed_by = player.name;
                                else
                                    that.matrix[i][j].killed_by = opponent.name;

                                that.matrix[i][j].dying = true;
                                that.matrix[i][j].hover = false;
                                that.matrix[i][j].selected = false;

                                //handle GAME OVER
                                if ((that.matrix[i][j].id) === 'pe31' && (that.matrix[i][j].owner === player.name)) {
                                    socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                                }
                                else if ((that.matrix[i][j].id) === 'to25' && (that.matrix[i][j].owner === player.name)) {
                                    socket.emit('game_over', { room_name: room_name, win: opponent.name, lost: player.name });
                                }
                            }
                        }
                    }
                }
            }

            parent.animations.push(new parent.Animation(21, null, null, null, null, null, null, { imp_cards_list: impacted_cards }));
        }

        that.drawAvailTakeovers = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var cards_to_takeover_xy = [];

            //find Kaeseeall card and highlight adjacent enemies card
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && that.matrix[i][j].name === 'Kaeseeall' && that.matrix[i][j].selected && that.matrix[i][j].power_active) {

                        ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                        if (((j + 1) < 6) && that.matrix[i][j + 1] != null && that.matrix[i][j + 1].owner != player.name && (that.matrix[i][j + 1].card_class === "common" || that.matrix[i][j + 1].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i][j + 1], i: i, j: j + 1 });
                        }

                        if (((j - 1) >= 0) && that.matrix[i][j - 1] != null && that.matrix[i][j - 1].owner != player.name && (that.matrix[i][j - 1].card_class === "common" || that.matrix[i][j - 1].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i][j - 1], i: i, j: j - 1 });
                        }

                        if (((i + 1) < 8) && that.matrix[i + 1][j] != null && that.matrix[i + 1][j].owner != player.name && (that.matrix[i + 1][j].card_class === "common" || that.matrix[i + 1][j].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i + 1][j], i: i + 1, j: j });
                        }

                        if (((i - 1) >= 0) && that.matrix[i - 1][j] != null && that.matrix[i - 1][j].owner != player.name && (that.matrix[i - 1][j].card_class === "common" || that.matrix[i - 1][j].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i - 1][j], i: i - 1, j: j });
                        }

                        for (var k = 0; k < cards_to_takeover_xy.length; k++) {
                            ctx.fillRect(that.s_x + (cards_to_takeover_xy[k].j * that.square_w), that.s_y + (cards_to_takeover_xy[k].i * that.square_h), that.square_w, that.square_h);
                        }

                        return;
                    }

                }
            }
        }

        that.handleTakeovers = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            var cards_to_takeover_xy = [];

            //find Kaeseeall card and highlight adjacent enemies card
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && that.matrix[i][j].name === 'Kaeseeall' && that.matrix[i][j].selected && that.matrix[i][j].power_active) {

                        if (((j + 1) < 6) && that.matrix[i][j + 1] != null && that.matrix[i][j + 1].owner != player.name && (that.matrix[i][j + 1].card_class === "common" || that.matrix[i][j + 1].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i][j + 1], i: i, j: j + 1 });
                        }
                        if (((j - 1) >= 0) && that.matrix[i][j - 1] != null && that.matrix[i][j - 1].owner != player.name && (that.matrix[i][j - 1].card_class === "common" || that.matrix[i][j - 1].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i][j - 1], i: i, j: j - 1 });
                        }
                        if (((i + 1) < 8) && that.matrix[i + 1][j] != null && that.matrix[i + 1][j].owner != player.name && (that.matrix[i + 1][j].card_class === "common" || that.matrix[i + 1][j].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i + 1][j], i: i + 1, j: j });
                        }
                        if (((i - 1) >= 0) && that.matrix[i - 1][j] != null && that.matrix[i - 1][j].owner != player.name && (that.matrix[i - 1][j].card_class === "common" || that.matrix[i - 1][j].card_class === "champion")) {
                            cards_to_takeover_xy.push({ card_ref: that.matrix[i - 1][j], i: i - 1, j: j });
                        }
                        console.log('5');
                        for (var k = 0; k < cards_to_takeover_xy.length; k++) {

                            if (
                                (mouse_state === 1) &&
                                (parseInt((((mouse_x - that.s_x) / that.square_w))) === cards_to_takeover_xy[k].j) &&
                                (parseInt((((mouse_y - that.s_y) / that.square_h))) === cards_to_takeover_xy[k].i)) {

                                parent.animations.push(new parent.Animation(22, null, null, null, null, null, null, { id: cards_to_takeover_xy[k].card_ref.id }));
                                socket.emit('PE_blazing_consription', { room_name: room_name, card_id: cards_to_takeover_xy[k].card_ref.id });

                                that.matrix[i][j].power_active = false;
                                cards_to_takeover_xy[k].card_ref.owner = player.name;
                                cards_to_takeover_xy[k].card_ref.taken = true;
                                mouse_state = 2;
                                return;

                            }
                        }
                    }

                }
            }

        }

    }

    var Hand = function () {

        var that = this;

        //image settings
        that.sheet_src_x = 450;
        that.sheet_src_y = 0;
        that.hand_w = 175;
        that.hand_h = 500;

        //coordiation settings:

        //Y attribute
        that.y = 32;

        //X attributes
        that.start_pos = 1010; //start position (closed)
        that.end_pos = 835;
        that.current_pos = that.start_pos;

        //hand state
        that.state = 0; /* 0 - closed,
                           1 - openning,
                           2 - open,
                           3 - closing */

        //card container settings
        //that.card_container = [new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 1, player.name, 4, 1, 1), new Card('Archer', 'pe1', 1, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1)];
        that.card_container = [];
        that.card_container_s_x = 30;
        that.card_container_s_y = 20;
        that.gap_between_cards = 10;


        that.handleAnimation = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            /* STATES:
               0 - closed,
               1 - openning,
               2 - open,
               3 - closing */

            if (that.state === 1)
                that.current_pos -= 2;
            else if (that.state === 3)
                that.current_pos += 2;

            if (that.current_pos <= that.end_pos) {
                that.current_pos = that.end_pos;
                that.state = 2;
            }
            else if (that.current_pos >= that.start_pos) {
                that.current_pos = that.start_pos;
                that.state = 0;
            }
        }

        that.draw = function () {

            if (that.state != 0) {

                //draw hand background
                var current_w = that.start_pos - that.current_pos;
                ctx.drawImage(parent.image, that.sheet_src_x, that.sheet_src_y, current_w, that.hand_h, that.current_pos, that.y, current_w, that.hand_h);

                //draw card container
                for (var i = 0; i < that.card_container.length; i++) {

                    if (that.card_container[i] != null) {

                        var current_w = that.start_pos - that.card_container_s_x - that.current_pos;

                        if (current_w > that.card_container[i].board_w)
                            current_w = that.card_container[i].board_w;
                        else if (current_w < 0)
                            current_w = 0;

                        if (current_w > 0) {
                            ctx.drawImage(player.faction.board_image, that.card_container[i].pos_x * that.card_container[i].board_w,
                            (2 * that.card_container[i].height) + (that.card_container[i].pos_y * that.card_container[i].board_h),
                            current_w,
                            that.card_container[i].board_h,
                            that.current_pos + that.card_container_s_x,
                            that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards),
                            current_w,
                            that.card_container[i].board_h);
                        }

                        //draw hover (white)
                        if (that.card_container[i].hover) {
                            ctx.fillStyle = "rgba(233, 233, 233, 0.3)";
                            ctx.fillRect(that.current_pos + that.card_container_s_x, that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards),
                                current_w, that.card_container[i].board_h);
                        }

                        //draw eyeglass if selected
                        if (that.card_container[i].selected) {

                            if (that.card_container[i].hover_eyeglass) {
                                ctx.drawImage(parent.image, 0, parent.board.sheet_origin, that.card_container[i].board_w, that.card_container[i].board_h,
                                    that.current_pos + that.card_container_s_x, that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards),
                                    that.card_container[i].board_w, that.card_container[i].board_h);
                            } else {
                                ctx.drawImage(parent.image, 130, parent.board.sheet_origin, that.card_container[i].board_w, that.card_container[i].board_h,
                                    that.current_pos + that.card_container_s_x, that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards),
                                    that.card_container[i].board_w, that.card_container[i].board_h);
                            }
                        }
                    }
                }
            }
        }

        that.checkHover = function () {

            if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                return;

            //Performance maintanance
            if (that.state === 0)
                return;

            if (mouse_x < that.current_pos)
                return;

            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i] != null) {

                    //check card hover
                    if ((mouse_x > that.current_pos + that.card_container_s_x) &&
                        (mouse_x < that.current_pos + that.card_container_s_x + that.card_container[i].board_w) &&
                        (mouse_y > that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards)) &&
                        (mouse_y < that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + that.card_container[i].board_h + (i * that.gap_between_cards))) {

                        that.card_container[i].hover = true;

                        //check eyeglass hover
                        if ((mouse_x > (that.current_pos + that.card_container_s_x + (that.card_container[i].board_w / 2) - 15)) &&
                            (mouse_x < that.current_pos + that.card_container_s_x + (that.card_container[i].board_w / 2) + 15) &&
                            (mouse_y > that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards) + (that.card_container[i].board_h / 2) - 15) &&
                            (mouse_y < that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards) + (that.card_container[i].board_h / 2) + 15)) {

                            that.card_container[i].hover_eyeglass = true;
                        } else {
                            that.card_container[i].hover_eyeglass = false;
                        }


                    }
                    else {
                        that.card_container[i].hover = false;
                        that.card_container[i].hover_eyeglass = false;
                    }
                }
            }
        }

        that.checkMouseAction = function () {

            if (mouse_state != 1)
                return;

            //disable draw in big picture if true
            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i].draw_big_picture_from_hand) {
                    that.card_container[i].draw_big_picture_from_hand = false;
                    that.card_container[i].hover = false;
                    parent.draw_big_picture_from_hand = false;
                    mouse_state = 2;
                    return;
                }
            }

            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i] != null) {

                    if (!that.card_container[i].selected && that.card_container[i].hover) {
                        that.card_container[i].selected = true;
                        parent.board.unselectAll();
                        mouse_state = 2;
                    }
                    else if (that.card_container[i].selected && that.card_container[i].hover && that.card_container[i].hover_eyeglass) {
                        that.card_container[i].draw_big_picture_from_hand = true;
                        parent.draw_big_picture_from_hand = true;
                        mouse_state = 2;
                    }
                    else if (that.card_container[i].selected && !that.card_container[i].hover) {
                        that.card_container[i].selected = false;
                        mouse_state = 2;
                    }

                }
            }
        }

        that.drawBigPicture = function () {

            if (parent.draw_big_picture_from_hand) {

                for (var i = 0; i < that.card_container.length; i++) {
                    if (that.card_container[i] != null && that.card_container[i].draw_big_picture_from_hand) {

                        ctx.fillStyle = "rgba(185, 185, 185, 0.6)";
                        ctx.fillRect(12, 12, width - 22, height - 22);

                        //check card owner in order to load proper faction image
                        ctx.drawImage(player.faction.board_image, that.card_container[i].pos_x * that.card_container[i].width, that.card_container[i].pos_y * that.card_container[i].height,
                            that.card_container[i].width, that.card_container[i].height, 329, 200, that.card_container[i].width, that.card_container[i].height);

                    }
                }
            }

        }

        that.fillHand = function () {

            var nb_of_missing_cards = 5 - that.card_container.length;

            for (var i = 0; i < nb_of_missing_cards; i++) {

                if (player.faction.deck.length > 0) {
                    var rand_card = Math.floor(Math.random() * player.faction.deck.length);
                    that.card_container.push(player.faction.deck[rand_card]);
                    player.faction.deck.splice(rand_card, 1);
                }
            }
        }

        that.unselectAll = function () {

            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i] != null && that.card_container[i].selected) {
                    that.card_container[i].selected = false;
                    return;
                }
            }
        }

        that.removeCard = function (card) {

            for (var i = 0; i < that.card_container.length; i++) {
                if (that.card_container[i].id === card.id) {
                    that.card_container.splice(i, 1);
                    return;
                }
            }
        }
    }

    this.Animation = function (type, hits, shoots, attacking_card_id, hitted_card_id, x, y, data) {

        /* types definitions:
           0 - 'End Phase' animation: only 'type' argument required
           1 - 'x/y hits' animation: 'hits' and 'shoots' arguments are required
           2 - 'arrows' animation: all arguments are required
           3 - 'Game over' animation
           4 - 'Burn'
           5 - 'Greater Burn'
           6 - 'Spirit of the Phoenix'
           7 - 'Wall'
           8 - 'Ice Wall'
           9 - 'Magic Drain'
           10- 'A hero is born'
           11- 'Freeze'
           12- 'Unfreeze'
           13- 'The card has been summoned': x and y arguments are used
           14- 'Reinforcements'
           15- 'Blaze step' phase
           16- 'Fury' phase
           17- 'Blaze step'
           18- 'No Fury'
           19- 'Walls of Ice Shards': 6 skips + data parameter - list of impacted cards
           20- 'Wild Swing': 6 skips + data parameter
           21- 'Breath of Flame': 6 skips + data parameter
           22- 'Blazing Conscription': 6 skips + data parameter
        */

        var that = this;
        that.type = type;

        //image settings
        that.sheet_origin = 401; //indicates start 'y' point for animation graphics in the sheet
        that.sheet_hor_arrows_origin = 601; //indicates start 'y' point for horizontal arrows
        that.sheet_ver_arrows_origin = 941; //indicates start 'y' point for vertical arrows

        that.hits = hits;
        that.shoots = shoots;
        that.attacking_card_id = attacking_card_id;
        that.hitted_card_id = hitted_card_id;

        that.alpha = 1;
        that.cnt = 0;

        /* for education purpose
           a = typeof a !== 'undefined' ? a : 42;
           b = typeof b !== 'undefined' ? b : 'default_b';
       */
        if (that.type === 0) {
            that.cnt = 150;
        } else if (that.type === 2) {

            that.attacking_card_x = null;
            that.attacking_card_y = null;

            that.hitted_card_x = null;
            that.hitted_card_y = null;

            for (var i = 0; i < parent.board.matrix.length; i++) {
                for (var j = 0; j < parent.board.matrix[i].length; j++) {

                    if (parent.board.matrix[i][j] != null) {

                        if (parent.board.matrix[i][j].id === that.attacking_card_id) {
                            that.attacking_card_x = i;
                            that.attacking_card_y = j;
                        }

                        if (parent.board.matrix[i][j].id === that.hitted_card_id) {
                            that.hitted_card_x = i;
                            that.hitted_card_y = j;
                        }

                    }
                }
            }
        } else if (that.type === 3) {
            //overwrite sheet settings
            that.sheet_origin = 1461; // y start coordinates
        } else if (that.type === 4) {
            that.sheet_origin = 1801; // y start coordinates
            that.card_x = x;
            that.card_y = y;
        } else if (that.type === 5) {
            that.sheet_origin = 1801; // y start coordinates
            that.card_x = x;
            that.card_y = y;
        } else if (that.type === 6) {

            //overwrite sheet settings
            that.sheet_origin = 1901; // y start coordinates

            that.touched_card_x = null;
            that.touched_card_y = null;

            for (var i = 0; i < parent.board.matrix.length; i++) {
                for (var j = 0; j < parent.board.matrix[i].length; j++) {

                    if (parent.board.matrix[i][j] != null) {

                        if (parent.board.matrix[i][j].id === that.attacking_card_id) {
                            that.touched_card_x = i;
                            that.touched_card_y = j;
                        }

                    }
                }
            }
        } else if (that.type === 7 || that.type === 8) {
            that.sheet_origin = 2001; // y start coordinates
        } else if (that.type === 9) {
            that.co_xywh = [300, 2001, 350, 100];
        } else if (that.type === 10) {
            that.co_xywh = [0, 2201, 450, 100];
        } else if (that.type === 11) {
            that.co_xywh = [450, 1800, 200, 100];
        } else if (that.type === 12) {
            that.co_xywh = [430, 2301, 200, 100];
        } else if (that.type === 13) {
            that.card_x = x;
            that.card_y = y;
            that.co_xywh = [0, 2401, 650, 70];
        } else if (that.type === 14) {
            that.co_xywh = [0, 2470, 450, 100];
        } else if (that.type === 15) {
            that.co_xywh = [0, 2570, 350, 100];
        } else if (that.type === 16) {
            that.co_xywh = [450, 2570, 200, 100];
        } else if (that.type === 17) {
            that.cnt = 150;
            that.co_xywh = [0, 2570, 350, 100];
            that.card_x = x;
            that.card_y = y;
        } else if (that.type === 18) {
            that.co_xywh = [350, 2570, 300, 100];
        } else if (that.type === 19) {
            that.co_xywh = [0, 2730, 500, 80]; //"Walls of ..." coordinates
            that.co_xywh_dr = [0, 2810, 80, 80]; //"dice roll:" coordinates
            that.data = data;
        } else if (that.type === 20) {
            that.co_xywh = [0, 2895, 320, 75]; //"Wild Swing" coordinates
            that.co_xywh_dr = [0, 2810, 80, 80]; //"dice roll:" coordinates
            that.data = data;
        } else if (that.type === 21) {
            that.co_xywh = [320, 2895, 330, 75]; //"Breath of flame" coordinates
            that.data = data;
        } else if (that.type === 22) {
            that.co_xywh = [0, 2970, 500, 80]; //"Blazing Conscription" coordinates
            that.data = data;
        }

        that.handle = function () {

            if (that.type != 3) {
                that.cnt++;

                if (that.cnt > 250) {
                    that.alpha -= 0.01;

                    //alpha must not have negative value
                    if (that.alpha < 0)
                        that.alpha = 0;
                }
            }
        }

        that.draw = function () {

            ctx.save();
            ctx.globalAlpha = that.alpha;

            if (that.type === 0)
                ctx.drawImage(parent.image, 0, that.sheet_origin, 350, 100, 337, 334, 350, 100);
            else if (that.type === 1) {

                ctx.drawImage(parent.image, 50 * that.hits, that.sheet_origin + 100, 50, 100, 362, 334, 50, 100);
                ctx.drawImage(parent.image, 350, that.sheet_origin + 100, 50, 100, 412, 334, 50, 100);
                ctx.drawImage(parent.image, 50 * that.shoots, that.sheet_origin + 100, 50, 100, 462, 334, 50, 100);
                ctx.drawImage(parent.image, 400, that.sheet_origin + 100, 150, 100, 512, 334, 150, 100);
            }
            else if (that.type === 2) {

                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.attacking_card_y * parent.board.square_w), parent.board.s_y + (that.attacking_card_x * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.hitted_card_y * parent.board.square_w), parent.board.s_y + (that.hitted_card_x * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                //one of the above dimensions should be equal to zero
                var ver_diff = that.hitted_card_x - that.attacking_card_x; //horizontal difference
                var hor_diff = that.hitted_card_y - that.attacking_card_y; //vertical difference

                //angle indicates how much plan should be rotated
                var angle = 0;

                if (0 > hor_diff)
                    angle = 180;
                else if (ver_diff < 0)
                    angle = 270;
                else if (ver_diff > 0)
                    angle = 90;

                //arrow length
                var arrow_len = 0;

                if (ver_diff != 0)
                    arrow_len = Math.abs(ver_diff);
                else if (hor_diff != 0)
                    arrow_len = Math.abs(hor_diff);

                if (arrow_len === 0)
                    alert("Setting arrow length does not work!");

                var tmp_sheet_arrow_origin = null;

                //select proper image
                if (ver_diff != 0) {
                    tmp_sheet_arrow_origin = that.sheet_ver_arrows_origin;
                }
                else {
                    tmp_sheet_arrow_origin = that.sheet_hor_arrows_origin;
                }

                ctx.save(); //store context coordination settings
                ctx.translate(parent.board.s_x + (that.attacking_card_y * parent.board.square_w) + (parent.board.square_w / 2), parent.board.s_y + (that.attacking_card_x * parent.board.square_h) + (parent.board.square_h / 2)); //change rotation point to the middle of the tank
                ctx.rotate(angle * (Math.PI / 180)); //rotate context according to arrow direction

                if (hor_diff != 0)
                    ctx.drawImage(parent.image, 0, that.sheet_hor_arrows_origin + ((arrow_len - 1) * 85), 130 + (arrow_len * parent.board.square_w), 85, (parent.board.square_w / 2) * (-1), (parent.board.square_h / 2) * (-1), 130 + (arrow_len * parent.board.square_w), 85);
                else
                    ctx.drawImage(parent.image, 0, that.sheet_ver_arrows_origin + ((arrow_len - 1) * 130), 85 + (arrow_len * parent.board.square_h), 130, (parent.board.square_h / 2) * (-1), (parent.board.square_w / 2) * (-1), 85 + (arrow_len * parent.board.square_h), 130);


                ctx.restore(); //load stored context settings
            }
            else if (that.type === 3) {
                ctx.drawImage(parent.image, 0, that.sheet_origin, 375, 100, 325, 250, 375, 100);
                ctx.drawImage(parent.image, 325 * player.win, that.sheet_origin + 100, 325, 100, 350, 350, 325, 100);
                ctx.drawImage(parent.image, 0, that.sheet_origin + 200, 650, 100, 187, 450, 650, 100);
            }
            else if (that.type === 4) {
                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.card_x * parent.board.square_w), parent.board.s_y + (that.card_y * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.drawImage(parent.image, 250, that.sheet_origin, 200, 100, 412, 334, 200, 100);
            }
            else if (that.type === 5) {
                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.card_x * parent.board.square_w), parent.board.s_y + (that.card_y * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.drawImage(parent.image, 0, that.sheet_origin, 450, 100, 387, 334, 450, 100);
            }
            else if (that.type === 6) {
                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.touched_card_y * parent.board.square_w), parent.board.s_y + (that.touched_card_x * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.drawImage(parent.image, 0, that.sheet_origin, 650, 100, 187, 334, 650, 100);
            }
            else if (that.type === 7) {
                ctx.drawImage(parent.image, 130, that.sheet_origin, 170, 100, 412, 334, 170, 100);
            }
            else if (that.type === 8) {
                ctx.drawImage(parent.image, 0, that.sheet_origin, 300, 100, 347, 334, 300, 100);
            }
            else if (that.type === 9) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], 338, 334, that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 10) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], 338, 334, that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 11) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], 412, 334, that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 12) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], 412, 334, that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 13) {
                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.card_x * parent.board.square_w), parent.board.s_y + (that.card_y * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 14) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 15) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);
                ctx.drawImage(parent.image, 150, 400, 200, 100, 412, (height / 2) - (that.co_xywh[3] / 2) + 100, 200, 100);
            }
            else if (that.type === 16) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - that.co_xywh[2], (height / 2) - (that.co_xywh[3] / 2) + that.co_xywh[3], that.co_xywh[2], that.co_xywh[3]);
                ctx.drawImage(parent.image, 150, 400, 200, 100, (width / 2) - 25, (height / 2) - (that.co_xywh[3] / 2) + 110, 200, 100);
            }
            else if (that.type === 17) {
                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (that.card_x * parent.board.square_w), parent.board.s_y + (that.card_y * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 18) {
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2) + that.co_xywh[3], that.co_xywh[2], that.co_xywh[3]);
            }
            else if (that.type === 19) {


                for (var k = 0; k < that.data.imp_cards_list.length; k++) {

                    for (var i = 0; i < parent.board.matrix.length; i++) {
                        for (var j = 0; j < parent.board.matrix[i].length; j++) {

                            if (parent.board.matrix[i][j] != null) {

                                if (parent.board.matrix[i][j].id === that.data.imp_cards_list[k]) {
                                    ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                                    ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                                }
                            }
                        }
                    }
                }

                //draw dice roll animation
                var tmp_dice_roll = that.data.dice_roll - 1;

                ctx.drawImage(parent.image, that.co_xywh_dr[0] + (tmp_dice_roll * that.co_xywh_dr[2]), that.co_xywh_dr[1], that.co_xywh_dr[2], that.co_xywh_dr[3], (width / 2) - (that.co_xywh_dr[2] / 2), (height / 2) - (that.co_xywh_dr[3] / 2) - that.co_xywh_dr[3], that.co_xywh_dr[2], that.co_xywh_dr[3]);

                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);

            }
            else if (that.type === 20) {


                for (var k = 0; k < that.data.imp_cards_list.length; k++) {

                    for (var i = 0; i < parent.board.matrix.length; i++) {
                        for (var j = 0; j < parent.board.matrix[i].length; j++) {

                            if (parent.board.matrix[i][j] != null) {

                                if (parent.board.matrix[i][j].id === that.data.imp_cards_list[k]) {
                                    ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                                    ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                                }
                            }
                        }
                    }
                }

                //draw dice roll animation
                var tmp_dice_roll = that.data.dice_roll - 1;

                ctx.drawImage(parent.image, that.co_xywh_dr[0] + (tmp_dice_roll * that.co_xywh_dr[2]), that.co_xywh_dr[1], that.co_xywh_dr[2], that.co_xywh_dr[3], (width / 2) - (that.co_xywh_dr[2] / 2), (height / 2) - (that.co_xywh_dr[3] / 2) - that.co_xywh_dr[3] - 100, that.co_xywh_dr[2], that.co_xywh_dr[3]);

                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2) - 100, that.co_xywh[2], that.co_xywh[3]);

            }
            else if (that.type === 21) {

                for (var k = 0; k < that.data.imp_cards_list.length; k++) {

                    for (var i = 0; i < parent.board.matrix.length; i++) {
                        for (var j = 0; j < parent.board.matrix[i].length; j++) {

                            if (parent.board.matrix[i][j] != null) {

                                if (parent.board.matrix[i][j].id === that.data.imp_cards_list[k]) {
                                    ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                                    ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                                }
                            }
                        }
                    }
                }
                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - ((that.co_xywh[2] * 1.3) / 2), (height / 2) - ((that.co_xywh[3] * 1.3) / 2), that.co_xywh[2] * 1.3, that.co_xywh[3] * 1.3);
            }
            else if (that.type === 22) {

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null && (parent.board.matrix[i][j].id === that.data.id)) {

                            ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                        }
                    }
                }

                ctx.drawImage(parent.image, that.co_xywh[0], that.co_xywh[1], that.co_xywh[2], that.co_xywh[3], (width / 2) - (that.co_xywh[2] / 2), (height / 2) - (that.co_xywh[3] / 2), that.co_xywh[2], that.co_xywh[3]);
            }
            ctx.restore();
        }
    }

    //EventPhaseHandlers

    var PhoenixElvesEventPhaseHandler = function () {

        var that = this;
        that.use_button_src_xywh = [0, 2101, 150, 100]; // "USE" button source coordinates - for specific card purpose (x,y,width,height)
        that.use_button_xywh = [437, 450, 150, 100]; // "USE" button coordinates - for specific card purpose (x,y,width,height)
        that.card_to_be_removed = [];  //events cards id that should be removed - in case they cant be removed before

        that.handleEventPhaseLogic = function () {

            //firstly remove card from previous loop
            for (var i = 0; i < that.card_to_be_removed.length; i++)
                parent.hand.removeCard(that.card_to_be_removed[i]);

            var card_ref = null;

            for (var i = 0; i < parent.hand.card_container.length; i++) {
                if (parent.hand.card_container[i].selected)
                    card_ref = parent.hand.card_container[i];
            }

            //if event card is not selected just stop
            if (card_ref === null || mouse_state != 1)
                return;

            if (card_ref.name === 'A Hero Is Born') {

                if (parent.draw_big_picture_from_hand === false || parent.draw_big_picture)
                    return;

                var visible_part = 250;
                var ver_delta = 25; //vertical delta
                var hor_delta = 117;
                var card_h = 239;
                var s_x = 100;
                var s_y = 500;

                if (parent.draw_big_picture_from_hand === false)
                    return;

                var player_champion_cards = [];

                //get champion cards ref 
                for (var i = 0; i < player.faction.deck.length; i++) {
                    if (player.faction.deck[i].card_class === "champion")
                        player_champion_cards.push(player.faction.deck[i]);
                }

                //draw highlight in case of hover
                for (var i = 0; i < player_champion_cards.length; i++) {

                    //check card hover
                    if (
                        ((mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + visible_part) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ||
                        ((mouse_x > s_x + (i + 1) * visible_part) &&
                        (mouse_x < s_x + (i + 1) * visible_part + hor_delta) &&
                        (mouse_y > s_y - (i * ver_delta) + (card_h - ver_delta)) &&
                        (mouse_y < s_y - (i * ver_delta) + card_h))
                        ||
                        ((i === player_champion_cards.length - 1) &&
                        (mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + player_champion_cards[i].width) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ) {

                        mouse_state = 2;
                        socket.emit('ALL_hero_is_born_event', { room_name: room_name });

                        parent.animations.push(new parent.Animation(10));
                        player.discard_pile.push(card_ref);
                        parent.hand.removeCard(card_ref);
                        parent.hand.card_container.push(player_champion_cards[i]);

                        for (var j = 0; j < player.faction.deck.length; j++) {
                            if (player.faction.deck[j].id === player_champion_cards[i].id)
                                player.faction.deck.splice(j, 1);
                        }

                        parent.draw_big_picture_from_hand = false;
                        return;

                    }
                }

            } else if (card_ref.name === 'Burn') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null) {

                            if ((mouse_x > parent.board.s_x + (j * parent.board.square_w)) &&
                                (mouse_x < parent.board.s_x + (j * parent.board.square_w) + parent.board.square_w) &&
                                (mouse_y > parent.board.s_y + (i * parent.board.square_h)) &&
                                (mouse_y < parent.board.s_y + (i * parent.board.square_h) + parent.board.square_h) &&
                                (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                                parent.board.matrix[i][j].wounds += 1;

                                //add 'Burn' animation
                                parent.animations.push(new parent.Animation(4, null, null, null, null, j, i));

                                if (parent.board.matrix[i][j].wounds >= parent.board.matrix[i][j].lives) {
                                    parent.board.matrix[i][j].wounds = parent.board.matrix[i][j].lives; //only for displaying purpose
                                    parent.board.matrix[i][j].killed_by = player.name; //store card killer name
                                    parent.board.matrix[i][j].dying = true;
                                    parent.board.matrix[i][j].hover = false;
                                    parent.board.matrix[i][j].selected = false;

                                }

                                mouse_state = 2;
                                socket.emit('PE_event_burn', { room_name: room_name, card_id: parent.board.matrix[i][j].id, player_name: player.name });
                                player.discard_pile.push(card_ref);
                                parent.hand.removeCard(card_ref);

                            }
                        }
                    }
                }


            } else if (card_ref.name === 'Greater Burn') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null) {

                            if ((mouse_x > parent.board.s_x + (j * parent.board.square_w)) &&
                                (mouse_x < parent.board.s_x + (j * parent.board.square_w) + parent.board.square_w) &&
                                (mouse_y > parent.board.s_y + (i * parent.board.square_h)) &&
                                (mouse_y < parent.board.s_y + (i * parent.board.square_h) + parent.board.square_h) &&
                                (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                                parent.board.matrix[i][j].wounds += 2;

                                //add 'Greater Burn' animation
                                parent.animations.push(new parent.Animation(5, null, null, null, null, j, i));

                                if (parent.board.matrix[i][j].wounds >= parent.board.matrix[i][j].lives) {
                                    parent.board.matrix[i][j].wounds = parent.board.matrix[i][j].lives; //only for displaying purpose
                                    parent.board.matrix[i][j].killed_by = player.name; //store card killer name
                                    parent.board.matrix[i][j].dying = true;
                                    parent.board.matrix[i][j].hover = false;
                                    parent.board.matrix[i][j].selected = false;

                                }

                                mouse_state = 2;
                                socket.emit('PE_greater_burn_event', { room_name: room_name, card_id: parent.board.matrix[i][j].id, player_name: player.name });
                                player.discard_pile.push(card_ref);
                                parent.hand.removeCard(card_ref);

                            }
                        }
                    }
                }

            } else if (card_ref.name === 'Magic Drain') {

                if (parent.draw_big_picture_from_hand === false || parent.draw_big_picture)
                    return;

                //count number of units on the board for both players
                var player_nb_of_units = 0;
                var opponent_nb_of_units = 0;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null && (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                            if (parent.board.matrix[i][j].owner === player.name)
                                player_nb_of_units++;
                            else if (parent.board.matrix[i][j].owner === opponent.name)
                                opponent_nb_of_units++;
                        }
                    }
                }

                if (opponent_nb_of_units <= player_nb_of_units || opponent.magic_pile.length === 0) {
                    return;
                }

                if ((mouse_x > that.use_button_xywh[0]) &&
                    (mouse_x < that.use_button_xywh[0] + that.use_button_xywh[2]) &&
                    (mouse_y > that.use_button_xywh[1]) &&
                    (mouse_y < that.use_button_xywh[1] + that.use_button_xywh[3])) {

                    var oponent_magig_pile_len = opponent.magic_pile.length;

                    for (var i = 0; i < oponent_magig_pile_len && i < 2; i++)
                        player.magic_pile.push(opponent.magic_pile.pop());

                    page_handler.animations.push(new parent.Animation(9));
                    socket.emit('ALL_magic_drain_event', { room_name: room_name, card_id: card_ref.id });
                    player.discard_pile.push(card_ref);
                    that.card_to_be_removed.push(card_ref);
                    return;
                }

            } else if (card_ref.name === 'Spirit of the Phoenix') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null) {

                            if ((mouse_x > parent.board.s_x + (j * parent.board.square_w)) &&
                                (mouse_x < parent.board.s_x + (j * parent.board.square_w) + parent.board.square_w) &&
                                (mouse_y > parent.board.s_y + (i * parent.board.square_h)) &&
                                (mouse_y < parent.board.s_y + (i * parent.board.square_h) + parent.board.square_h) &&
                                ((parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion' || parent.board.matrix[i][j].card_class === 'summoner') && parent.board.matrix[i][j].owner === player_login)) {

                                parent.board.matrix[i][j].spirit_of_the_phoenix = true;

                                //add 'Spirit of the Phoenix' animation
                                parent.animations.push(new parent.Animation(6, null, null, parent.board.matrix[i][j].id));

                                mouse_state = 2;
                                socket.emit('PE_spirit_of_the_phoenix_event', { room_name: room_name, card_id: parent.board.matrix[i][j].id });
                                player.discard_pile.push(card_ref);
                                parent.hand.removeCard(card_ref);

                            }
                        }
                    }
                }

            } else if (card_ref.name === 'Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                mouse_state = 2;
                                parent.board.addCard(card_ref, j, i);
                                [j, i] = rotate180(j, i);
                                socket.emit('PE_wall_summon_event', { room_name: room_name, card_id: card_ref.id, i: i, j: j });
                                parent.hand.removeCard(card_ref);
                                page_handler.animations.push(new parent.Animation(7));
                            }
                        }
                    }
                }
            }
        }

        that.handleEventPhaseRender = function () {

            var card_name = null;

            for (var i = 0; i < parent.hand.card_container.length; i++) {
                if (parent.hand.card_container[i].selected)
                    card_name = parent.hand.card_container[i].name;
            }

            //if event card is not selected just stop
            if (card_name === null)
                return;

            if (card_name === 'A Hero Is Born') {

                var visible_part = 250;
                var ver_delta = 25; //vertical delta
                var hor_delta = 117;
                var card_h = 239;
                var s_x = 100;
                var s_y = 500;

                if (parent.draw_big_picture_from_hand === false)
                    return;

                var player_champion_cards = [];

                //get champion cards ref 
                for (var i = 0; i < player.faction.deck.length; i++) {
                    if (player.faction.deck[i].card_class === "champion")
                        player_champion_cards.push(player.faction.deck[i]);
                }

                //draw cards
                for (var i = 0; i < player_champion_cards.length; i++) {
                    ctx.drawImage(player.faction.board_image, player_champion_cards[i].pos_x * player_champion_cards[i].width, player_champion_cards[i].pos_y * player_champion_cards[i].height,
                                    player_champion_cards[i].width, player_champion_cards[i].height, s_x + (i * visible_part), s_y - (i * ver_delta), player_champion_cards[i].width, player_champion_cards[i].height);
                }

                //draw highlight in case of hover
                for (var i = 0; i < player_champion_cards.length; i++) {

                    //check card hover
                    if (
                        ((mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + visible_part) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ||
                        ((mouse_x > s_x + (i + 1) * visible_part) &&
                        (mouse_x < s_x + (i + 1) * visible_part + hor_delta) &&
                        (mouse_y > s_y - (i * ver_delta) + (card_h - ver_delta)) &&
                        (mouse_y < s_y - (i * ver_delta) + card_h))
                        ||
                        ((i === player_champion_cards.length - 1) &&
                        (mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + player_champion_cards[i].width) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ) {

                        ctx.fillStyle = "rgba(233, 233, 233, 0.3)";

                        //additional check for last card
                        if (i === player_champion_cards.length - 1) {
                            ctx.fillRect(s_x + (i * visible_part) + visible_part, s_y - (i * ver_delta), hor_delta, card_h - ver_delta);

                        }
                        ctx.fillRect(s_x + (i * visible_part), s_y - (i * ver_delta), visible_part, card_h);
                        ctx.fillRect(s_x + ((i + 1) * visible_part), s_y - (i * ver_delta) + (card_h - ver_delta), hor_delta, ver_delta);

                    }
                }


            } else if (card_name === 'Burn') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available attacks
                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if ((parent.board.matrix[i][j] != null) && (parent.board.matrix[i][j].card_class === "common" || parent.board.matrix[i][j].card_class === "champion")) {

                            if (parent.board.matrix[i][j].owner === player_login)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            else
                                ctx.fillStyle = "rgba(216, 25, 0, 0.4)";

                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                        }

                    }
                }

            } else if (card_name === 'Greater Burn') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available attacks
                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if ((parent.board.matrix[i][j] != null) && (parent.board.matrix[i][j].card_class === "common" || parent.board.matrix[i][j].card_class === "champion")) {

                            if (parent.board.matrix[i][j].owner === player_login)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            else
                                ctx.fillStyle = "rgba(216, 25, 0, 0.4)";

                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                        }

                    }
                }

            } else if (card_name === 'Spirit of the Phoenix') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available cards
                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if ((parent.board.matrix[i][j] != null) && ((parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion' || parent.board.matrix[i][j].card_class === 'summoner') && parent.board.matrix[i][j].owner === player_login)) {
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                        }
                    }
                }

            } else if (card_name === 'Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available tails
                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                //hover available tile (green)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            }
                        }
                    }
                }

            } else if (card_name === 'Magic Drain') {

                if (parent.draw_big_picture_from_hand === false)
                    return;

                //count number of units on the board for both players
                var player_nb_of_units = 0;
                var opponent_nb_of_units = 0;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null && (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                            if (parent.board.matrix[i][j].owner === player.name)
                                player_nb_of_units++;
                            else if (parent.board.matrix[i][j].owner === opponent.name)
                                opponent_nb_of_units++;
                        }
                    }
                }

                if ((opponent_nb_of_units <= player_nb_of_units) || (opponent.magic_pile.length === 0)) {
                    ctx.drawImage(parent.image, that.use_button_src_xywh[0], that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);
                    return;
                }
                else
                    ctx.drawImage(parent.image, that.use_button_src_xywh[2], that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);

                //check hover
                if ((mouse_x > that.use_button_xywh[0]) &&
                    (mouse_x < that.use_button_xywh[0] + that.use_button_xywh[2]) &&
                    (mouse_y > that.use_button_xywh[1]) &&
                    (mouse_y < that.use_button_xywh[1] + that.use_button_xywh[3])) {

                    ctx.drawImage(parent.image, that.use_button_src_xywh[2] * 2, that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);

                }


            }
        }
    }

    var TundraOrcsEventPhaseHandler = function () {

        var that = this;

        that.use_button_src_xywh = [0, 2101, 150, 100]; // "USE" button source coordinates - for specific card purpose (x,y,width,height)
        that.use_button_xywh = [437, 450, 150, 100]; // "USE" button coordinates - for specific card purpose (x,y,width,height)
        that.card_to_be_removed = [];  //events cards id that should be removed - in case they cant be removed before

        that.handleEventPhaseLogic = function () {

            //firstly remove card from previous loop
            for (var i = 0; i < that.card_to_be_removed.length; i++)
                parent.hand.removeCard(that.card_to_be_removed[i]);

            var card_ref = null;

            for (var i = 0; i < parent.hand.card_container.length; i++) {
                if (parent.hand.card_container[i].selected)
                    card_ref = parent.hand.card_container[i];
            }

            //if event card is not selected just stop
            if (card_ref === null || mouse_state != 1)
                return;

            if (card_ref.name === 'Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                mouse_state = 2;
                                parent.board.addCard(card_ref, j, i);
                                [j, i] = rotate180(j, i);
                                socket.emit('TO_wall_summon_event', { room_name: room_name, card_id: card_ref.id, i: i, j: j });
                                parent.hand.removeCard(card_ref);
                                page_handler.animations.push(new parent.Animation(7));
                            }
                        }
                    }
                }
            } else if (card_ref.name === 'Ice Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                mouse_state = 2;
                                parent.board.addCard(card_ref, j, i);
                                [j, i] = rotate180(j, i);
                                socket.emit('TO_ice_wall_summon_event', { room_name: room_name, card_id: card_ref.id, i: i, j: j });
                                parent.hand.removeCard(card_ref);
                                page_handler.animations.push(new parent.Animation(8));
                            }
                        }
                    }
                }
            } else if (card_ref.name === 'A Hero Is Born') {

                if (parent.draw_big_picture_from_hand === false || parent.draw_big_picture)
                    return;

                var visible_part = 250;
                var ver_delta = 25; //vertical delta
                var hor_delta = 117;
                var card_h = 239;
                var s_x = 100;
                var s_y = 500;

                if (parent.draw_big_picture_from_hand === false)
                    return;

                var player_champion_cards = [];

                //get champion cards ref 
                for (var i = 0; i < player.faction.deck.length; i++) {
                    if (player.faction.deck[i].card_class === "champion")
                        player_champion_cards.push(player.faction.deck[i]);
                }

                //draw highlight in case of hover
                for (var i = 0; i < player_champion_cards.length; i++) {

                    //check card hover
                    if (
                        ((mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + visible_part) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ||
                        ((mouse_x > s_x + (i + 1) * visible_part) &&
                        (mouse_x < s_x + (i + 1) * visible_part + hor_delta) &&
                        (mouse_y > s_y - (i * ver_delta) + (card_h - ver_delta)) &&
                        (mouse_y < s_y - (i * ver_delta) + card_h))
                        ||
                        ((i === player_champion_cards.length - 1) &&
                        (mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + player_champion_cards[i].width) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ) {

                        mouse_state = 2;
                        socket.emit('ALL_hero_is_born_event', { room_name: room_name });

                        parent.animations.push(new parent.Animation(10));
                        player.discard_pile.push(card_ref);
                        parent.hand.removeCard(card_ref);
                        parent.hand.card_container.push(player_champion_cards[i]);
                        parent.draw_big_picture_from_hand = false;
                        return;

                    }
                }

            } else if (card_ref.name === 'Freeze') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;



                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {


                        if ((parent.board.matrix[i][j] != null) && (parent.board.matrix[i][j].card_class === "common" || parent.board.matrix[i][j].card_class === "champion" || parent.board.matrix[i][j].card_class === "summoner")) {

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) && (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                mouse_state = 2;
                                parent.board.matrix[i][j].freezed = true;
                                parent.board.matrix[i][j].freeze_card_ref = card_ref;
                                socket.emit('TO_freeze_event', { room_name: room_name, freezed_card_id: parent.board.matrix[i][j].id, freezing_card_id: card_ref.id });
                                player.discard_pile.push(card_ref);
                                parent.hand.removeCard(card_ref);
                                page_handler.animations.push(new parent.Animation(11));
                            }
                        }

                    }
                }

            } else if (card_ref.name === 'Reinforcements') {

                if (parent.draw_big_picture_from_hand === false || parent.draw_big_picture)
                    return;

                //count number of units on the board for both players
                var player_nb_of_units = 0;
                var opponent_nb_of_units = 0;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null && (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                            if (parent.board.matrix[i][j].owner === player.name)
                                player_nb_of_units++;
                            else if (parent.board.matrix[i][j].owner === opponent.name)
                                opponent_nb_of_units++;
                        }
                    }
                }

                if (opponent_nb_of_units <= player_nb_of_units) {
                    return;
                }

                if ((mouse_x > that.use_button_xywh[0]) &&
                    (mouse_x < that.use_button_xywh[0] + that.use_button_xywh[2]) &&
                    (mouse_y > that.use_button_xywh[1]) &&
                    (mouse_y < that.use_button_xywh[1] + that.use_button_xywh[3])) {

                    page_handler.animations.push(new parent.Animation(14));
                    game_phase = 8;
                    player.reinforcement_cnt = 2;

                    socket.emit('TO_reinforcements_event', { room_name: room_name, card_id: card_ref.id });
                    player.discard_pile.push(card_ref);
                    that.card_to_be_removed.push(card_ref);
                    return;
                }

            }

        }

        that.handleEventPhaseRender = function () {

            var card_name = null;

            for (var i = 0; i < parent.hand.card_container.length; i++) {
                if (parent.hand.card_container[i].selected)
                    card_name = parent.hand.card_container[i].name;
            }

            //if event card is not selected just stop
            if (card_name === null)
                return;


            if (card_name === 'A Hero Is Born') {

                var visible_part = 250;
                var ver_delta = 25; //vertical delta
                var hor_delta = 117;
                var card_h = 239;
                var s_x = 100;
                var s_y = 500;

                if (parent.draw_big_picture_from_hand === false)
                    return;

                var player_champion_cards = [];

                //get champion cards ref 
                for (var i = 0; i < player.faction.deck.length; i++) {
                    if (player.faction.deck[i].card_class === "champion")
                        player_champion_cards.push(player.faction.deck[i]);
                }

                //draw cards
                for (var i = 0; i < player_champion_cards.length; i++) {
                    ctx.drawImage(player.faction.board_image, player_champion_cards[i].pos_x * player_champion_cards[i].width, player_champion_cards[i].pos_y * player_champion_cards[i].height,
                                    player_champion_cards[i].width, player_champion_cards[i].height, s_x + (i * visible_part), s_y - (i * ver_delta), player_champion_cards[i].width, player_champion_cards[i].height);
                }

                //draw highlight in case of hover
                for (var i = 0; i < player_champion_cards.length; i++) {

                    //check card hover
                    if (
                        ((mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + visible_part) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ||
                        ((mouse_x > s_x + (i + 1) * visible_part) &&
                        (mouse_x < s_x + (i + 1) * visible_part + hor_delta) &&
                        (mouse_y > s_y - (i * ver_delta) + (card_h - ver_delta)) &&
                        (mouse_y < s_y - (i * ver_delta) + card_h))
                        ||
                        ((i === player_champion_cards.length - 1) &&
                        (mouse_x > s_x + (i * visible_part)) &&
                        (mouse_x < s_x + (i * visible_part) + player_champion_cards[i].width) &&
                        (mouse_y > s_y - (i * ver_delta)) &&
                        (mouse_y < s_y + card_h - (i * ver_delta)))
                        ) {

                        ctx.fillStyle = "rgba(233, 233, 233, 0.3)";

                        //additional check for last card
                        if (i === player_champion_cards.length - 1) {
                            ctx.fillRect(s_x + (i * visible_part) + visible_part, s_y - (i * ver_delta), hor_delta, card_h - ver_delta);

                        }
                        ctx.fillRect(s_x + (i * visible_part), s_y - (i * ver_delta), visible_part, card_h);
                        ctx.fillRect(s_x + ((i + 1) * visible_part), s_y - (i * ver_delta) + (card_h - ver_delta), hor_delta, ver_delta);

                    }
                }


            } else if (card_name === 'Freeze') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available attacks
                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if ((parent.board.matrix[i][j] != null) && (parent.board.matrix[i][j].card_class === "common" || parent.board.matrix[i][j].card_class === "champion" || parent.board.matrix[i][j].card_class === "summoner")) {


                            if (parent.board.matrix[i][j].owner === player_login)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            else
                                ctx.fillStyle = "rgba(216, 25, 0, 0.4)";

                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                        }

                    }
                }

            } else if (card_name === 'Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available tails
                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                //hover available tile (green)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            }
                        }
                    }
                }
            } else if (card_name === 'Ice Wall') {

                //check if page handler is active
                if (parent.draw_big_picture || parent.draw_big_picture_from_hand)
                    return;

                //draw available tails
                for (var i = 4; i < 8; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] === null) {
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            if ((parseInt((((mouse_x - parent.board.s_x) / parent.board.square_w))) === j) &&
                                (parseInt((((mouse_y - parent.board.s_y) / parent.board.square_h))) === i)) {

                                //hover available tile (green)
                                ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                ctx.fillRect(parent.board.s_x + (j * parent.board.square_w), parent.board.s_y + (i * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                            }
                        }
                    }
                }
            } else if (card_name === 'Reinforcements') {

                if (parent.draw_big_picture_from_hand === false)
                    return;

                //count number of units on the board for both players
                var player_nb_of_units = 0;
                var opponent_nb_of_units = 0;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null && (parent.board.matrix[i][j].card_class === 'common' || parent.board.matrix[i][j].card_class === 'champion')) {

                            if (parent.board.matrix[i][j].owner === player.name)
                                player_nb_of_units++;
                            else if (parent.board.matrix[i][j].owner === opponent.name)
                                opponent_nb_of_units++;
                        }
                    }
                }

                if (opponent_nb_of_units <= player_nb_of_units) {
                    ctx.drawImage(parent.image, that.use_button_src_xywh[0], that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);
                    return;
                }
                else
                    ctx.drawImage(parent.image, that.use_button_src_xywh[2], that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);

                //check hover
                if ((mouse_x > that.use_button_xywh[0]) &&
                    (mouse_x < that.use_button_xywh[0] + that.use_button_xywh[2]) &&
                    (mouse_y > that.use_button_xywh[1]) &&
                    (mouse_y < that.use_button_xywh[1] + that.use_button_xywh[3])) {

                    ctx.drawImage(parent.image, that.use_button_src_xywh[2] * 2, that.use_button_src_xywh[1], that.use_button_src_xywh[2], that.use_button_src_xywh[3], that.use_button_xywh[0], that.use_button_xywh[1], that.use_button_xywh[2], that.use_button_xywh[3]);

                }


            }
        }
    }

    //board initialization
    that.board = new Board();

    //hand initialization
    that.hand = new Hand();

    //event handler initialization
    that.event_handler = null;
    if (player.faction.faction_name === "Pheonix Elves")
        that.event_handler = new PhoenixElvesEventPhaseHandler();
    else if (player.faction.faction_name === "Tundra Orcs")
        that.event_handler = new TundraOrcsEventPhaseHandler();

    //method definitions
    that.checkHover = function () {

        //check if page handler is active
        if (that.draw_big_picture || that.draw_big_picture_from_hand)
            return;

        //check phase button hover
        if (your_turn) {

            if ((mouse_x > that.btn_phase_x + that.btn_phase_padding) &&
                (mouse_x < that.btn_phase_x + that.btn_phase_wh - that.btn_phase_padding) &&
                (mouse_y > that.btn_phase_y + that.btn_phase_padding) &&
                (mouse_y < that.btn_phase_y + that.btn_phase_wh - that.btn_phase_padding)) {
                that.btn_phase_frame = 2;
                that.btn_phase_hover = true;
            }
            else {
                that.btn_phase_frame = 1;
                that.btn_phase_hover = false;
            }
        }

        //check 'build magic' button hover
        if (that.btn_build_magic_state != 0) {
            if ((mouse_x > that.btn_build_magic_x + that.btn_build_magic_padding) &&
                (mouse_x < that.btn_build_magic_x + that.btn_build_magic_wh - that.btn_build_magic_padding) &&
                (mouse_y > that.btn_build_magic_y + that.btn_build_magic_padding) &&
                (mouse_y < that.btn_build_magic_y + that.btn_build_magic_wh - that.btn_build_magic_padding)) {
                that.btn_build_magic_state = 2;
            }
            else {
                console.log("magic btn set to 1 - checkHover");
                that.btn_build_magic_state = 1;
            }


        }

        //check 'show hand' button hover
        if ((mouse_x > that.btn_hand_x + that.btn_hand_padding) &&
            (mouse_x < that.btn_hand_x + that.btn_hand_wh - that.btn_hand_padding) &&
            (mouse_y > that.btn_hand_y + that.btn_hand_padding) &&
            (mouse_y < that.btn_hand_y + that.btn_hand_wh - that.btn_hand_padding)) {
            that.btn_hand_frame = 1;
            that.btn_hand_hover = true;
        }
        else {
            that.btn_hand_frame = 0;
            that.btn_hand_hover = false;
        }

        //check 'surrender' button hover
        if ((mouse_x > that.btn_surrender_x + that.btn_surrender_padding) &&
            (mouse_x < that.btn_surrender_x + that.btn_surrender_wh - that.btn_surrender_padding) &&
            (mouse_y > that.btn_surrender_y + that.btn_surrender_padding) &&
            (mouse_y < that.btn_surrender_y + that.btn_surrender_wh - that.btn_surrender_padding)) {
            that.btn_surrender_frame = 1;
            that.btn_surrender_hover = true;
        }
        else {
            that.btn_surrender_frame = 0;
            that.btn_surrender_hover = false;
        }
    }

    that.draw = function () {

        //prepare drawing settings for text
        ctx.save();
        ctx.fillStyle = "rgba(255, 248, 215, 0.8)";
        ctx.font = 'Bold 10pt Times New Roman';

        //draw players data
        ctx.fillText(player.name, 870, 60);
        ctx.fillText(player.faction.faction_name, 870, 80);
        ctx.fillText("Magic: " + player.magic_pile.length, 870, 100);
        ctx.fillText("Discard: " + player.discard_pile.length, 870, 120);
        ctx.fillText("Deck: " + player.faction.deck.length, 870, 140);

        //draw opponents data
        ctx.fillText(opponent.name, 870, 230);
        ctx.fillText(opponent.faction.faction_name, 870, 250);
        ctx.fillText("Magic: " + opponent.magic_pile.length, 870, 270);
        ctx.fillText("Discard: " + opponent.discard_pile.length, 870, 290);
        ctx.fillText("Deck: " + opponent.faction.deck.length, 870, 310);


        //draw game phase name
        ctx.font = 'Bold 12pt Times New Roman';
        ctx.fillText("Game phase: ", 850, 410);

        switch (game_phase) {

            case 0:
                ctx.fillText("Draw", 850, 435);
                break;
            case 1:
                ctx.fillText("Summon", 850, 435);
                break;
            case 2:
                ctx.fillText("Events", 850, 435);
                break;
            case 3:
                ctx.fillText("Move", 850, 435);
                break;
            case 4:
                ctx.fillText("Attack", 850, 435);
                break;
            case 5:
                ctx.fillText("Build Magic", 850, 435);
                break;
            case 6:
                ctx.fillText("Blaze Step", 850, 435);
                break;
            case 7:
                ctx.fillText("Game Over", 850, 435);
                break;
            case 8:
                ctx.fillText("Reinforcement", 850, 435);
                break;
            case 9:
                ctx.fillText("Fury", 850, 435);
                break;
            default:
                ctx.fillText("ERROR", 870, 435);

        }

        //restore previous style
        ctx.restore();

        //draw end phase button
        ctx.drawImage(that.image, that.btn_phase_wh * that.btn_phase_frame, that.btn_phase_src_y, that.btn_phase_wh, that.btn_phase_wh, that.btn_phase_x, that.btn_phase_y, that.btn_phase_wh, that.btn_phase_wh);

        //draw 'show hand' button
        ctx.drawImage(that.image, that.btn_hand_wh * that.btn_hand_frame, that.btn_hand_src_y, that.btn_hand_wh, that.btn_hand_wh, that.btn_hand_x, that.btn_hand_y, that.btn_hand_wh, that.btn_hand_wh);

        //draw 'surrender' button
        ctx.drawImage(that.image, that.btn_surrender_wh * that.btn_surrender_frame, that.btn_surrender_src_y, that.btn_surrender_wh, that.btn_surrender_wh, that.btn_surrender_x, that.btn_surrender_y, that.btn_surrender_wh, that.btn_surrender_wh);

        //draw 'build magic' button
        ctx.drawImage(that.image, that.btn_build_magic_wh * that.btn_build_magic_state, that.btn_build_magic_src_y, that.btn_build_magic_wh, that.btn_build_magic_wh, that.btn_build_magic_x, that.btn_build_magic_y, that.btn_build_magic_wh, that.btn_build_magic_wh);
    }

    that.checkMouseAction = function () {

        //check if page handler is active
        if (that.draw_big_picture || that.draw_big_picture_from_hand)
            return;

        //check if 'step phase' button is clicked
        if ((that.btn_phase_hover) === true && (mouse_state === 1) && (game_phase != 7)) {

            //unselect card if any
            that.board.unselectAll();

            if (game_phase === 5) {
                /* END TURN CASE */

                if (player.faction.faction_name === "Pheonix Elves") {
                    game_phase = 6;
                    mouse_state = 2;
                    that.animations.push(new that.Animation(15));
                    socket.emit('PE_blaze_step_phase', { room_name: room_name });
                    that.btn_build_magic_state = 0;
                    return;
                }

                that.btn_phase_frame = 0;
                that.btn_phase_hover = false;
                that.board.resetPreviousMoves();
                game_phase = 1;
                player.attacks_left = 3;
                player.moves_left = 3;
                your_turn = false;
                that.btn_build_magic_state = 0;

                //restore some data related to events
                that.restoreEventsData();

                //emit apropriate event
                socket.emit('end_turn', { room_name: room_name });

                that.animations.push(new that.Animation(0));

                mouse_state = 2;
                return;

            } else if (game_phase === 6) {
                /* END TURN CASE for PE */

                that.btn_phase_frame = 0;
                that.btn_phase_hover = false;
                that.board.resetPreviousMoves();
                game_phase = 1;
                player.attacks_left = 3;
                player.moves_left = 3;
                your_turn = false;
                that.btn_build_magic_state = 0;

                //restore some data related to events
                that.restoreEventsData();

                //emit apropriate event
                socket.emit('end_turn', { room_name: room_name });

                that.animations.push(new that.Animation(0));

                mouse_state = 2;
                return;

            } else if (game_phase === 8) {
                /* REINFORCEMENTS CASE */

                game_phase = 2;

                //emit apropriate event
                socket.emit('step_phase', { room_name: room_name });

                //add 'end phase' animation
                that.animations.push(new that.Animation(0));

                mouse_state = 2;

            } else if (game_phase === 9) {
                /* FURY CASE */

                game_phase = 4;

                //emit apropriate event
                socket.emit('step_phase', { room_name: room_name });

                //add 'end phase' animation
                that.animations.push(new that.Animation(0));

                for (var i = 0; i < that.board.matrix.length; i++) {
                    for (var j = 0; j < that.board.matrix[i].length; j++) {

                        if (that.board.matrix[i][j] != null && that.board.matrix[i][j].is_fury_active) {
                            that.board.matrix[i][j].is_fury_active = false;
                            that.board.matrix[i][j].moves_left = 0;
                            that.board.matrix[i][j].attacked = true;
                        }
                    }
                }

                mouse_state = 2;

            } else {
                /* NORMAL CASE */

                //step game phase
                game_phase += 1;

                //emit apropriate event
                socket.emit('step_phase', { room_name: room_name });

                //add 'end phase' animation
                that.animations.push(new that.Animation(0));
            }

            mouse_state = 2;
        }

        //check if 'show hand' button is clicked
        if ((that.btn_hand_hover) === true && (mouse_state === 1)) {

            /* 0 - closed,
               1 - openning,
               2 - open,
               3 - closing */

            if (that.hand.state === 0)
                that.hand.state = 1;
            else if (that.hand.state === 1)
                that.hand.state = 3;
            else if (that.hand.state === 2)
                that.hand.state = 3;
            else if (that.hand.state === 3)
                that.hand.state = 1;

            that.hand.unselectAll();
            mouse_state = 2;
        }

        //check if 'build magic' button is clicked
        if ((that.btn_build_magic_state === 2) && (mouse_state === 1)) {

            var selected_card_ref = null;

            for (var i = 0; i < that.hand.card_container.length; i++) {

                if (that.hand.card_container[i].selected)
                    selected_card_ref = that.hand.card_container[i];
            }

            if (selected_card_ref === null) return;

            that.hand.unselectAll();
            player.magic_pile.push(selected_card_ref);
            that.hand.removeCard(selected_card_ref);
            that.btn_build_magic_state = 0;
            mouse_state = 2;
            socket.emit('add_to_magic_pile', { room_name: room_name, card_id: selected_card_ref.id })

        }
    }

    that.handleBuildMagicButtonState = function () {

        if (game_phase != 5)
            return;

        for (var i = 0; i < that.hand.card_container.length; i++) {

            if (that.hand.card_container[i].selected) {
                console.log("magic btn set to 1 - handleBuildMagicButton");
                that.btn_build_magic_state = 1; //activate button
                break;
            }

            //if any card is not selected deactivate button
            that.btn_build_magic_state = 0;
        }

        //further building magic actions are perform in checkMouseAction method
    }

    that.restoreEventsData = function () {

        console.log("restoring data");

        for (var i = 0; i < that.board.matrix.length; i++) {
            for (var j = 0; j < that.board.matrix[i].length; j++) {

                if (that.board.matrix[i][j] === null)
                    continue;

                //restore spirit of the pheonix data
                if (that.board.matrix[i][j].spirit_of_the_phoenix)
                    that.board.matrix[i][j].spirit_of_the_phoenix = false;

                //restore taken cards
                if (that.board.matrix[i][j].taken) {

                    that.board.matrix[i][j].taken = false;
                    that.board.matrix[i][j].owner = that.board.matrix[i][j].original_owner;

                }

                if (that.board.matrix[i][j].name === 'Kaeseeall')
                    that.board.matrix[i][j].power_active = true;

            }
        }
    }
}


/***************************FUNCTIONS**************************/
//-----------------------------------------------------------/

var initGame = function () {
    page_handler = new MainMenu();
    player = new Player(player_login);
}

var Clear = function () {

    //draw background
    ctx.drawImage(background_image, 0, 0, width, height, 0, 0, width, height);

    //ctx.fillStyle = 'black'; //set active color 
    //ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white'; //set active color    
    ctx.fillText('mouse x: ' + mouse_x + ', mouse_y: ' + mouse_y, 50, 50);
    ctx.fillText('mouse down: ' + mouse_button_down, 50, 60);
    ctx.fillText('Game state: ' + state, 50, 70);
    ctx.fillText('Room name: ' + room_name, 50, 90);
    ctx.fillText('Player login: ' + player_login, 50, 100);
    ctx.fillText('mouse state: ' + mouse_state, 50, 110);
    ctx.fillText('mouse used: ' + mouse_used, 50, 120);
    ctx.fillText('game phase: ' + game_phase, 50, 130);

}

var rotate180 = function (x, y) {
    c_x = 3;
    c_y = 4;

    return [c_x - (x - c_x) - 1, c_y - (y - c_y) - 1]
}

function srednia(tablica) {
    var suma = 0;
    for (i = 0; i < tablica.length; i++) {
        suma += tablica[i];
    }
    return (suma / i);
}

/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {

    Clear();

    if (!lastRun) {
        lastRun = new Date().getTime();
        requestAnimFrame(gameLoop);
        return;
    }

    if ((mouse_button_down || (mouse_used === false)) && mouse_state === 0) {
        mouse_state = 1;
    }
    else if (mouse_state === 1) {
        mouse_state = 2;
        mouse_used = true;
    }
    else if (mouse_state === 2 && (mouse_button_down === false)) {
        mouse_used = true;
        mouse_state = 0;
    }


    if (state === 0) {
        /* ========= */
        /* main menu */
        /* ========= */
        page_handler.checkHover();
        page_handler.draw();

        var result = page_handler.checkAction();

        //start briefing
        if (result === 1) {

            //change page handler to briefing menu
            page_handler = new BriefingMenu();

            //change game state to briefing
            state = 1;
        } else if (result === 2) {

            page_handler.state = 1;

        } else if (result === 9) {

            page_handler.state = 0;
        }

    }
    else if (state === 1) {
        /* ================== */
        /* faction selection */
        /* ================== */


        page_handler.checkHover();

        page_handler.draw(player);

        var result = page_handler.checkAction();

        //start game button
        if (result === 1) {

            state = 2; //waiting for other players

            //init faction object
            if (player.selected_faction === 0) {
                player.faction = new PheonixElves(player.name);
            }
            else if (player.selected_faction === 1) {
                player.faction = new TundraOrcs(player.name);
            }

            //init player deck
            player.faction.initDeck();

            //send ready event
            socket.emit('player_ready_to_play', {
                room_name: room_name, player_login: player_login, player_faction: player.selected_faction
            })

            //change page handler
            page_handler = new WaitingMenu();

            // << select faction button
        } else if (result === 2) {

            if (player.selected_faction === 0)
                player.selected_faction++;
            else
                player.selected_faction--;

            // select faction button >>
        } else if (result === 3) {

            if (player.selected_faction === 1)
                player.selected_faction--;
            else
                player.selected_faction++;
        }
    }
    else if (state === 2) {
        /* ======================== */
        /* waiting for both players */
        /* ======================== */

        /* page handler and state will be changed */
        /* after receiving 'start play' event     */
        page_handler.draw();

        if (start_play_event) {

            //init opponent deck
            opponent.faction.initDeck();

            //set proper page handler
            page_handler = new PlaygroundHandler();
            console.log("zmiana pagehandlera na PlaygroundHandler");

            //add opponents start cards to board
            var start_cards = opponent.faction.getStartCards();
            for (var i = 0; i < start_cards.length; i++) {
                var tmp_res = rotate180(start_cards[i][1], start_cards[i][2]);
                start_cards[i][1] = tmp_res[0]
                start_cards[i][2] = tmp_res[1]
                page_handler.board.addCard(start_cards[i][0], start_cards[i][1], start_cards[i][2]);
            }

            //add players start cards to board
            start_cards = player.faction.getStartCards();
            for (var i = 0; i < start_cards.length; i++) {
                page_handler.board.addCard(start_cards[i][0], start_cards[i][1], start_cards[i][2]);
            }

            //if(your_turn)
            //    page_handler.hand.fillHand();

            background_image = background_image_with_board;

            //release memory
            background_image_with_board = null;

            state = 3; //play in progress
            start_play_event = false;
        }
    }
    else if (state === 3) {
        /* ========== */
        /* playground */
        /* ========== */

        if (your_turn) {

            if (game_phase === 1) {
                /* ============ */
                /* SUMMON PHASE */
                /* ============ */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //logic layer should not run always
                    page_handler.board.handleDyingCards();
                    page_handler.board.handleTakeovers();
                    page_handler.board.checkMouseActivity();
                    page_handler.board.handleSummon();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //render layer
                page_handler.draw();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.board.drawAvailSummonTails();
                page_handler.board.drawAvailTakeovers();
                page_handler.hand.drawBigPicture();


            } else if (game_phase === 2) {
                /* =========== */
                /* EVENT PHASE */
                /* =========== */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //logic layer should not run always
                    page_handler.board.handleDyingCards();
                    page_handler.event_handler.handleEventPhaseLogic();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //render layer
                page_handler.draw();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.hand.drawBigPicture();
                page_handler.event_handler.handleEventPhaseRender();

            }
            else if (game_phase === 3) {
                /* ========== */
                /* MOVE PHASE */
                /* ========== */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //logic layer should not run always
                    page_handler.board.handleDyingCards();
                    page_handler.board.handleMoves();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //render layer
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.board.drawAvailMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.hand.drawBigPicture();

            }
            else if (game_phase === 4) {
                /* ============ */
                /* ATTACK PHASE */
                /* ============ */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //Phase handler handling
                    page_handler.board.handleDyingCards();
                    page_handler.board.handleAttacks();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //Board handling
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.board.drawAvailAttacks();
                page_handler.hand.drawBigPicture();

            } else if (game_phase === 5) {
                /* ================= */
                /* BUILD MAGIC PHASE */
                /* ================= */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //Phase handler handling
                    page_handler.board.handleDyingCards();
                    page_handler.board.checkMouseActivity();
                    page_handler.handleBuildMagicButtonState();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //Board handling
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.hand.drawBigPicture();

            } else if (game_phase === 6) {
                /* ================ */
                /* BLAZE STEP PHASE */
                /* ================ */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //Phase handler handling
                    page_handler.board.handleDyingCards();
                    page_handler.board.handleBlazeStepPhase();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //Board handling
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.board.drawBlazeStepAvailTails();
                page_handler.hand.drawBigPicture();

            } else if (game_phase === 7) {
                /* ================= */
                /*  GAME OVER PHASE  */
                /* ================= */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //Phase handler handling
                    page_handler.board.handleDyingCards();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //Board handling
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.hand.drawBigPicture();

            } else if (game_phase === 8) {
                /* ======================= */
                /*  REINFORECEMENTS PHASE  */
                /* ======================= */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //logic layer should not run always
                    page_handler.board.handleDyingCards();
                    page_handler.board.checkMouseActivity();
                    page_handler.board.handleSummonReinforcementsPhase();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //render layer
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.board.drawAvailSummonTailsReinforcementsPhase();
                page_handler.hand.drawBigPicture();


            } else if (game_phase === 9) {
                /* ============ */
                /*  FURY PHASE  */
                /* ============ */

                var current = Date.now();
                var elapsed = current - previous;
                previous = current;
                lag += elapsed;

                ite1 += 1;

                while (lag >= MS_PER_UPDATE) {

                    ite2 += 1;

                    //logic layer should not run always
                    page_handler.board.handleDyingCards();
                    page_handler.board.handleFuryPhaseLogic();
                    page_handler.board.checkMouseActivity();
                    page_handler.checkHover();
                    page_handler.checkMouseAction();
                    page_handler.hand.handleAnimation();
                    page_handler.hand.checkHover();
                    page_handler.hand.checkMouseAction();

                    //handle animation in queue
                    for (var i = 0; i < page_handler.animations.length; i++) {
                        page_handler.animations[i].handle();
                    }

                    lag -= MS_PER_UPDATE;
                }

                //render layer
                page_handler.draw();
                page_handler.board.drawPreviousMoves();
                page_handler.hand.draw();
                page_handler.board.draw();
                page_handler.board.handleFuryPhaseRender();
                page_handler.hand.drawBigPicture();


            }


        } else {

            var current = Date.now();
            var elapsed = current - previous;
            previous = current;
            lag += elapsed;

            ite1 += 1;

            while (lag >= MS_PER_UPDATE) {

                ite2 += 1;

                page_handler.board.handleDyingCards();
                page_handler.board.checkMouseActivity();
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.hand.handleAnimation();
                page_handler.hand.checkHover();
                page_handler.hand.checkMouseAction();



                //handle animation in queue
                for (var i = 0; i < page_handler.animations.length; i++) {
                    page_handler.animations[i].handle();
                }

                lag -= MS_PER_UPDATE;
            }

            if (end_turn_event) {

                page_handler.board.resetPreviousMoves();
                page_handler.hand.fillHand();
                game_phase = 1;
                player.attacks_left = 3;
                player.moves_left = 3;
                your_turn = true;
                end_turn_event = false;
                page_handler.restoreEventsData();

            }

            page_handler.draw();
            page_handler.board.drawPreviousMoves();
            page_handler.hand.draw();
            page_handler.board.draw();
            page_handler.hand.drawBigPicture();

        }

        //draw animation in queue
        for (var i = 0; i < page_handler.animations.length; i++) {

            page_handler.animations[i].draw();

            if (page_handler.animations[i].alpha <= 0) {
                page_handler.animations.splice(i, 1);
                i--;
            }
        }

        var delta = (new Date().getTime() - lastRun) / 1000;
        lastRun = new Date().getTime();
        fps = 1 / delta;
        fps_sum.push(fps);

        //TODO remove
        ctx.fillText('your turn: ' + your_turn, 840, 510);
        ctx.fillText(srednia(fps_sum) + " fps", 840, 525);





    }

    requestAnimFrame(gameLoop);
}


initGame(); //TODO inicjalizacja backgrounda, main menu oraz briefing
gameLoop();

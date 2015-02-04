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
                  3 - game in progress */

//game phase indicators
var game_phase = 3; /* 0 - draw phase
                       1 - summon phase
                       2 - event phase
                       3 - move phase (start phase)
                       4 - atack phase
                       5 - build magic phase
                       6 - "Blaze Step" phase (in case one of the player plays pheonix elves deck) */

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

socket.on('start_play', function (data) {

    //set proper page handler
    page_handler = new PlaygroundHandler();

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

    //init opponent deck
    opponent.faction.initDeck();

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

    //determine which player starts 
    //data.starting_player: 0 - first player, 1 - second player
    if (((player.name === data.first_player_name) && (data.starting_player === 0)) || ((player.name === data.second_player_name) && (data.starting_player === 1)))
        your_turn = true;

    background_image = background_image_with_board;

    //release memory
    background_image_with_board = null;

    state = 3; //play in progress
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
    game_phase += 1;

    //add 'end phase' animation
    page_handler.animations = [];
    page_handler.animations.push(new page_handler.Animation(0));
})

//incoming end turn event - start your turn
socket.on('end_turn', function (data) {

    page_handler.board.resetPreviousMoves();
    game_phase = 0;
    player.attacks_left = 3;
    player.moves_left = 3;
    your_turn = true;

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
}

var Card = function (card_name, id, x, y, owner_name, range, attack, lives) {
    var that = this;

    //basic data
    that.name = card_name;
    that.id = id;
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

    that.checkAction = function () {

        if (that.buttons[0] && mouse_state === 1) {
            mouse_state = 2;
            return 1;
        }
        else if (that.buttons[1] && mouse_state === 1) {
            mouse_state = 2;
            null; //TODO draw options
        }
        else if (that.buttons[2] && mouse_state === 1) {
            mouse_state = 2;
            null; //TODO draw credits
        }
        else if (that.buttons[3] && mouse_state === 1) {
            mouse_state = 2;
            null; //TODO exit game
        }

    }

    //TODO draw options
    //TODO draw credits

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
    that.btn_phase_padding = 20;

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

            //get hitted cards coordinates
            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {

                    if ((that.matrix[i][j] != null) && (that.matrix[i][j].id === hitted_card_id)) {

                        hit_card_i = i;
                        hit_card_j = j;
                    }
                }
            }

            //add wounds to hited card
            that.matrix[hit_card_i][hit_card_j].wounds += hits;

            if (that.matrix[hit_card_i][hit_card_j].wounds >= that.matrix[hit_card_i][hit_card_j].lives) {
                that.matrix[hit_card_i][hit_card_j].wounds = that.matrix[hit_card_i][hit_card_j].lives; //only for displaying purpose
                that.matrix[hit_card_i][hit_card_j].dying = true;
                that.matrix[hit_card_i][hit_card_j].hover = false;
                that.matrix[hit_card_i][hit_card_j].selected = false;
            }

            //add 'nb of hits' animation and clear container if any animation is hanging
            parent.animations = [];
            parent.animations.push(new parent.Animation(2, hits, attack_strangth, attacking_card_id, hitted_card_id));
            parent.animations.push(new parent.Animation(1, hits, attack_strangth));
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

            /* This function is independent from game phase
            
               function of this method:
               - in case of hover change "hover indicator" in Card object
               - in case of click on card change "selection indicator" in Card object
            */

            //check if user want to unselect focused card
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

            for (var i = 0; i < that.matrix.length; i++) {
                for (var j = 0; j < that.matrix[i].length; j++) {
                    if (that.matrix[i][j] != null && that.matrix[i][j].dying) {

                        that.matrix[i][j].cnt++;
                        if (that.matrix[i][j].cnt > 100)
                            that.matrix[i][j].alpha -= 0.005;

                        if (that.matrix[i][j].alpha <= 0) {
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
                        if (that.matrix[i][j].owner === player.name)
                            //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
                            ctx.drawImage(player.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].board_w, (2 * that.matrix[i][j].height) + (that.matrix[i][j].pos_y * that.matrix[i][j].board_h),
                                that.matrix[i][j].board_w, that.matrix[i][j].board_h, that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                        else if (that.matrix[i][j].owner === opponent.name) {
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
                        if (that.matrix[i][j].hover)
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
                        if (that.matrix[i][j].owner === player.name)
                            ctx.drawImage(player.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].width, that.matrix[i][j].pos_y * that.matrix[i][j].height,
                                that.matrix[i][j].width, that.matrix[i][j].height, 329, 200, that.matrix[i][j].width, that.matrix[i][j].height);
                        else if (that.matrix[i][j].owner === opponent.name)
                            ctx.drawImage(opponent.faction.board_image, that.matrix[i][j].pos_x * that.matrix[i][j].width, that.matrix[i][j].pos_y * that.matrix[i][j].height,
                                that.matrix[i][j].width, that.matrix[i][j].height, 329, 200, that.matrix[i][j].width, that.matrix[i][j].height);

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
            if (that.matrix[card_i][card_j].draw_big_picture)
                return;

            //if cards owner is not a player break function
            if (that.matrix[card_i][card_j].owner != player.name)
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
            if (that.matrix[card_i][card_j].draw_big_picture)
                return;

            //if cards owner is not a player break function
            if (that.matrix[card_i][card_j].owner != player.name)
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

            //draw available attacks
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

                                that.matrix[card_i][card_j].attacked = true;
                                mouse_state = 2;

                                that.resolveAttack(hits, that.matrix[card_i][card_j].attack, that.matrix[card_i][card_j].id, that.matrix[i][j].id);

                                socket.emit('resolve_attack', {
                                    room_name: room_name,
                                    hits: hits,
                                    attack_strangth: that.matrix[card_i][card_j].attack,
                                    attacking_card_id: that.matrix[card_i][card_j].id,
                                    hitted_card_id: that.matrix[i][j].id
                                });
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
        that.card_container = [new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 1, player.name, 4, 1, 1), new Card('Archer', 'pe1', 1, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1), new Card('Archer', 'pe1', 0, 0, player.name, 4, 1, 1)];
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
                                ctx.drawImage(parent.image, 0, that.board.sheet_origin, that.card_container[i].board_w, that.card_container[i].board_h,
                                    that.current_pos + that.card_container_s_x, that.y + that.card_container_s_y + (i * that.card_container[i].board_h) + (i * that.gap_between_cards),
                                    that.card_container[i].board_w, that.card_container[i].board_h);
                            } else {
                                ctx.drawImage(parent.image, 130, that.board.sheet_origin, that.card_container[i].board_w, that.card_container[i].board_h,
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

            if(mouse_state != 1)
                return;

            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i].draw_big_picture_from_hand) {
                    that.card_container[i].draw_big_picture_from_hand = false;
                    parent.draw_big_picture_from_hand = false;
                    mouse_state = 2;
                    return;
                }
            }

            for (var i = 0; i < that.card_container.length; i++) {

                if (that.card_container[i] != null) {

                    if (!that.card_container[i].selected && that.card_container[i].hover) {
                        that.card_container[i].selected = true;
                        mouse_state = 2;
                        return;
                    }
                    else if (that.card_container[i].selected && that.card_container[i].hover && !that.card_container[i].hover_eyeglass) {
                        that.card_container[i].selected = false;
                        mouse_state = 2;
                        return;
                    }
                    else if (that.card_container[i].selected && that.card_container[i].hover && that.card_container[i].hover_eyeglass) {
                        that.card_container[i].draw_big_picture_from_hand = true;
                        parent.draw_big_picture_from_hand = true;
                        mouse_state = 2;
                        return;
                    }

                }
            }
        }


        that.fillHand = function () {


            var nb_of_cards = 0;
            for (var i = 0; i < that.card_container.length; i++)
                if (that.card_container[i] != null)
                    nb_of_cards += 1;

            //for(var i = nb_of_cards; i < 5; i++)

        }
    }

    this.Animation = function (type, hits, shoots, attacking_card_id, hitted_card_id) {

        /* types definitions:
           0 - 'End Phase' animation: only 'type' argument required
           1 - 'x/y hits' animation: 'hits' and 'shoots' animation are required
           2 - 'arrows' animation: all arguments are required
        */

        var that = this;
        that.type = type;

        //image settings
        that.sheet_origin = 401; //indicates start 'y' point for animation graphics in the sheet
        that.sheet_hor_arrows_origin = 601; //indicates start 'y' point for horizontal arrows
        that.sheet_ver_arrows_origin = 941; //indicates start 'y' point for vertical arrows

        that.attacking_card_id = attacking_card_id;
        that.hitted_card_id = hitted_card_id;

        that.alpha = 1;
        that.cnt = 0;

        /* for education purpose
           a = typeof a !== 'undefined' ? a : 42;
       b = typeof b !== 'undefined' ? b : 'default_b';
       */

        if (that.type === 2) {

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

            //TODO remove this after tests
            if (that.attacking_card_x === null ||
                that.attacking_card_y === null ||
                that.hitted_card_x === null ||
                that.hitted_card_y === null) {

                alert("Blad 5007");
            }

        }

        that.handle = function () {

            that.cnt++;

            if (that.cnt > 100) {
                that.alpha -= 0.005;

                //alpha must not have negative value
                if (that.alpha < 0)
                    that.alpha = 0;
            }

        }

        that.draw = function () {

            ctx.save();
            ctx.globalAlpha = that.alpha;

            if (that.type === 0)
                ctx.drawImage(parent.image, 0, that.sheet_origin, 350, 100, 337, 334, 350, 100);
            else if (that.type === 1) {

                ctx.drawImage(parent.image, 50 * hits, that.sheet_origin + 100, 50, 100, 362, 334, 50, 100);
                ctx.drawImage(parent.image, 350, that.sheet_origin + 100, 50, 100, 412, 334, 50, 100);
                ctx.drawImage(parent.image, 50 * shoots, that.sheet_origin + 100, 50, 100, 462, 334, 50, 100);
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


            ctx.restore();

        }

    }

    //board initialization
    that.board = new Board();

    //hand initialization
    that.hand = new Hand();

    //method definitions
    that.checkHover = function () {

        //check if page handler is active
        if (that.draw_big_picture)
            return;

        //check phase button hover
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

        //restore previous style
        ctx.restore();

        //draw end phase button
        ctx.drawImage(that.image, that.btn_phase_wh * that.btn_phase_frame, that.btn_phase_src_y, that.btn_phase_wh, that.btn_phase_wh, that.btn_phase_x, that.btn_phase_y, that.btn_phase_wh, that.btn_phase_wh);

        //draw 'show hand' button
        ctx.drawImage(that.image, that.btn_hand_wh * that.btn_hand_frame, that.btn_hand_src_y, that.btn_hand_wh, that.btn_hand_wh, that.btn_hand_x, that.btn_hand_y, that.btn_hand_wh, that.btn_hand_wh);

        //draw 'surrender' button
        ctx.drawImage(that.image, that.btn_surrender_wh * that.btn_surrender_frame, that.btn_surrender_src_y, that.btn_surrender_wh, that.btn_surrender_wh, that.btn_surrender_x, that.btn_surrender_y, that.btn_surrender_wh, that.btn_surrender_wh);
    }

    that.checkMouseAction = function () {

        //check if page handler is active
        if (that.draw_big_picture)
            return;

        //check if phase stepping is requested
        if ((that.btn_phase_hover) === true && (mouse_state === 1)) {

            //unselect card if any
            that.board.unselectAll();

            if (game_phase > 5) {
                return;

            } else if (game_phase === 5) {

                if (player.faction.name != "TODO") {

                    that.board.resetPreviousMoves();
                    game_phase = 0;
                    that.btn_phase_frame = 0;
                    player.attacks_left = 3;
                    player.moves_left = 3;
                    your_turn = false;

                    //TODO fillHand

                    //emit apropriate event
                    socket.emit('end_turn', { room_name: room_name });
                    return;
                }
            } else {
                //BLAZE STEP HANDLING

                //step game phase
                game_phase += 1;

                //emit apropriate event
                socket.emit('step_phase', { room_name: room_name });

                //add 'end phase' animation
                that.animations.push(new that.Animation(0));
            }

            mouse_state = 2;
        }


        if ((that.btn_hand_hover) === true && (mouse_state === 1)) {

            if (that.hand.state === 0)
                that.hand.state = 1;
            else if (that.hand.state === 1)
                that.hand.state = 3;
            else if (that.hand.state === 2)
                that.hand.state = 3;
            else if (that.hand.state === 3)
                that.hand.state = 1;

            mouse_state = 2;
        }


    }
}

/***************************FUNCTIONS**************************/
//-----------------------------------------------------------/

var initGame = function () {
    page_handler = new MainMenu();
    player = new Player(player_login);
    /* REMOVE
    board = new Board();
    */
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

        //TODO mogla by to byc jakas animacja, co?
    }
    else if (state === 3) {
        /* ========== */
        /* playground */
        /* ========== */

        if (your_turn) {

            if (game_phase === 0) {
                /* ========== */
                /* DRAW PHASE */
                /* ========== */

                //Phase handler handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                //Board handling
                page_handler.board.draw();
                page_handler.board.checkMouseActivity();

            } else if (game_phase === 1) {
                /* ============ */
                /* SUMMON PHASE */
                /* ============ */

                //Phase handler handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                //Board handling
                page_handler.board.draw();
                page_handler.board.checkMouseActivity();

            } else if (game_phase === 2) {
                /* =========== */
                /* EVENT PHASE */
                /* =========== */

                //Phase handler handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                //Board handling
                page_handler.board.draw();
                page_handler.board.checkMouseActivity();

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



            } else if (game_phase === 5) {
                /* ================= */
                /* BUILD MAGIC PHASE */
                /* ================= */

                //Phase handler handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                //Board handling
                page_handler.board.drawPreviousMoves();
                page_handler.board.draw();
                page_handler.board.checkMouseActivity();

            } else if (game_phase === 6) {
                /* ================ */
                /* BLAZE STEP PHASE */
                /* ================ */

                page_handler.board.drawPreviousMoves();
                page_handler.board.draw();

                //Phase button handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                page_handler.board.checkMouseActivity();

            }


        } else {

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

                //handle animation in queue
                for (var i = 0; i < page_handler.animations.length; i++) {
                    page_handler.animations[i].handle();
                }

                lag -= MS_PER_UPDATE;
            }

            page_handler.board.drawPreviousMoves();
            page_handler.draw();
            page_handler.board.draw();

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

        //TODO DEL temporary printouts
        ctx.fillText('your opponent: ' + opponent.name, 840, 500);
        ctx.fillText('your turn: ' + your_turn, 840, 510);
        ctx.fillText('game phase: ' + game_phase, 840, 520);


        ctx.fillText(srednia(fps_sum) + " fps", 840, 540);
        ctx.fillText("ite1: " + ite1, 840, 550);
        ctx.fillText("ite2: " + ite2, 840, 560);
        ctx.fillText("ite_dif: " + (ite2 - ite1), 840, 570);


    }



    requestAnimFrame(gameLoop);
}


initGame(); //TODO inicjalizacja backgrounda, main menu oraz briefing
gameLoop();

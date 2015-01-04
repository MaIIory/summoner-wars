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

var game_phase = 3; /* 0 - draw phase
                       1 - summon phase
                       2 - event phase
                       3 - move phase (start phase)
                       4 - atack phase
                       5 - build magic phase */

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
//players settings
var player = null;
var opponent = null;

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
}, false);

canvas.addEventListener('mouseup', function (evt) {
    mouse_button_down = false;
    mouse_state = 0;
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

/***************************CLASSES****************************/
//-----------------------------------------------------------//

var Player = function (name) {

    var that = this;
    that.name = name;
    that.selected_faction = 0; //0 - Phoenics Elves by default, 1 - Tundra Orcs
    that.faction = null;
    that.moves_left = 2;  //in first turn player has 2 moves
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
    that.selected = false;
    that.draw_big_picture = false;

    //move phase data
    that.moves_left = 2;
    that.previous_moves = []; //container for coordinates with previous moves in the same turn

    //atack phase data
    that.lives = lives;
    that.wounds = 0; //received wounds
    that.attacked = false; //indicate if card already attacked in this turn
    /* range of card attacks
       event cards has range 0, so wall cant attacks */
    that.range = range;
    that.attack = attack; //attack strength
    that.dying = false; //indicator if card is going to die
    that.alpha = 1; //when card is dying alpha should be decremented
    that.cnt = 0; //for delay 

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
    that.btn_phase_wh = 200; //button width and height
    that.btn_phase_frame = 0; //0 - not active, 1 - active not hovered, 1 - active hovered
    that.btn_phase_hover = false;
    that.btn_phase_x = 810;
    that.btn_phase_y = 560;

    that.animations = [];

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
        that.sheet_origin = 200; //indicates start 'y' point for board graphics in the parent sheet

        //wounds data - small icon
        that.wounds_src_x = 18;
        that.wounds_src_y = 85;
        that.wounds_s_x = 30;
        that.wounds_s_y = 21;
        that.wounds_w = 7;
        that.wounds_h = 7;
        that.hor_diff_between = 6;
        that.ver_diff_between = 7;

        //wounds data - 'draw in big picture' icon
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
                        if ((mouse_state === 1)) {
                            that.matrix[i][j].draw_big_picture = false;
                            mouse_state = 2;
                        }
                        return;
                    }
                }
            }

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
                            }
                                //check if player click eyeglass (20x20px in the middle of the card)
                            else if (that.matrix[i][j].selected &&
                                (mouse_state === 1) &&
                                (mouse_x > ((that.s_x + (j * that.square_w) + (that.square_w / 2))) - 15) &&
                                (mouse_x < ((that.s_x + (j * that.square_w) + (that.square_w / 2))) + 15) &&
                                (mouse_y > ((that.s_y + (i * that.square_h) + (that.square_h / 2))) - 15) &&
                                (mouse_y < ((that.s_y + (i * that.square_h) + (that.square_h / 2))) + 15)) {
                                that.matrix[i][j].draw_big_picture = true;
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
            if (mouse_state === 1)
                mouse_state = 2;

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

                            that.matrix[i][j].cnt++;
                            if (that.matrix[i][j].cnt > 130)
                                that.matrix[i][j].alpha -= 0.01;
                            ctx.restore();

                            if (that.matrix[i][j].alpha <= 0) {
                                that.matrix[i][j] = null;
                                continue;
                            }

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

            //TODO This function should be optimized - draw methods should be closed in one internal method
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

        that.drawAndHandleAvailMoves = function () {


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

                            //highlight this tile if available
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

                            if ((parseInt((((mouse_x - that.s_x) / that.square_w))) === j) &&
                                (parseInt((((mouse_y - that.s_y) / that.square_h))) === i) &&
                                ((i != card_i) || (j != card_j)) &&
                                (that.matrix[i][j] === null)) {

                                //hover available tiles
                                ctx.fillStyle = "rgba(4, 124, 10, 0.45)";
                                ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

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

        that.drawAndHandleAvailAttacks = function () {
             
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

                    if ((that.matrix[i][j] != null) && ((card_i != i) || (card_j != j)) && ((!that.matrix[i][j].dying))) {

                        //indicator if this card may be attacked
                        var attack_available = false;

                        //check if card is in horizontal range
                        if (((Math.abs(card_i - i) <= that.matrix[card_i][card_j].range)) && (card_j === j)) {

                            attack_available = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_i - i) ; k++) {
                                if (that.matrix[card_i - (k * ((card_i - i) / (card_i - i)))][j] != null) {
                                    attack_available = false;
                                }
                            }
                        }

                        //check if card is in vertical range
                        if (((Math.abs(card_j - j) <= that.matrix[card_i][card_j].range)) && (card_i === i)) {

                            attack_available = true;

                            //check horizontal blocking card
                            for (var k = 1; k < Math.abs(card_j - j) ; k++) {
                                if (that.matrix[i][card_j - (k * ((card_j - j) / (card_j - j)))] != null) {
                                    attack_available = false;
                                }
                            }
                        }

                        if (!attack_available)
                            continue;


                        //highlight this tile if attack available (different color for owners card)
                        if (that.matrix[i][j].owner === player_login)
                            ctx.fillStyle = "rgba(4, 124, 10, 0.4)";
                            //ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                        else
                            ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                        ctx.fillRect(that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);

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
        that.sheet_origin = 301; //indicates start 'y' point for animation graphics in the sheet
        that.sheet_hor_arrows_origin = 501; //indicates start 'y' point for horizontal arrows
        that.sheet_ver_arrows_origin = 841; //indicates start 'y' point for vertical arrows

        that.attacking_card_id = attacking_card_id;
        that.hitted_card_id = hitted_card_id;

        that.alpha = 1;
        that.cnt = 0;

        /* for education purpose
           a = typeof a !== 'undefined' ? a : 42;
       b = typeof b !== 'undefined' ? b : 'default_b';
       */

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


                var attacking_card_x = null;
                var attacking_card_y = null;

                var hitted_card_x = null;
                var hitted_card_y = null;

                for (var i = 0; i < parent.board.matrix.length; i++) {
                    for (var j = 0; j < parent.board.matrix[i].length; j++) {

                        if (parent.board.matrix[i][j] != null) {

                            if (parent.board.matrix[i][j].id === that.attacking_card_id) {
                                attacking_card_x = i;
                                attacking_card_y = j;
                            }

                            if (parent.board.matrix[i][j].id === that.hitted_card_id) {
                                hitted_card_x = i;
                                hitted_card_y = j;
                            }

                        }
                    }
                }

                //TODO remove this after tests
                if (attacking_card_x === null || attacking_card_y === null || hitted_card_x === null || hitted_card_y === null) {
                    alert("Blad 5007");
                }

                ctx.fillStyle = "rgba(223, 185, 10, 0.4)";
                ctx.fillRect(parent.board.s_x + (attacking_card_y * parent.board.square_w), parent.board.s_y + (attacking_card_x * parent.board.square_h), parent.board.square_w, parent.board.square_h);
                ctx.fillStyle = "rgba(216, 25, 0, 0.4)";
                ctx.fillRect(parent.board.s_x + (hitted_card_y * parent.board.square_w), parent.board.s_y + (hitted_card_x * parent.board.square_h), parent.board.square_w, parent.board.square_h);

                //one of the above dimensions should be equal to zero
                var ver_diff = hitted_card_x - attacking_card_x; //horizontal difference
                var hor_diff = hitted_card_y - attacking_card_y; //vertical difference

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
                ctx.translate(parent.board.s_x + (attacking_card_y * parent.board.square_w) + (parent.board.square_w / 2), parent.board.s_y + (attacking_card_x * parent.board.square_h) + (parent.board.square_h / 2)); //change rotation point to the middle of the tank
                ctx.rotate(angle * (Math.PI / 180)); //rotate context according to arrow direction

                if (hor_diff != 0)
                    ctx.drawImage(parent.image, 0, that.sheet_hor_arrows_origin + ((arrow_len - 1) * 85), 130 + (arrow_len * parent.board.square_w), 85, (parent.board.square_w / 2) * (-1), (parent.board.square_h / 2) * (-1), 130 + (arrow_len * parent.board.square_w), 85);
                else
                    ctx.drawImage(parent.image, 0, that.sheet_ver_arrows_origin + ((arrow_len - 1) * 130), 85 + (arrow_len * parent.board.square_h), 130, (parent.board.square_h / 2) * (-1), (parent.board.square_w / 2) * (-1), 85 + (arrow_len * parent.board.square_h), 130);


                ctx.restore(); //load stored context settings
            }

            that.cnt++;

            if (that.cnt > 110)
                that.alpha -= 0.01;
            ctx.restore();

        }

    }

    that.board = new Board();

    //method definitions
    that.checkHover = function () {

        //check phase button hover
        if ((mouse_x > that.btn_phase_x) &&
            (mouse_x < that.btn_phase_x + that.btn_phase_wh) &&
            (mouse_y > that.btn_phase_y) &&
            (mouse_y < that.btn_phase_y + that.btn_phase_wh)) {
            that.btn_phase_frame = 2;
            that.btn_phase_hover = true;
        }
        else {
            that.btn_phase_frame = 1;
            that.btn_phase_hover = false;
        }

    }

    that.draw = function () {

        //draw players data
        ctx.save();
        ctx.fillStyle = "rgba(255, 248, 215, 0.8)";
        ctx.font = '12pt Harrington';
        ctx.fillText(player.name, 870, 60);
        ctx.fillText(player.faction.name, 870, 80);
        ctx.fillText("Magic: " + player.magic_pile.length, 870, 100);
        ctx.fillText("Discard Pile: " + player.discard_pile.length, 870, 120);
        ctx.fillText("Deck: " + player.faction.deck.length, 870, 140);
        ctx.restore();

        //draw opponents data

        //draw end phase button
        ctx.drawImage(that.image, that.btn_phase_wh * that.btn_phase_frame, 0, that.btn_phase_wh, that.btn_phase_wh, that.btn_phase_x, that.btn_phase_y, that.btn_phase_wh, that.btn_phase_wh);
    }

    that.checkMouseAction = function () {

        //check if phase stepping is requested
        if ((that.btn_phase_hover) === true && (mouse_state === 1)) {

            //step game phase
            game_phase += 1;

            //unselect card if any
            that.board.unselectAll();

            //emit apropriate event
            socket.emit('step_phase', { room_name: room_name });

            //add 'end phase' animation
            that.animations.push(new that.Animation(0));

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

}

var rotate180 = function (x, y) {
    c_x = 3;
    c_y = 4;

    return [c_x - (x - c_x) - 1, c_y - (y - c_y) - 1]
}

/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {

    Clear();

    if (mouse_button_down && mouse_state === 0)
        mouse_state = 1;
        

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

            } else if (game_phase === 1) {

            } else if (game_phase === 2) {

            }
                /* ========== */
                /* MOVE PHASE */
                /* ========== */
            else if (game_phase === 3) {

                page_handler.board.drawAndHandleAvailMoves();
                page_handler.board.drawPreviousMoves();

                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                page_handler.board.checkMouseActivity();
                page_handler.board.draw();

            }
                /* =========== */
                /* ATACK PHASE */
                /* =========== */
            else if (game_phase === 4) {

                page_handler.board.drawPreviousMoves();
                page_handler.board.draw();

                page_handler.board.drawAndHandleAvailAttacks();

                //Phase button handling
                page_handler.checkHover();
                page_handler.checkMouseAction();
                page_handler.draw();

                page_handler.board.checkMouseActivity();

            } else if (game_phase === 5) {

                page_handler.board.drawPreviousMoves();

            }




        } else {

            page_handler.board.drawPreviousMoves();

            page_handler.draw();
            page_handler.board.checkMouseActivity();
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
        

        //temporary printouts
        ctx.fillText('your opponent: ' + opponent.name, 840, 500);
        ctx.fillText('your turn: ' + your_turn, 840, 510);
        ctx.fillText('game phase: ' + game_phase, 840, 520);


    }

    requestAnimFrame(gameLoop);
}


initGame(); //TODO inicjalizacja backgrounda, main menu oraz briefing
gameLoop();

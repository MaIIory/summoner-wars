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
                  3 - play in progress */

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
var trigger_pulled = false;

//players settings
var player = null;
var opponent = null;

//board initialization
var board = null;

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
            window.setTimeout(callback, 1000 / 40);
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
    trigger_pulled = false;
}, false);

socket.on('start_play', function (data) {
    //TODO prepare board = set page handler

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

    //add oppnents start cards to board
    var start_cards = opponent.faction.getStartCards();

    for (var i = 0; i < start_cards.length; i++) {
        var tmp_res = rotate180(start_cards[i][1], start_cards[i][2]);
        start_cards[i][1] = tmp_res[0]
        start_cards[i][2] = tmp_res[1]
        board.addCard(start_cards[i][0], start_cards[i][1], start_cards[i][2]);
    }

    //determine who start 
    //data.starting_player: 0 - first player, 1 - second player
    if (((player.name === data.first_player_name) && (data.starting_player === 0)) || ((player.name === data.second_player_name) && (data.starting_player === 1)))
        your_turn = true;

    state = 3; //play in progress
})


/***************************CLASSES****************************/
//-----------------------------------------------------------//

var Player = function (name) {

    var that = this;
    that.name = name;
    that.selected_faction = 0; //Phoenic Elves by default, 1 - Tundra Orcs
    that.faction = null;

    //TODO dane ponizej moga wchodzic w sklad faction
    //that.magic_pile = [];
    //that.deck = [];
    //that.discard_pile = [];
    //that.hand = [];
}

var Card = function (card_name, id, x, y, owner_name/*, type, ability, ability_mandatory, atack, life_points, cost*/) {
    var that = this;

    //basic data
    that.name = card_name;
    that.id = id;
    that.owner = owner_name;

    //image source and draw data
    that.src_x = x;
    that.src_y = y;
    that.height = 239;
    that.width = 367;
    that.hover = false;
    that.selected = false;
    that.draw_big_picture = false;

    /* for future purpose
    that.type = type; // 0: Summon, 1: Unit, 2:Ability
    that.ability = ability;
    that.ability_mandatory = ability_mandatory;
    that.atack = atack;
    that.life_points = life_points;
    that.cost = cost;
    */
    that.draw = function (image) {

    }
}

var Board = function () {

    var that = this;

    that.s_x = 40; /*   Starting    */
    that.s_y = 40; /* coordinations */

    that.square_w = 130;
    that.square_h = 85;

    //load board image
    that.background_image = new Image(); //background image
    that.background_image.src = "/img/board.jpg";

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

    that.checkMouseActivity = function () {

        /* function of this method:
           - in case of hover change "hover indicator" in Card object
           - in case of click on card change "selection indicator" in Card object
        */

        for (var i = 0; i < that.matrix.length; i++) {
            for (var j = 0; j < that.matrix[i].length; j++) {
                if (that.matrix[i][j] != null) {

                    //check if mouse is over card
                    if ((mouse_x > that.s_x + (j * that.square_w)) &&
                        (mouse_x < that.s_x + (j * that.square_w) + that.square_w) &&
                        (mouse_y > that.s_y + (i * that.square_h)) &&
                        (mouse_y < that.s_y + (i * that.square_h) + that.square_h)) {

                        that.matrix[i][j].hover = true;

                        //check if player wish to to select card
                        if (mouse_button_down)
                            that.matrix[i][j].selected = true;

                        //TODO something with control menu

                        //check if player click eyeglass (20x20px in the middle of the card)
                        if (that.matrix[i][j].selected &&
                            mouse_button_down &&
                            (mouse_x > ((that.s_x + (j * that.square_w) + (that.square_w / 2))) - 10) &&
                            (mouse_x < ((that.s_x + (j * that.square_w) + (that.square_w / 2))) + 10) &&
                            (mouse_y > ((that.s_y + (i * that.square_h) + (that.square_h / 2))) - 10) &&
                            (mouse_y < ((that.s_y + (i * that.square_h) + (that.square_h / 2))) + 10))
                            that.matrix[i][j].draw_big_picture = true;
                    }
                    else {

                        that.matrix[i][j].hover = false;

                        //check id player wish to deselect card
                        if (mouse_button_down) {
                            that.matrix[i][j].selected = false;
                            that.matrix[i][j].draw_big_picture = false;

                        }
                    }
                }
            }
        }


    }

    that.draw = function () {

        // TODO uncomment this line when rest of the game will be finished
        //and modify Clear() function 
        //ctx.drawImage(that.background_image, 0, 0, width, height, 0, 0, width, height);

        for (var i = 0; i < that.matrix.length; i++) {
            for (var j = 0; j < that.matrix[i].length; j++) {
                if (that.matrix[i][j] != null) {


                    //check card owner in order to load proper faction image
                    if (that.matrix[i][j].owner === player.name)
                        //drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
                        ctx.drawImage(player.faction.image, that.matrix[i][j].src_x, that.matrix[i][j].src_y, that.matrix[i][j].width, that.matrix[i][j].height,
                            that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                    else if (that.matrix[i][j].owner === opponent.name) {
                        ctx.drawImage(opponent.faction.image, that.matrix[i][j].src_x, that.matrix[i][j].src_y, that.matrix[i][j].width, that.matrix[i][j].height,
                            that.s_x + (j * that.square_w), that.s_y + (i * that.square_h), that.square_w, that.square_h);
                    }
                    else {
                        $("#dialog").text("Error: Card owned not found!");
                        $('#dialog').dialog('open');
                    }

                    if (that.matrix[i][j].hover)
                        ctx.fillText('HOVER', that.s_x + (j * that.square_w) + 20, that.s_y + (i * that.square_h) + 20);

                    if (that.matrix[i][j].selected)
                        ctx.fillText('SELECTED', that.s_x + (j * that.square_w) + 20, that.s_y + (i * that.square_h) + 40);

                    if (that.matrix[i][j].draw_big_picture) {
                        //ctx.fillText("TRUE", that.s_x + (j * that.square_w) + 20, that.s_y + (i * that.square_h) + 50);
                        //ctx.fillStyle = 'black'; //set active color 
                        //ctx.fillRect(0, 0, width, height);
                        //ctx.drawImage(player.faction.image, that.matrix[i][j].src_x, that.matrix[i][j].src_y, that.matrix[i][j].width, that.matrix[i][j].height,
                        //    (width / 2) - (that.matrix[i][j].width / 2), (height / 2) - (that.matrix[i][j].height / 2), that.matrix[i][j].width, that.matrix[i][j].height);
                        ctx.drawImage(player.faction.image, that.matrix[i][j].src_x, that.matrix[i][j].src_y, that.matrix[i][j].width, that.matrix[i][j].height, 329, 200, that.matrix[i][j].width, that.matrix[i][j].height);
                    }

                }
            }
        }
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

        if (that.buttons[0] && mouse_button_down)
            return 1;
        else if (that.buttons[1] && mouse_button_down)
            null; //TODO draw options
        else if (that.buttons[2] && mouse_button_down)
            null; //TODO draw credits
        else if (that.buttons[3] && mouse_button_down)
            null; //TODO exit game

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

        if (that.btn_begin_hoover === 1 && mouse_button_down && !trigger_pulled) {
            trigger_pulled = true;
            return 1;
        }

        if (that.buttons[0] === 1 && mouse_button_down && !trigger_pulled) {
            trigger_pulled = true;
            return 2;
        }
        if (that.buttons[1] === 1 && mouse_button_down && !trigger_pulled) {
            trigger_pulled = true;
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
}

/***************************FUNCTIONS**************************/
//-----------------------------------------------------------/

var initGame = function () {
    page_handler = new MainMenu();
    player = new Player(player_login);
    board = new Board();
}

var Clear = function () {

    //in state 3 (play in progress) background is draw with board
    //to save memmory background is marged with board to one picture
    if (state === 3)
        ctx.drawImage(background_image_with_board, 0, 0, width, height, 0, 0, width, height);
    else
        ctx.drawImage(background_image, 0, 0, width, height, 0, 0, width, height);


    //ctx.fillStyle = 'black'; //set active color 
    //ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white'; //set active color    
    ctx.fillText('mouse x: ' + mouse_x + ', mouse_y: ' + mouse_y, 50, 50);
    ctx.fillText('mouse down: ' + mouse_button_down, 50, 60);
    ctx.fillText('Game state: ' + state, 50, 70);
    ctx.fillText('Room name: ' + room_name, 50, 90);
    ctx.fillText('Player login: ' + player_login, 50, 100);

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

            //add start cards to board
            var start_cards = player.faction.getStartCards();
            for (var i = 0; i < start_cards.length; i++) {
                board.addCard(start_cards[i][0], start_cards[i][1], start_cards[i][2]);
            }

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

            } else if (game_phase === 3) {
                /* PSEUDO 
                board.checkHover(); draw eyeglass for all card

                */

            } else if (game_phase === 4) {

            } else if (game_phase === 5) {

            }

        } else {



        }

        board.checkMouseActivity();
        board.draw();
        ctx.fillText('your opponent: ' + opponent.name, 840, 600);
        ctx.fillText('your turn: ' + your_turn, 840, 610);
    }




    requestAnimFrame(gameLoop);
}


initGame(); //TODO inicjalizacja backgrounda, main menu oraz briefing
gameLoop();

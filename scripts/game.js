//alert("asdasd");
/*********************VARIABLES DECLARATION********************/
//-----------------------------------------------------------//
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var width = 1024;   //canvas width and background image
var height = 768;   //canvas height and background image

//load background image
var background_image = new Image();
background_image.src = "/img/background.jpg";

//game state
var state = 0; /* 0 - main menu
                  1 - briefing (faction selection)
                  2 - waiting for other players 
                  3 - play in progress */

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
    trigger_pulled = false;
}, false);

socket.on('start_play', function (data) {
    //TODO prepare board = set page handler
    //TODO set proper player according to received data
    //TODO init opponent deck
    state = 3; //play in progress
})


/***************************CLASSES****************************/
//-----------------------------------------------------------//

var Player = function () {

    var that = this;
    that.selected_faction = 0; //Phoenic Elves by default
    that.faction = null;
    that.total_card_nb = 34;
    that.magic_pile = [];
    that.deck = [];
    that.discard_pile = [];
    that.hand = [];
}

var Card = function (name, id, x, y/*, type, ability, ability_mandatory, atack, life_points, cost*/) {
    var that = this;

    //basic data
    that.name = name;
    that.id = id;
    
    //image source and draw data
    that.src_x = x;
    that.src_y = y;
    that.height = 367;
    that.width = 239;

    /*
    that.type = type; // 0: Summon, 1: Unit, 2:Ability
    that.ability = ability;
    that.ability_mandatory = ability_mandatory;
    that.atack = atack;
    that.life_points = life_points;
    that.cost = cost;
    */
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

    that.draw = function () {

        ctx.drawImage(that.background_image, 0, 0, width, height, 0, 0, width, height);

        //TODO draw cards added to board
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

    //fraction selection buttons initialization 
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

        //check fraction selection buttons
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
    player = new Player();
    opponent = new Player();
    board = new Board();
}

var Clear = function () {

    //in state 3 (play in progress) background is draw with board by Board object
    if(state != 3) 
        ctx.drawImage(background_image, 0, 0, width, height, 0, 0, width, height);
    
    //ctx.fillStyle = 'black'; //set active color 
    //ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white'; //set active color    
    ctx.fillText('mouse x: ' + mouse_x + ', mouse_y: ' + mouse_y, 50, 50);
    ctx.fillText('mouse down: ' + mouse_button_down, 50, 60);
    ctx.fillText('Game state: ' + state, 50, 70);
    ctx.fillText('decks length: ' + player.deck.length, 50, 80);
    ctx.fillText('Room name: ' + room_name, 50, 90);
    ctx.fillText('Player login: ' + player_login, 50, 100);
    ctx.fillText('matrix: ' + board.matrix, 50, 150);

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
        /* fraction selection */
        /* ================== */
        page_handler.checkHover();
        page_handler.draw(player);

        var result = page_handler.checkAction();

        //start game button
        if (result === 1) {

            state = 2; //waiting for other players

            //init faction object
            if (player.selected_faction === 0) {
                player.faction = new TundraOrcs();
            }
            else if(player.selected_faction === 1){
                player.faction = new PheonixElves();
            }

            //init player deck
            player.faction.initDeck();
            player.deck = player.faction.getDeck();

            //add start cards to board
            var start_cards = player.faction.getStartCards();
            for (var i = 0; i < start_cards.length; i++) {
                board.addCard(start_cards[i][0], start_cards[i][1], start_cards[i][2]);
            }

            //send ready event
            socket.emit('player_ready_to_play', { room_name: room_name, player_login: player_login })

            //change page handler
            page_handler = new WaitingMenu();

        // << select faction button
        } else if (result === 2) {

            //TODO AAAA TO STRASZNE !
            if (player.selected_faction === 0)
                player.selected_faction = 1;
            else
                player.selected_faction--;

        // select faction button >>
        } else if (result === 3) {

            if (player.selected_faction === 1)
                player.selected_faction = 0;
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
        board.draw();
    }




    requestAnimFrame(gameLoop);
}


initGame(); //TODO inicjalizacja backgrounda, main menu oraz briefing
gameLoop();

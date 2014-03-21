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
var state = 0; /* 0 - menu
                  1 - briefing (faction selection)
                  2 - game in progress */

//mouse settings
var mouse_x = 0;
var mouse_y = 0;
var mouse_button_down = false;

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
}, false);

/***************************CLASSES****************************/
//-----------------------------------------------------------//

var menu = new (function () {

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
        
        if (buttons[0] && mouse_button_down)
            state = 1;
        else if (buttons[1] && mouse_button_down)
            null; //TODO draw options
        else if (buttons[2] && mouse_button_down)
            null; //TODO draw credits
        else if (buttons[3] && mouse_button_down)
            null; //TODO exit game

    }

    //TODO draw options
    //TODO draw credits

})()

//TODO moze zamiast globalnie tworzyc menu,
//stworzyc instancje tej klasy wtedy nie bedzie przechowywana caly czas

//hmmm a moze jedna klasa a tylko dwie instancje? kuszace:)
// ktorym jest graczem player mozna zapisac do zmiennej po prostu

//Player
//state
//

//Opponent
//  state
//  faction
//  img


/***************************FUNCTIONS**************************/
//-----------------------------------------------------------/

var Clear = function () {
    ctx.drawImage(background_image, 0, 0, width, height, 0, 0, width, height);
    //ctx.fillStyle = 'black'; //set active color 
    //ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white'; //set active color    
    ctx.fillText('mouse x: ' + mouse_x + ', mouse_y: ' + mouse_y, 50, 50);
    ctx.fillText('mouse down: ' + mouse_button_down, 50, 60);
    ctx.fillText('Game state: ' + state, 50, 70);

}

/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {


    Clear();

    //main menu
    if (state === 0) {
        menu.checkHover();
        menu.draw();
    }
        //briefing (faction selection)
    else if (state === 1) {

    }


    requestAnimFrame(gameLoop);
}

//initGame();
gameLoop();

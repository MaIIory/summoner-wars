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

var state = 0; /* 0 - menu
                  1 - briefing (faction selection)
                  2 - game in progress */

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

/***************************CLASSES****************************/
//-----------------------------------------------------------//

var menu = new (function () {

    //Set context
    var that = this;

    //ATTRIBUTES
    that.image = new Image(); //background image
    that.image.src = "/img/main_menu.png";

    that.logo_src_x = 0; //logo source x coordinate
    that.logo_src_y = 0; //logo source y coordinate

    that.b_width = 300; //button width
    that.b_height = 60;  //button height

    //buttons initialization 
    that.buttons = [0, 0, 0, 0]; /* button table with hoover data
                                   0 - mouse out
                                   1 - mouse over */

    that.checkHover = function () {
        //TODO set true if mouse is on button
        /*
        for (var i = 0; i < that.buttons.length; i++) {
            if ((that.buttons[i][0] + that.b_width > mouse_x) &&
                (that.buttons[i][0] < mouse_x) &&
                (that.buttons[i][1] + that.b_height > mouse_y) &&
                (that.buttons[i][1] < mouse_y)) {
                that.buttons[i][2] = 1;
                if (mouse_button_down)
                    that.user_choice = i + 1; //adding one is necessary because 0 means no choice
            }
            else
                that.buttons[i][2] = 0;
        }
        */
    }

    that.draw = function () {

        //draw background
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
    }

})()
//Player

//Opponent

/***************************FUNCTIONS**************************/
//-----------------------------------------------------------/

var Clear = function () {
    ctx.drawImage(background_image, 0, 0, width, height, 0, 0, width, height);
    //ctx.fillStyle = 'black'; //set active color 
    //ctx.fillRect(0, 0, width, height);
    //ctx.fillStyle = 'white'; //set active color    
    //ctx.fillText(cnt, width / 2, 200);
}

/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {


    Clear();

    menu.draw();

    requestAnimFrame(gameLoop);
}

//initGame();
gameLoop();

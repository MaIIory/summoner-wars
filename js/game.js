// JavaScript Document
//<canvas id="canvas">
//degrees = radians * (180/pi)
//radians = degrees * (pi/180)
//drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)

/*********************VARIABLES DECLARATION********************/
//-----------------------------------------------------------//

var width = 800;    //canvas width
var height = 600;   //canvas height
var canvas = null;
var ctx = null;

/*************************DEFINE EVENTS*************************/
//-----------------------------------------------------------//

/***************************CLASSES****************************/
//-----------------------------------------------------------//


/***************************FUNCTIONS**************************/
//-----------------------------------------------------------//

var initNewGame = function () {
   //main settings and game data

   canvas = document.getElementById('canvas');
   ctx = canvas.getContext('2d');
   canvas.width = width;
   canvas.height = height;
} 

// requestAnim
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


var Clear = function () {
    ctx.fillStyle = 'black'; //set active color
    ctx.fillRect(0, 0, width, height);
}

/************************Main game loop************************/
//-----------------------------------------------------------//
var GameLoop = function () {

    Clear();
    ctx.fillStyle = 'white';
    ctx.fillText("Start Game", width / 2, 200);
    requestAnimFrame(GameLoop);
}

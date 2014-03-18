//<canvas id="canvas">
//degrees = radians * (180/pi)
//radians = degrees * (pi/180)
//drawImage(Image Object, source X, source Y, source Width, source Height, destination X, destination Y, Destination width, Destination height)
/*********************VARIABLES DECLARATION********************/
//-----------------------------------------------------------//

var ctx = null;



/*************************DEFINE EVENTS*************************/
//-----------------------------------------------------------//


/***************************CLASSES****************************/
//-----------------------------------------------------------//


/***************************FUNCTIONS**************************/
//-----------------------------------------------------------//

var initGame = function ()
   {
   //main settings and game data
   var width = 1200;    //canvas width
   var height = 800;   //canvas height
   var canvas = document.getElementById('canvas');
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
    ctx.fillStyle = 'rgba(22, 138, 14, 1)'; //set active color
    ctx.fillRect(0, 0, width, height);
}


/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {
    //ctx.translate(0, 0);
    Clear();

    ctx.fillStyle = 'Black';
    //ctx.unfont = '20pt Verdana';
    ctx.textAlign = "center";
    ctx.fillText("Game start", width / 2, 200);
    //ctx.fillText("mouse Y = " + ~~mouse_y, width / 2, 230);
    //ctx.fillText(Math.atan2(mouse_y - height / 2, mouse_x - width / 2), width / 2, 270);
    //ctx.fillText(bullets.length, width / 2, 300);
    //ctx.fillText(RadToDegree(Math.atan2(mouse_y - height / 2, mouse_x - width / 2)), width / 2, 330);
    //ctx.fillText(~~distance, width / 2, 200);


    requestAnimFrame(gameLoop);
}

//CALL OF GAME LOOP
//---------------//

//GameLoop();

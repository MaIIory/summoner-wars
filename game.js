//alert("asdasd");

var Clear = function () {
    ctx.fillStyle = 'black'; //set active color

    
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white'; //set active color
    ctx.fillText(cnt, width / 2, 200);
    cnt = cnt + 1;
    
}

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

var cnt = 0;

    var background_image = new Image();
    background_image.src = "/img/background.jpg";




/************************Main game loop************************/
//-----------------------------------------------------------//
var gameLoop = function () {
    //ctx.translate(0, 0);
    
    Clear();
    //ctx.fillStyle = 'Black';
    //ctx.unfont = '20pt Verdana';
    //ctx.textAlign = "center";
    //ctx.fillText("Game start", width / 2, 200);
    //ctx.fillText("mouse Y = " + ~~mouse_y, width / 2, 230);
    //ctx.fillText(Math.atan2(mouse_y - height / 2, mouse_x - width / 2), width / 2, 270);
    //ctx.fillText(bullets.length, width / 2, 300);
    //ctx.fillText(RadToDegree(Math.atan2(mouse_y - height / 2, mouse_x - width / 2)), width / 2, 330);
    //ctx.fillText(~~distance, width / 2, 200);
    ctx.drawImage(background_image, 0, 0, 1024, 768, 0, 0, 1024, 768);

    requestAnimFrame(gameLoop);
}

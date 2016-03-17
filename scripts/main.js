
//<script type="text/javascript" src="/game.js"/>
//GLOBAL TODO
//TODO wyciagnij skrypt i wyodrebij do osobnego pliku 

/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/

var socket = io.connect(window.location.hostname, {
    'reconnect': false,
    'timeout': 200000
});


/**************************************************
** APPLICATION VARIABLES
**************************************************/

var page_content = document.getElementById('page_content');
var briefing_section = document.getElementById('briefing_section');
var player_login = ""; //store player login after typing
var room_name = "";    //room name that player joined

/**************************************************
** INCOMING EVENTS
**************************************************/

socket.on('login_validation', function (data) {

    if (data.is_occupied) {
        $("#dialog").text('Nickname is occupied!');
        $('#dialog').dialog('open');
        return;
    }
    else {
        rebuildBriefingSection();

        socket.on('update_players_list', function (data) {
            var players_list = document.getElementById('players_list');

            if (players_list === undefined) {
                alert("ZONK");
            }

            players_list.value = "";

            for (var i = 0; i < data.players.length; i = i + 1) {
                players_list.value += data.players[i].name;
                players_list.value += "\n";
            }
            return;
        });

        socket.on('update_room_table', function (data) {
            rebuildRoomTable(data.rooms);
            return;
        });

        socket.emit('add_new_player', { login: data.login });
        removeLoginSection();
        return;
    }
});

/**************************************************
** APPLICATION FUNCTIONS
**************************************************/


var initActions = function () {
    rebuildStatusSection();
}

function WindowCloseHanlder() {
    socket.disconnect();
}

var rebuildBriefingSection = function () {

    //first remove old briefing section
    removeBriefingSection();

    //then create new one
    var new_section = document.createElement('div');
    new_section.setAttribute('id', 'briefing_section');

    //<p>Players online</p> 
    var p = document.createElement('p');
    p.innerHTML = "Players online";
    p.setAttribute('class', 'p_basic_style');
    new_section.appendChild(p);

    //<textarea id='players_list' cols="20" rows="2"></textarea>
    var txtarea = document.createElement('textarea');
    txtarea.setAttribute('id', 'players_list');
    txtarea.setAttribute('cols', '20');
    txtarea.setAttribute('rows', '2');
    txtarea.disabled = true;
    new_section.appendChild(txtarea);

    //<p>Players online</p> 
    var p = document.createElement('p');
    p.innerHTML = "Create new room:";
    p.setAttribute('class', 'p_basic_style');
    new_section.appendChild(p);

    //<input id='txt_room_name' type='text' />
    var txt_input = document.createElement('input');
    txt_input.setAttribute('class', 'txt_basic_input');
    txt_input.setAttribute('id', 'txt_room_name');
    txt_input.setAttribute('type', 'text');
    new_section.appendChild(txt_input);

    //<input id='btn_create_room' type='button' />
    var btn_input = document.createElement('input');
    btn_input.setAttribute('id', 'btn_create_room');
    btn_input.setAttribute('class', 'btn_create_room');
    btn_input.setAttribute('type', 'button');
    btn_input.setAttribute('value', 'Create');

    btn_input.addEventListener('click', function () {
        //event to create new room and join player to room automatically
        socket.emit('create_new_room', { player_login: player_login, room_name: document.getElementById('txt_room_name').value });
    }, true);

    new_section.appendChild(btn_input);

    page_content.appendChild(new_section);

    //reassign briefing section variable
    briefing_section = new_section;
}

var removeBriefingSection = function () {
    var old_section = document.getElementById('briefing_section');
    if (old_section != undefined) {
        page_content.removeChild(old_section);
    }
}

var rebuildLoginSection = function () {

    //firsly remove old login section 
    removeLoginSection();

    //then build new one
    var new_section = document.createElement('div');
    new_section.setAttribute('id', 'login_section');

    //<p id='name_box'>
    var p = document.createElement('p');
    p.setAttribute('class', 'p_basic_style');
    p.innerHTML = "Choose your name:";
    new_section.appendChild(p);
    //<input type="text" id='txt_login'>
    var txt_login = document.createElement('input');
    txt_login.setAttribute('class', 'txt_basic_input');
    txt_login.setAttribute('type', 'text');
    txt_login.setAttribute('id', 'txt_login');
    new_section.appendChild(txt_login);
    //<br>
    var br = document.createElement('br');
    new_section.appendChild(br);
    //<input type="button">
    var btn = document.createElement('input');
    btn.setAttribute('type', 'button');
    btn.setAttribute('id', 'btn_join_game');
    btn.setAttribute('value', 'Join');

    btn.onclick = function (e) {

        e = e || window.event;

        //get player name without whitespaces
        player_login = document.getElementById('txt_login').value;
        player_login = player_login.trim();
        if (player_login === "") {
            $("#dialog").text('Login is empty!');
            $('#dialog').dialog('open');
            return;
        }

        //validate login and add user
        socket.emit('login_validation', { login: player_login });
    };

    new_section.appendChild(btn);

    //add to page content
    page_content.appendChild(new_section);
}

var removeLoginSection = function () {
    var old_section = document.getElementById('login_section');
    if (old_section != undefined) {
        page_content.removeChild(old_section);
    }
}

var rebuildStatusSection = function () {
    //first remove old status section
    removeStatusSection();

    //then build new one
    var new_status_section = document.createElement('div');
    new_status_section.setAttribute('id', 'connection_status_section');
    var p = document.createElement('p');
    p.innerHTML = "Connecting with server. Please wait...";
    new_status_section.appendChild(p);
    page_content.appendChild(new_status_section);
}

var removeStatusSection = function () {
    var old_section = document.getElementById('connection_status_section');
    if (old_section != undefined) {
        page_content.removeChild(old_section);
    }
}

var rebuildRoomTable = function (rooms) {

    rooms_container = rooms;

    /*
    //firsly remove old room table 
    var old_table = document.getElementById('room_table');
    if (old_table != undefined) {
        briefing_section.removeChild(old_table);
    }
    */
    //firsly remove old table holder 
    var old_table_holder = document.getElementById('table_holder');
    if (old_table_holder != undefined) {
        briefing_section.removeChild(old_table_holder);
    }

    //create table holder
    var table_holder = document.createElement('div');
    table_holder.setAttribute('class', 'CSSTableGenerator');
    table_holder.setAttribute('id', 'table_holder');

    //then create new one
    var new_table = document.createElement('table');
    new_table.border = '1';
    new_table.setAttribute('id', 'room_table');

    //create header row
    var header_row = document.createElement('tr');

    addNewTd('Room name', header_row);
    addNewTd('1st player', header_row);
    addNewTd('2nd player', header_row);
    addNewTd('Status', header_row);

    new_table.appendChild(header_row);

    //generating rows for every room
    for (var i = 0; i < rooms.length; i = i + 1) {
        var room_row = document.createElement('tr');
        room_row.setAttribute('id', rooms[i].name);

        addNewTd(rooms[i].name, room_row);
        addNewTd(rooms[i].first_player.name, room_row);
        addNewTd(rooms[i].second_player.name, room_row);

        //status handling
        if (rooms[i].status === 0) //status: waiting for players
        {
            addNewTd("Waiting for players", room_row);

        }
        else if (rooms[i].status === 1) {

            if (((rooms[i].first_player.name === player_login) && (rooms[i].first_player.ready_to_start_game)) ||
            ((rooms[i].second_player.name === player_login) && (rooms[i].second_player.ready_to_start_game))) {
                addNewTd("Waiting for your opponent", room_row);
            }
            else if ((rooms[i].first_player.name === player_login) || (rooms[i].second_player.name === player_login)) {
                var td = document.createElement('td');

                var btn = document.createElement('input');

                btn.setAttribute('type', 'button');
                btn.setAttribute('id', 'btn_join_room');
                btn.setAttribute('value', 'Click to start');

                btn.onclick = function (e) {

                    e = e || window.event;
                    room_name = (e.target || e.srcElement).parentNode.parentNode.id;

                    socket.emit('join_to_game', { player_login: player_login, room_name: room_name });
                };

                td.appendChild(btn);
                room_row.appendChild(td);
            }
            else {
                addNewTd("Ready to start", room_row);
            }
        }
        else //status: game in progress
        {
            addNewTd("Game in progress", room_row);
        }

        room_row.onclick = function (e) {
            e = e || window.event;

            var elementId = (e.target || e.srcElement).parentNode.id;
            //sent request to join player to room
            socket.emit('assign_player_to_room', { player_login: player_login, room_name: elementId });
        };


        //append new row to table
        new_table.appendChild(room_row);
    }

    table_holder.appendChild(new_table);
    briefing_section.appendChild(table_holder);
}

var startGame = function () {
    //main settings and game data

    console.log('0');

    removeLoginSection();
    removeBriefingSection();

    //<p>Players online</p> 

    console.log('1');

    var new_section = document.createElement('div');
    new_section.setAttribute('id', 'warning_section');


    console.log('2');

    var p = document.createElement('p');
    p.innerHTML = "Warning: do not refresh this page!";
    p.setAttribute('class', 'p_basic_style');
    new_section.appendChild(p);
    page_content.appendChild(new_section);

    console.log('3');

    //create canvas HTML document
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.width = 1024;
    canvas.height = 768;
    page_content.appendChild(canvas);

    console.log('4');

    var fileref = document.createElement('script')
    fileref.setAttribute("type", "text/javascript")
    fileref.setAttribute("src", "/scripts/game.js")
    document.getElementById('page_content').appendChild(fileref)

}

/**************************************************
** SUPPORT FUNCTIONS
**************************************************/

var addNewTh = function (inner_HTML_text, row) {
    var th = document.createElement('th');
    th.innerHTML = inner_HTML_text;
    row.appendChild(th);
}

var addNewTd = function (inner_HTML_text, row) {
    var td = document.createElement('td');
    td.innerHTML = inner_HTML_text;
    row.appendChild(td);
}

var myFunction = function () {
    $("#dialog").dialog("open");
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

/**************************************************
** EVENTS HANDLING
**************************************************/

var setEventHandlers = function () {


    socket.on('connection_confirmation', function () {
        window.onbeforeunload = WindowCloseHanlder;
        removeStatusSection();
        rebuildLoginSection();


        socket.on('error', function (data) {

            $("#dialog").text('Server error');
            $('#dialog').dialog('open');
        });


        socket.on('start_game', function () {
            //Nie kasuj tego bo dziala $('#dialog').dialog('open');
            startGame();
        });

    });

}


/*
var fileref = document.createElement('script')
fileref.setAttribute("type", "text/javascript")
fileref.src = 'cos.js'
document.head.appendChild(fileref);
*/

initActions();
setEventHandlers();
/*
var fileref = document.createElement('script')
fileref.setAttribute("type", "text/javascript")
fileref.setAttribute("src", "/cos.js")

document.head.appendChild(fileref);
var crd = new Card()
alert("" + crd.name)
*/

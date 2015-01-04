var PheonixElves = function (player_name) {

    var that = this;
    that.faction_name = "Pheonix Elves";
    that.player_name = player_name;
    that.deck = [];

    that.board_image = new Image();
    that.board_image.src = "/img/phoenix_elves_cards.jpg";

    that.initDeck = function () {

        that.deck = [

            /* new Card(name, id, pos_x, pos_y, owner_name, range, attack, lives) */
            /* position in faction sheet, example:
               [0,0][1,0][2,0]
               [0,1][1,1][2,1]
            */
            new Card('Archer', 'pe03', 0, 0, that.player_name, 4, 1, 1),
            new Card('Archer', 'pe04', 0, 0, that.player_name, 4, 1, 1),
            new Card('Archer', 'pe05', 0, 0, that.player_name, 4, 1, 1),
            new Card('Archer', 'pe06', 0, 0, that.player_name, 4, 1, 1),
            new Card('Guardian', 'pe08', 1, 0, that.player_name, 1, 1, 2),
            new Card('Guardian', 'pe09', 1, 0, that.player_name, 1, 1, 2),
            new Card('Guardian', 'pe10', 1, 0, that.player_name, 1, 1, 2),
            new Card('Guardian', 'pe11', 1, 0, that.player_name, 1, 1, 2),
            new Card('Guardian', 'pe12', 1, 0, that.player_name, 1, 1, 2),
            new Card('Warrior', 'pe14', 2, 0, that.player_name, 1, 2, 1),
            new Card('Warrior', 'pe15', 2, 0, that.player_name, 1, 2, 1),
            new Card('Warrior', 'pe16', 2, 0, that.player_name, 1, 2, 1),
            new Card('Warrior', 'pe17', 2, 0, that.player_name, 1, 2, 1),
            new Card('Warrior', 'pe18', 2, 0, that.player_name, 1, 2, 1),
            new Card('Fire Drake', 'pe19', 3, 0, that.player_name, 1, 3, 7),
            new Card('Kaeseeall', 'pe20', 4, 0, that.player_name, 3, 2, 5),
            new Card('Maelena', 'pe21', 5, 0, that.player_name, 3, 2, 5),
            new Card('A Hero Is Born', 'pe22', 0, 1, that.player_name, 0, 0, 0),
            new Card('Burn', 'pe23', 1, 1, that.player_name, 0, 0, 0),
            new Card('Burn', 'pe24', 1, 1, that.player_name, 0, 0, 0),
            new Card('Greater Burn', 'pe25', 2, 1, that.player_name, 0, 0 ,0),
            new Card('Magic Drain', 'pe26', 3, 1, that.player_name, 0, 0, 0),
            new Card('Magic Drain', 'pe27', 3, 1, that.player_name, 0, 0, 0),
            new Card('Spirit of the Phoenix', 'pe28', 4, 1, that.player_name, 0, 0, 0),
            new Card('Spirit of the Phoenix', 'pe29', 4, 1, that.player_name, 0, 0, 0),
            new Card('Spirit of the Phoenix', 'pe30', 4, 1, that.player_name, 0, 0, 0),
            new Card('Wall', 'pe33', 6, 0, that.player_name, 0, 0, 9),
            new Card('Wall', 'pe34', 6, 0, that.player_name, 0, 0, 9)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Warrior', 'pe13', 2, 0, that.player_name, 1, 2, 1), 0, 6],
            [new Card('Guardian', 'pe07', 1, 0, that.player_name, 1, 1, 2), 1, 5],
            [new Card('Wall', 'pe32', 6, 0, that.player_name, 0, 0, 9), 2, 5],
            [new Card('Prince Elien', 'pe31', 5, 1, that.player_name, 3, 3, 4), 2, 7],
            [new Card('Archer', 'pe01', 0, 0, that.player_name, 4, 1, 1), 3, 7],
            [new Card('Archer', 'pe02', 0, 0, that.player_name, 4, 1, 1), 5, 6]
        ]
    }

}

var TundraOrcs = function (player_name) {

    var that = this;
    that.faction_name = "Tundra Orcs";
    that.player_name = player_name;
    that.deck = [];

    that.board_image = new Image();
    that.board_image.src = "/img/tundra_orcs_cards.jpg";

    that.initDeck = function () {

        that.deck = [
            /* new Card(name, id, pos_x, pos_y, owner_name, range, attack, lives) */
            /* position in faction sheet, example:
               [0,0][1,0][2,0]
               [0,1][1,1][2,1]
            */
            new Card('Fighter', 'to03', 3, 0, that.player_name, 1, 1, 1),
            new Card('Fighter', 'to04', 3, 0, that.player_name, 1, 1, 1),
            new Card('Fighter', 'to05', 3, 0, that.player_name, 1, 1, 1),
            new Card('Fighter', 'to06', 3, 0, that.player_name, 1, 1, 1),
            new Card('Shaman', 'to08', 4, 0, that.player_name, 3, 2, 2),
            new Card('Shaman', 'to09', 4, 0, that.player_name, 3, 2, 2),
            new Card('Shaman', 'to10', 4, 0, that.player_name, 3, 2, 2),
            new Card('Shaman', 'to11', 4, 0, that.player_name, 3, 2, 2),
            new Card('Shaman', 'to12', 4, 0, that.player_name, 3, 2, 2),
            new Card('Smasher', 'to14', 5, 0, that.player_name, 1, 2, 4),
            new Card('Smasher', 'to15', 5, 0, that.player_name, 1, 2, 4),
            new Card('Smasher', 'to16', 5, 0, that.player_name, 1, 2, 4),
            new Card('Smasher', 'to17', 5, 0, that.player_name, 1, 2, 4),
            new Card('Smasher', 'to18', 5, 0, that.player_name, 1, 2, 4),
            new Card('Blagog', 'to19', 0, 0, that.player_name, 1, 5, 5),
            new Card('Krung', 'to20', 1, 0, that.player_name, 1, 3, 9),
            new Card('Ragnor', 'to21', 2, 0, that.player_name, 1, 2, 5),
            new Card('Wall', 'to23', 4, 1, that.player_name, 0, 0, 9),
            new Card('Wall', 'to24', 4, 1, that.player_name, 0, 0, 9),
            new Card('Freeze', 'to26', 0, 1, that.player_name, 0, 0, 0),
            new Card('Freeze', 'to27', 0, 1, that.player_name, 0, 0, 0),
            new Card('Freeze', 'to28', 0, 1, that.player_name, 0, 0, 0),
            new Card('Ice Wall', 'to29', 1, 1, that.player_name, 0, 0, 3),
            new Card('Ice Wall', 'to30', 1, 1, that.player_name, 0, 0, 3),
            new Card('Ice Wall', 'to31', 1, 1, that.player_name, 0, 0, 3),
            new Card('Reinforcements', 'to32', 2, 1, that.player_name, 0, 0, 0),
            new Card('Reinforcements', 'to33', 2, 1, that.player_name, 0, 0, 0),
            new Card('A Hero Is Born', 'to34', 5, 1, that.player_name, 0, 0, 0)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Fighter', 'to01', 3, 0, that.player_name, 1, 1, 1), 5, 4],
            [new Card('Fighter', 'to02', 3, 0, that.player_name, 1, 1, 1), 2, 6],
            [new Card('Shaman', 'to07', 4, 0, that.player_name, 3, 2, 2), 4, 6],
            [new Card('Smasher', 'to13', 5, 0, that.player_name, 1, 2, 4), 1, 5],
            [new Card('Wall', 'to22', 4, 1, that.player_name, 0, 0, 9), 3, 5],
            [new Card('Grognack', 'to25', 3, 1, that.player_name, 1, 4, 7), 3, 7]
        ]
    }

}

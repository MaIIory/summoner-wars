var PheonixElves = function (player_name) {

    var that = this;
    that.player_name = player_name;
    that.deck = [];

    that.board_image = new Image();
    that.board_image.src = "/img/phoenix_elves_board_cards.jpg";
    //that.image = new Image(); //background image
    //that.image.src = "/img/phoenix_elves.jpg";

    that.initDeck = function () {

        that.deck = [
            /* new Card(name, id, src_x, src_y, owner_name, range, attack) */
            new Card('Archer', 'pe03', 390, 0, that.player_name, 4, 1),
            new Card('Archer', 'pe04', 390, 0, that.player_name, 4, 1),
            new Card('Archer', 'pe05', 390, 0, that.player_name, 4, 1),
            new Card('Archer', 'pe06', 390, 0, that.player_name, 4, 1),
            new Card('Guardian', 'pe08', 520, 0, that.player_name, 1, 1),
            new Card('Guardian', 'pe09', 520, 0, that.player_name, 1, 1),
            new Card('Guardian', 'pe10', 520, 0, that.player_name, 1, 1),
            new Card('Guardian', 'pe11', 520, 0, that.player_name, 1, 1),
            new Card('Guardian', 'pe12', 520, 0, that.player_name, 1, 1),
            new Card('Warrior', 'pe14', 650, 0, that.player_name, 1, 2),
            new Card('Warrior', 'pe15', 650, 0, that.player_name, 1, 2),
            new Card('Warrior', 'pe16', 650, 0, that.player_name, 1, 2),
            new Card('Warrior', 'pe17', 650, 0, that.player_name, 1, 2),
            new Card('Warrior', 'pe18', 650, 0, that.player_name, 1, 2),
            new Card('Fire Drake', 'pe19', 0, 0, that.player_name, 1, 3),
            new Card('Kaeseeall', 'pe20', 130, 0, that.player_name, 3, 2),
            new Card('Maelena', 'pe21', 260, 0, that.player_name, 3, 2),
            new Card('A Hero Is Born', 'pe22', 0, 85, that.player_name, 0, 0),
            new Card('Burn', 'pe23', 130, 85, that.player_name, 0, 0),
            new Card('Burn', 'pe24', 130, 85, that.player_name, 0, 0),
            new Card('Greater Burn', 'pe25', 260, 85, that.player_name, 0, 0),
            new Card('Magic Drain', 'pe26', 390, 85, that.player_name, 0, 0),
            new Card('Magic Drain', 'pe27', 390, 85, that.player_name, 0, 0),
            new Card('Spirit of the Phoenix', 'pe28', 520, 85, that.player_name, 0, 0),
            new Card('Spirit of the Phoenix', 'pe29', 520, 85, that.player_name, 0, 0),
            new Card('Spirit of the Phoenix', 'pe30', 520, 85, that.player_name, 0, 0),
            new Card('Wall', 'pe33', 780, 0, that.player_name, 0, 0),
            new Card('Wall', 'pe34', 780, 0, that.player_name, 0, 0)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Warrior', 'pe13', 650, 0, that.player_name, 1, 2), 0, 6],
            [new Card('Guardian', 'pe07', 520, 0, that.player_name, 1, 1), 1, 5],
            [new Card('Wall', 'pe32', 780, 0, that.player_name, 0, 0), 2, 5],
            [new Card('Prince Elien', 'pe31', 650, 85, that.player_name, 3, 3), 2, 7],
            [new Card('Archer', 'pe01', 390, 0, that.player_name, 4, 1), 3, 7],
            [new Card('Archer', 'pe02', 390, 0, that.player_name, 4, 1), 5, 6]
        ]
    }

}

var TundraOrcs = function (player_name) {

    var that = this;
    that.player_name = player_name;
    that.deck = [];

    that.board_image = new Image();
    that.board_image.src = "/img/tundra_orcs_board_cards.jpg";
    //that.image = new Image(); //background image
    //that.image.src = "/img/tundra_orcs.jpg";

    that.initDeck = function () {

        that.deck = [
            /* new Card(name, id, src_x, src_y, owner_name, range, attack) */
            new Card('Fighter', 'to03', 390, 0, that.player_name, 1, 1),
            new Card('Fighter', 'to04', 390, 0, that.player_name, 1, 1),
            new Card('Fighter', 'to05', 390, 0, that.player_name, 1, 1),
            new Card('Fighter', 'to06', 390, 0, that.player_name, 1, 1),
            new Card('Shaman', 'to08', 520, 0, that.player_name, 3, 2),
            new Card('Shaman', 'to09', 520, 0, that.player_name, 3, 2),
            new Card('Shaman', 'to10', 520, 0, that.player_name, 3, 2),
            new Card('Shaman', 'to11', 520, 0, that.player_name, 3, 2),
            new Card('Shaman', 'to12', 520, 0, that.player_name, 3, 2),
            new Card('Smasher', 'to14', 650, 0, that.player_name, 1, 2),
            new Card('Smasher', 'to15', 650, 0, that.player_name, 1, 2),
            new Card('Smasher', 'to16', 650, 0, that.player_name, 1, 2),
            new Card('Smasher', 'to17', 650, 0, that.player_name, 1, 2),
            new Card('Smasher', 'to18', 650, 0, that.player_name, 1, 2),
            new Card('Blagog', 'to19', 0, 0, that.player_name, 1, 5),
            new Card('Krung', 'to20', 130, 0, that.player_name, 1, 3),
            new Card('Ragnor', 'to21', 260, 0, that.player_name, 1, 2),
            new Card('Wall', 'to23', 520, 85, that.player_name, 0, 0),
            new Card('Wall', 'to24', 520, 85, that.player_name, 0, 0),
            new Card('Freeze', 'to26', 130, 85, that.player_name, 0, 0),
            new Card('Freeze', 'to27', 130, 85, that.player_name, 0, 0),
            new Card('Freeze', 'to28', 130, 85, that.player_name, 0, 0),
            new Card('Ice Wall', 'to29', 260, 85, that.player_name, 0, 0),
            new Card('Ice Wall', 'to30', 260, 85, that.player_name, 0, 0),
            new Card('Ice Wall', 'to31', 260, 85, that.player_name, 0, 0),
            new Card('Reinforcements', 'to32', 390, 85, that.player_name, 0, 0),
            new Card('Reinforcements', 'to33', 390, 85, that.player_name, 0, 0),
            new Card('A Hero Is Born', 'to34', 0, 85, that.player_name, 0, 0)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Fighter', 'to01', 390, 0, that.player_name, 1, 1), 5, 4],
            [new Card('Fighter', 'to02', 390, 0, that.player_name, 1, 1), 2, 6],
            [new Card('Shaman', 'to07', 520, 0, that.player_name, 3, 2), 4, 6],
            [new Card('Smasher', 'to13', 650, 0, that.player_name, 1, 2), 1, 5],
            [new Card('Wall', 'to22', 520, 85, that.player_name, 0, 0), 3, 5],
            [new Card('Grognack', 'to25', 650, 85, that.player_name, 1, 4), 3, 7]
        ]
    }

}

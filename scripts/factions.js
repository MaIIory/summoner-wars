var PheonixElves = function (player_name) {

    var that = this;
    that.player_name = player_name;
    that.deck = [];

    that.image = new Image(); //background image
    that.image.src = "/img/phoenix_elves.jpg";

    that.initDeck = function () {

        that.deck = [
            /* new Card(name, id, src_x, src_y) */
            new Card('Archer', 'pe03', 0, 0, that.player_name),
            new Card('Archer', 'pe04', 0, 0, that.player_name),
            new Card('Archer', 'pe05', 0, 0, that.player_name),
            new Card('Archer', 'pe06', 0, 0, that.player_name),
            new Card('Guardian', 'pe08', 367, 0, that.player_name),
            new Card('Guardian', 'pe09', 367, 0, that.player_name),
            new Card('Guardian', 'pe10', 367, 0, that.player_name),
            new Card('Guardian', 'pe11', 367, 0, that.player_name),
            new Card('Guardian', 'pe12', 367, 0, that.player_name),
            new Card('Warrior', 'pe14', 734, 0, that.player_name),
            new Card('Warrior', 'pe15', 734, 0, that.player_name),
            new Card('Warrior', 'pe16', 734, 0, that.player_name),
            new Card('Warrior', 'pe17', 734, 0, that.player_name),
            new Card('Warrior', 'pe18', 734, 0, that.player_name),
            new Card('Fire Drake', 'pe19', 1101, 0, that.player_name),
            new Card('Kaeseeall', 'pe20', 1468, 0, that.player_name),
            new Card('Maelena', 'pe21', 1835, 0, that.player_name),
            new Card('A Hero Is Born', 'pe22', 0, 239, that.player_name),
            new Card('Burn', 'pe23', 367, 239, that.player_name),
            new Card('Burn', 'pe24', 367, 239, that.player_name),
            new Card('Greater Burn', 'pe25', 734, 239, that.player_name),
            new Card('Magic Drain', 'pe26', 1101, 239, that.player_name),
            new Card('Magic Drain', 'pe27', 1101, 239, that.player_name),
            new Card('Spirit of the Phoenix', 'pe28', 1468, 239, that.player_name),
            new Card('Spirit of the Phoenix', 'pe29', 1468, 239, that.player_name),
            new Card('Spirit of the Phoenix', 'pe30', 1468, 239, that.player_name),
            new Card('Wall', 'pe33', 0, 478, that.player_name),
            new Card('Wall', 'pe34', 0, 478, that.player_name)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Warrior', 'pe13', 734, 0, that.player_name), 0, 6],
            [new Card('Guardian', 'pe07', 367, 0, that.player_name), 1, 5],
            [new Card('Wall', 'pe32', 0, 478, that.player_name), 2, 5],
            [new Card('Prince Elien', 'pe31', 1835, 239, that.player_name), 2, 7],
            [new Card('Archer', 'pe01', 0, 0, that.player_name), 3, 7],
            [new Card('Archer', 'pe02', 0, 0, that.player_name), 5, 6]
        ]
    }

}

var TundraOrcs = function (player_name) {

    var that = this;
    that.player_name = player_name;
    that.deck = [];

    that.image = new Image(); //background image
    that.image.src = "/img/tundra_orcs.jpg";

    that.initDeck = function () {

        that.deck = [
            /* new Card(name, id, src_x, src_y) */
            new Card('Fighter', 'to03', 1101, 0, that.player_name),
            new Card('Fighter', 'to04', 1101, 0, that.player_name),
            new Card('Fighter', 'to05', 1101, 0, that.player_name),
            new Card('Fighter', 'to06', 1101, 0, that.player_name),
            new Card('Shaman', 'to08', 1468, 0, that.player_name),
            new Card('Shaman', 'to09', 1468, 0, that.player_name),
            new Card('Shaman', 'to10', 1468, 0, that.player_name),
            new Card('Shaman', 'to11', 1468, 0, that.player_name),
            new Card('Shaman', 'to12', 1468, 0, that.player_name),
            new Card('Smasher', 'to14', 1835, 0, that.player_name),
            new Card('Smasher', 'to15', 1835, 0, that.player_name),
            new Card('Smasher', 'to16', 1835, 0, that.player_name),
            new Card('Smasher', 'to17', 1835, 0, that.player_name),
            new Card('Smasher', 'to18', 1835, 0, that.player_name),
            new Card('Blagog', 'to19', 0, 0, that.player_name),
            new Card('Krung', 'to20', 367, 0, that.player_name),
            new Card('Ragnor', 'to21', 734, 0, that.player_name),
            new Card('Wall', 'to23', 1468, 239, that.player_name),
            new Card('Wall', 'to24', 1468, 239, that.player_name),
            new Card('Freeze', 'to26', 0, 239, that.player_name),
            new Card('Freeze', 'to27', 0, 239, that.player_name),
            new Card('Freeze', 'to28', 0, 239, that.player_name),
            new Card('Ice Wall', 'to29', 367, 239, that.player_name),
            new Card('Ice Wall', 'to30', 367, 239, that.player_name),
            new Card('Ice Wall', 'to31', 367, 239, that.player_name),
            new Card('Reinforcements', 'to32', 734, 239, that.player_name),
            new Card('Reinforcements', 'to33', 734, 239, that.player_name),
            new Card('A Hero Is Born', 'to34', 1835, 239, that.player_name)
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Fighter', 'to01', 1101, 0, that.player_name), 5, 4],
            [new Card('Fighter', 'to02', 1101, 0, that.player_name), 2, 6],
            [new Card('Shaman', 'to07', 1468, 0, that.player_name), 4, 6],
            [new Card('Smasher', 'to13', 1835, 0, that.player_name), 1, 5],
            [new Card('Wall', 'to22', 1468, 239, that.player_name), 3, 5],
            [new Card('Grognack', 'to25', 1101, 239, that.player_name), 3, 7]
        ]
    }

}

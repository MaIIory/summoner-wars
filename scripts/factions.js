var PheonixElves = function (player_name) {

    var that = this;
    that.faction_name = "Pheonix Elves";
    that.player_name = player_name;
    that.deck = [];

    that.board_image = new Image();
    that.board_image.src = "/img/phoenix_elves_cards.jpg";

    that.initDeck = function () {

        that.deck = [

            /* new Card(name, id, pos_x, pos_y, owner_name, range, attack, lives, summon_cost, card_class) */
            /* position in faction sheet, example:
               [0,0][1,0][2,0]
               [0,1][1,1][2,1] */
            
            new Card('Archer', that.player_name + 'pe03', 0, 0, that.player_name, 4, 1, 1, 1, "common"),
            new Card('Archer', that.player_name + 'pe04', 0, 0, that.player_name, 4, 1, 1, 1, "common"),
            new Card('Archer', that.player_name + 'pe05', 0, 0, that.player_name, 4, 1, 1, 1, "common"),
            new Card('Archer', that.player_name + 'pe06', 0, 0, that.player_name, 4, 1, 1, 1, "common"),
            new Card('Guardian', that.player_name + 'pe08', 1, 0, that.player_name, 1, 1, 2, 2, "common"),
            new Card('Guardian', that.player_name + 'pe09', 1, 0, that.player_name, 1, 1, 2, 2, "common"),
            new Card('Guardian', that.player_name + 'pe10', 1, 0, that.player_name, 1, 1, 2, 2, "common"),
            new Card('Guardian', that.player_name + 'pe11', 1, 0, that.player_name, 1, 1, 2, 2, "common"),
            new Card('Guardian', that.player_name + 'pe12', 1, 0, that.player_name, 1, 1, 2, 2, "common"),
            new Card('Warrior', that.player_name + 'pe14', 2, 0, that.player_name, 1, 2, 1, 1, "common"),
            new Card('Warrior', that.player_name + 'pe15', 2, 0, that.player_name, 1, 2, 1, 1, "common"),
            new Card('Warrior', that.player_name + 'pe16', 2, 0, that.player_name, 1, 2, 1, 1, "common"),
            new Card('Warrior', that.player_name + 'pe17', 2, 0, that.player_name, 1, 2, 1, 1, "common"),
            new Card('Warrior', that.player_name + 'pe18', 2, 0, that.player_name, 1, 2, 1, 1, "common"),
            new Card('Fire Drake', that.player_name + 'pe19', 3, 0, that.player_name, 1, 3, 7, 7, "champion"),
            new Card('Kaeseeall', that.player_name + 'pe20', 4, 0, that.player_name, 3, 2, 5, 5, "champion"),
            new Card('Maelena', that.player_name + 'pe21', 5, 0, that.player_name, 3, 2, 5, 5, "champion"),
            new Card('A Hero Is Born', that.player_name + 'pe22', 0, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Burn', that.player_name + 'pe23', 1, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Burn', that.player_name + 'pe24', 1, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Greater Burn', that.player_name + 'pe25', 2, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Magic Drain', that.player_name + 'pe26', 3, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Magic Drain', that.player_name + 'pe27', 3, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Spirit of the Phoenix', that.player_name + 'pe28', 4, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Spirit of the Phoenix', that.player_name + 'pe29', 4, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Spirit of the Phoenix', that.player_name + 'pe30', 4, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Wall', that.player_name + 'pe33', 6, 0, that.player_name, 0, 0, 9, 0, "event"),
            new Card('Wall', that.player_name + 'pe34', 6, 0, that.player_name, 0, 0, 9, 0, "event")
            
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Warrior', that.player_name + 'pe13', 2, 0, that.player_name, 1, 2, 1, 1, "common"), 0, 6],
            [new Card('Guardian', that.player_name + 'pe07', 1, 0, that.player_name, 1, 1, 2, 2, "common"), 1, 5],
            [new Card('Wall', that.player_name + 'pe32', 6, 0, that.player_name, 0, 0, 9, 0, "event"), 2, 5],
            [new Card('Prince Elien', that.player_name + 'pe31', 5, 1, that.player_name, 3, 3, 4, 0, "summoner"), 2, 7],
            [new Card('Archer', that.player_name + 'pe01', 0, 0, that.player_name, 4, 1, 1, 1, "common"), 3, 7],
            [new Card('Archer', that.player_name + 'pe02', 0, 0, that.player_name, 4, 1, 1, 1, "common"), 5, 6]

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
            /* new Card(name, id, pos_x, pos_y, owner_name, range, attack, lives, summon_cos, card_class) */
            /* position in faction sheet, example:
               [0,0][1,0][2,0]
               [0,1][1,1][2,1]
            */
            
            new Card('Fighter', that.player_name + 'to03', 3, 0, that.player_name, 1, 1, 1, 1, "common"),
            new Card('Fighter', that.player_name + 'to04', 3, 0, that.player_name, 1, 1, 1, 1, "common"),
            new Card('Fighter', that.player_name + 'to05', 3, 0, that.player_name, 1, 1, 1, 1, "common"),
            new Card('Fighter', that.player_name + 'to06', 3, 0, that.player_name, 1, 1, 1, 1, "common"),
            new Card('Shaman', that.player_name + 'to08', 4, 0, that.player_name, 3, 2, 2, 1, "common"),
            new Card('Shaman', that.player_name + 'to09', 4, 0, that.player_name, 3, 2, 2, 1, "common"),
            new Card('Shaman', that.player_name + 'to10', 4, 0, that.player_name, 3, 2, 2, 1, "common"),
            new Card('Shaman', that.player_name + 'to11', 4, 0, that.player_name, 3, 2, 2, 1, "common"),
            new Card('Shaman', that.player_name + 'to12', 4, 0, that.player_name, 3, 2, 2, 1, "common"),
            new Card('Smasher', that.player_name + 'to14', 5, 0, that.player_name, 1, 2, 4, 2, "common"),
            new Card('Smasher', that.player_name + 'to15', 5, 0, that.player_name, 1, 2, 4, 2, "common"),
            new Card('Smasher', that.player_name + 'to16', 5, 0, that.player_name, 1, 2, 4, 2, "common"),
            new Card('Smasher', that.player_name + 'to17', 5, 0, that.player_name, 1, 2, 4, 2, "common"),
            new Card('Smasher', that.player_name + 'to18', 5, 0, that.player_name, 1, 2, 4, 2, "common"),
            new Card('Blagog', that.player_name + 'to19', 0, 0, that.player_name, 1, 5, 5, 6, "champion"),
            new Card('Krung', that.player_name + 'to20', 1, 0, that.player_name, 1, 3, 9, 8, "champion"),
            new Card('Ragnor', that.player_name + 'to21', 2, 0, that.player_name, 1, 2, 5, 5, "champion"),
            new Card('Wall', that.player_name + 'to23', 4, 1, that.player_name, 0, 0, 9, 0, "event"),
            new Card('Wall', that.player_name + 'to24', 4, 1, that.player_name, 0, 0, 9, 0, "event"),
            new Card('Freeze', that.player_name + 'to26', 0, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Freeze', that.player_name + 'to27', 0, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Freeze', that.player_name + 'to28', 0, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Ice Wall', that.player_name + 'to29', 1, 1, that.player_name, 0, 0, 3, 0, "event"),
            new Card('Ice Wall', that.player_name + 'to30', 1, 1, that.player_name, 0, 0, 3, 0, "event"),
            new Card('Ice Wall', that.player_name + 'to31', 1, 1, that.player_name, 0, 0, 3, 0, "event"),
            new Card('Reinforcements', that.player_name + 'to32', 2, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('Reinforcements', that.player_name + 'to33', 2, 1, that.player_name, 0, 0, 0, 0, "event"),
            new Card('A Hero Is Born', that.player_name + 'to34', 5, 1, that.player_name, 0, 0, 0, 0, "event")
        ]
    }

    that.getDeck = function () {
        return that.deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Fighter', that.player_name + 'to01', 3, 0, that.player_name, 1, 1, 1, 1, "common"), 5, 4],
            [new Card('Fighter', that.player_name + 'to02', 3, 0, that.player_name, 1, 1, 1, 1, "common"), 2, 6],
            [new Card('Shaman', that.player_name + 'to07', 4, 0, that.player_name, 3, 2, 2, 1, "common"), 4, 6],
            [new Card('Smasher', that.player_name + 'to13', 5, 0, that.player_name, 1, 2, 4, 2, "common"), 1, 5],
            [new Card('Wall', that.player_name + 'to22', 4, 1, that.player_name, 0, 0, 9, 0, "event"), 3, 5],
            [new Card('Grognack', that.player_name + 'to25', 3, 1, that.player_name, 1, 4, 7, 0, "summoner"), 3, 7]

        ]
    }

}

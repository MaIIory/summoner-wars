var PheonixElves = function () {

    var that = this;
    deck = [];

    that.image = new Image(); //background image
    that.image.src = "/img/phoenix_elves.jpg";

    that.initDeck = function () {

        deck = [
            /* new Card(name, id, src_x, src_y) */
            new Card('Archer', 'pe03', 0, 0),
            new Card('Archer', 'pe04', 0, 0),
            new Card('Archer', 'pe05', 0, 0),
            new Card('Archer', 'pe06', 0, 0),
            new Card('Guardian', 'pe08', 367, 0),
            new Card('Guardian', 'pe09', 367, 0),
            new Card('Guardian', 'pe10', 367, 0),
            new Card('Guardian', 'pe11', 367, 0),
            new Card('Guardian', 'pe12', 367, 0),
            new Card('Warrior', 'pe14', 734, 0),
            new Card('Warrior', 'pe15', 734, 0),
            new Card('Warrior', 'pe16', 734, 0),
            new Card('Warrior', 'pe17', 734, 0),
            new Card('Warrior', 'pe18', 734, 0),
            new Card('Fire Drake', 'pe19', 1101, 0),
            new Card('Kaeseeall', 'pe20', 1468, 0),
            new Card('Maelena', 'pe21', 1835, 0),
            new Card('A Hero Is Born', 'pe22', 0, 239),
            new Card('Burn', 'pe23', 367, 239),
            new Card('Burn', 'pe24', 367, 239),
            new Card('Greater Burn', 'pe25', 734, 239),
            new Card('Magic Drain', 'pe26', 1101, 239),
            new Card('Magic Drain', 'pe27', 1101, 239),
            new Card('Spirit of the Phoenix', 'pe28', 1468, 239),
            new Card('Spirit of the Phoenix', 'pe29', 1468, 239),
            new Card('Spirit of the Phoenix', 'pe30', 1468, 239),
            new Card('Wall', 'pe33', 0, 478),
            new Card('Wall', 'pe34', 0, 478)
        ]
    }

    that.getDeck = function () {
        return deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Warrior', 'pe13', 734, 0), 0, 6],
            [new Card('Guardian', 'pe07', 367, 0), 1, 5],
            [new Card('Wall', 'pe32', 0, 478), 2, 5],
            [new Card('Prince Elien', 'pe31', 1835, 239), 2, 7],
            [new Card('Archer', 'pe01', 0, 0), 3, 7],
            [new Card('Archer', 'pe02', 0, 0), 5, 6]
        ]
    }

}


var TundraOrcs = function () {

    var that = this;
    deck = [];


    that.initDeck = function () {

        deck = [
            new Card('Grognack', 'to1'/*, 0, 1, false, 4, 7, 0*/),
            new Card('Fighter', 'to2'/*, 1, 1, true, 1, 1, 1*/),
            new Card('Fighter', 'to3'/*, 1, 1, true, 1, 1, 1*/),
            new Card('Fighter', 'to4'/*, 1, 1, true, 1, 1, 1*/),
            new Card('Fighter', 'to5'/*, 1, 1, true, 1, 1, 1*/)]

    }

    that.getDeck = function () {
        return deck;
    }

    that.getStartCards = function () {

        return [
            [new Card('Fighter', 'to6'), 2, 6],
            [new Card('Fighter', 'to7'), 2, 7],
            [new Card('Fighter', 'to8'), 5, 4]
        ]
    }

}



var TundraOrcs = function () {

    var that = this;
    deck = []

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

var PheonixElves = function () {

}
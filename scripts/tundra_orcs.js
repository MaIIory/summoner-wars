/*
var Card = function (name, type, ability, ability_mantatory, atack, life_points, cost) {
    var that = this;
    that.name = name;
    that.type = type; // 0: Summon, 1: Unit, 2:Ability
    that.ability = ability;
    that.ability_mandatory = ability_mandatory;
    that.atack = atack;
    that.life_points = life_points;
    that.cost = cost;

}
*/

var InitDeck = function () {

    return [
        new Card('Grognack', 'to1'/*, 0, 1, false, 4, 7, 0*/),
        new Card('Fighter', 'to2'/*, 1, 1, true, 1, 1, 1*/),
        new Card('Fighter', 'to3'/*, 1, 1, true, 1, 1, 1*/),
        new Card('Fighter', 'to4'/*, 1, 1, true, 1, 1, 1*/),
        new Card('Fighter', 'to5'/*, 1, 1, true, 1, 1, 1*/)]

}

var startCards = function () {
    
}


const COLORS = ['red', 'black', 'blue', 'yellow'];

function createDeck() {
    const deck = [];
    let idCounter = 1;

    // 2 sets of each color 1-13
    for (let set = 0; set < 2; set++) {
        for (const color of COLORS) {
            for (let value = 1; value <= 13; value++) {
                deck.push({
                    id: idCounter++,
                    color,
                    value,
                    type: 'normal'
                });
            }
        }
    }

    // 2 Fake Jokers
    deck.push({ id: idCounter++, type: 'fake_joker', value: 0 }); // value 0 for special handling
    deck.push({ id: idCounter++, type: 'fake_joker', value: 0 });

    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function determineIndicators(deck) {
    // Pick one tile as the indicator
    // In real game, this is picked after shuffle and removed or placed bottom
    // We will pick the last card as indicator for simplicity, or random

    // Actually, usually a die is thrown. We'll just pick a random tile (not fake joker)
    let indicatorIndex = Math.floor(Math.random() * deck.length);
    let indicatorTile = deck[indicatorIndex];

    // Ensure not fake joker for indicator (though rules say if it is, reshuffle, but simpler to just pick again)
    while (indicatorTile.type === 'fake_joker') {
        indicatorIndex = Math.floor(Math.random() * deck.length);
        indicatorTile = deck[indicatorIndex];
    }

    // Remove indicator from deck? In some rules it stays exposed. 
    // In strict rules, it's exposed. The "Okey" is 1 greater than indicator.

    let okeyColor = indicatorTile.color;
    let okeyValue = indicatorTile.value + 1;
    if (okeyValue > 13) okeyValue = 1;

    return {
        indicatorTile,
        okeyTile: { color: okeyColor, value: okeyValue } // This is the "Wildcard" definition
    };
}

function distributeTiles(deck) {
    // 4 players. 
    // Player 1 (Dealer/First) gets 22. Others get 21.
    // Remaining goes to center.

    const hands = [[], [], [], []];

    // Deal 22 to first
    for (let i = 0; i < 22; i++) hands[0].push(deck.pop());

    // Deal 21 to others
    for (let p = 1; p < 4; p++) {
        for (let i = 0; i < 21; i++) hands[p].push(deck.pop());
    }

    return { hands, remainingDeck: deck };
}

module.exports = {
    createDeck,
    shuffleDeck,
    determineIndicators,
    distributeTiles
};

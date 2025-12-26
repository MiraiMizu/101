const { createDeck, shuffleDeck, determineIndicators, distributeTiles } = require('./gameUtils');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> Room Object
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    createRoom(hostSocketId, hostName) {
        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            players: [
                {
                    id: hostSocketId,
                    name: hostName,
                    isHost: true,
                    hand: [],
                    scores: 0
                }
            ],
            gameState: 'WAITING', // WAITING, PLAYING, ENDED
            maxPlayers: 4,
            deck: [],
            turnIndex: 0
        };
        this.rooms.set(roomId, room);
        return room;
    }

    joinRoom(roomId, socketId, playerName) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.players.length >= room.maxPlayers) return { error: 'Room full' };
        if (room.gameState !== 'WAITING') return { error: 'Game already started' };

        const player = {
            id: socketId,
            name: playerName,
            isHost: false,
            hand: [],
            scores: 0
        };
        room.players.push(player);
        return { room };
    }

    leaveRoom(socketId) {
        let roomId = null;
        let roomIsEmpty = false;

        for (const [id, room] of this.rooms) {
            const playerIndex = room.players.findIndex(p => p.id === socketId);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                roomId = id;
                if (room.players.length === 0) {
                    this.rooms.delete(id);
                    roomIsEmpty = true;
                } else if (room.gameState === 'PLAYING') {
                    // Handle disconnect during game - simplified: end game or pause
                    room.gameState = 'PAUSED';
                }
                break;
            }
        }
        return { roomId, roomIsEmpty };
    }

    addBot(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.players.length >= room.maxPlayers) return { error: 'Room full' };
        if (room.gameState !== 'WAITING') return { error: 'Game already started' };

        const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const botName = `Bot ${room.players.length + 1}`;

        const botPlayer = {
            id: botId,
            name: botName,
            isHost: false,
            isBot: true,
            hand: [],
            scores: 0
        };

        room.players.push(botPlayer);
        return { room };
    }

    handleBotTurn(roomId) {
        setTimeout(() => {
            const room = this.rooms.get(roomId);
            if (!room || room.gameState !== 'PLAYING') return;

            const playerIndex = room.turnIndex;
            const player = room.players[playerIndex];
            if (!player.isBot) return; // Verify it's still bot turn

            // 1. Draw
            // Simple AI: Always draw from deck if available, else discard
            // Check if hand size is 21 (needs draw) or 22 (needs discard)
            // Bot logic: If 21, draw. If 22, skip draw.

            let drawnTile = null;
            if (player.hand.length === 21) {
                if (room.deck.length > 0) {
                    drawnTile = room.deck.pop();
                } else {
                    // Deck empty, try discard? Or invalid state?
                    // In basic rules, if deck empty, game ends or reshuffle.
                    // We'll assume deck not empty for MVP or just take from discard if deck empty.
                    // For now, if deck empty, take from discard.
                    const prevIndex = (playerIndex - 1 + room.players.length) % room.players.length;
                    const prevId = room.players[prevIndex].id;
                    if (room.discards[prevId].length > 0) {
                        drawnTile = room.discards[prevId].pop();
                    }
                }

                if (drawnTile) {
                    player.hand.push(drawnTile);
                    // Notify draw
                    // We need 'io' to emit? RoomManager doesn't have 'io' instance directly.
                    // We can return an action to the controller? Or execute logic and let controller poll/callback?
                    // Better pattern: RoomManager returns the result state, Controller emits.
                    // BUT `setTimeout` breaks the sync return pattern.
                    // We will need a callback or event emitter in RoomManager, or pass a callback.
                }
            }

            // 2. Think
            setTimeout(() => {
                // 3. Discard
                if (player.hand.length === 22) {
                    // Discard random
                    const discardIndex = Math.floor(Math.random() * player.hand.length);
                    const discardedTile = player.hand.splice(discardIndex, 1)[0];
                    room.discards[player.id].push(discardedTile);

                    // Pass Turn
                    room.turnIndex = (room.turnIndex + 1) % room.players.length;

                    // Trigger callback/event to notify server
                    if (this.onBotAction) {
                        this.onBotAction(roomId, {
                            type: 'bot_move',
                            playerId: player.id,
                            drawnTile, // might be null if didn't draw (shouldn't happen)
                            discardedTile,
                            nextTurn: room.turnIndex
                        });
                    }
                }
            }, 1000); // 1s delay for discard

            if (drawnTile && this.onBotAction) {
                this.onBotAction(roomId, {
                    type: 'bot_draw',
                    playerId: player.id,
                    source: 'deck' // Simplified
                });
            }

        }, 1500); // 1.5s delay before start
    }

    setBotCallback(cb) {
        this.onBotAction = cb;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.players.length < 2) return { error: 'Not enough players (min 2)' };

        // Initialize Game
        let deck = createDeck();
        deck = shuffleDeck(deck);

        const { indicatorTile, okeyTile } = determineIndicators(deck);
        room.indicatorTile = indicatorTile;
        room.okeyTile = okeyTile; // Wildcard

        // Distribute
        const { hands, remainingDeck } = distributeTiles(deck);
        room.deck = remainingDeck;

        // Assign hands and reset state
        // We need to match hands to players. 
        // Randomize dealer? For now, index 0 is dealer/start.

        room.players.forEach((player, index) => {
            // Find correct hand size? distributeTiles returned 4 hands.
            // If < 4 players, some hands are unused? 
            // Rules: 4 players usually. If 2 players, logic adapts.
            // For 101 Okey, it's effectively 4 players. 
            // If we strictly support 4, it's easier.
            // If < 4, we just use the first N hands.

            if (hands[index]) {
                player.hand = hands[index];
            } else {
                // Should not happen if maxPlayers=4 and we have <4 players
                // But if we have 2 players, they get hands 0 and 1.
                // But distributeTiles always creates 4 hands currently.
                // We can just ignore extra hands.
                player.hand = hands[index];
            }
            player.scores = 0;
        });

        // Initialize Discards (one stack per player position)
        room.discards = {};
        room.players.forEach((p, i) => {
            room.discards[p.id] = [];
        });

        room.gameState = 'PLAYING';
        room.turnIndex = 0; // Host starts

        // Check if first player is bot (unlikely if host creates, but if host leaves and bot remains? or random start?)
        // If host starts, and host is human, do nothing.

        return { room };
    }
    drawTile(roomId, socketId, source) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.gameState !== 'PLAYING') return { error: 'Game not active' };

        // Check turn
        const playerIndex = room.players.findIndex(p => p.id === socketId);
        if (playerIndex !== room.turnIndex) return { error: 'Not your turn' };

        const player = room.players[playerIndex];

        // Check if already drew (hand size check? Normal hand is 21. If 21, need to draw. If 22, already drew need to discard)
        // Wait, initially dealer has 22. Dealer discards first.
        // So if hand size is 22, you cannot draw. You must discard.
        // If hand size is 21, you must draw.

        if (player.hand.length >= 22) return { error: 'Already drew, must discard' };

        let drawnTile;
        if (source === 'deck') {
            if (room.deck.length === 0) return { error: 'Deck empty' };
            drawnTile = room.deck.pop();
        } else if (source === 'discard') {
            // Draw from previous player's discard
            // Previous player index
            const prevIndex = (playerIndex - 1 + room.players.length) % room.players.length;
            const prevPlayerId = room.players[prevIndex].id;
            const discardPile = room.discards[prevPlayerId];

            if (!discardPile || discardPile.length === 0) return { error: 'Discard pile empty' };
            drawnTile = discardPile.pop(); // Take top
        } else {
            return { error: 'Invalid source' };
        }

        player.hand.push(drawnTile);
        return { room, drawnTile };
    }

    discardTile(roomId, socketId, tileIndex) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };
        if (room.gameState !== 'PLAYING') return { error: 'Game not active' };

        const playerIndex = room.players.findIndex(p => p.id === socketId);
        if (playerIndex !== room.turnIndex) return { error: 'Not your turn' };

        const player = room.players[playerIndex];
        if (player.hand.length !== 22) return { error: 'Must draw before discarding' };

        const discardedTile = player.hand.splice(tileIndex, 1)[0];

        // Add to player's discard pile
        room.discards[socketId].push(discardedTile);

        // Pass turn
        room.turnIndex = (room.turnIndex + 1) % room.players.length;

        return { room, discardedTile };
    }
}

module.exports = new RoomManager();

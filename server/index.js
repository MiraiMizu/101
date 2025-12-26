const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Basic health check
app.get('/', (req, res) => {
    res.send('101 Okey Server is running');
});

const roomManager = require('./roomManager');

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ playerName }, callback) => {
        try {
            const room = roomManager.createRoom(socket.id, playerName);
            socket.join(room.id);
            callback({ success: true, room });
            console.log(`Room created: ${room.id} by ${playerName}`);

            // Broadcast room list update
            io.emit('rooms_list_update', roomManager.getPublicRooms());
        } catch (e) {
            callback({ success: false, error: e.message });
        }
    });

    socket.on('get_rooms', (callback) => {
        const rooms = roomManager.getPublicRooms();
        callback(rooms);
    });

    socket.on('join_room', ({ roomId, playerName }, callback) => {
        try {
            // Normalize room code to uppercase
            const normalizedRoomId = roomId.toUpperCase();
            const result = roomManager.joinRoom(normalizedRoomId, socket.id, playerName);
            if (result.error) {
                callback({ success: false, error: result.error });
            } else {
                socket.join(normalizedRoomId);
                callback({ success: true, room: result.room });
                io.to(normalizedRoomId).emit('room_update', result.room);
                io.emit('rooms_list_update', roomManager.getPublicRooms()); // Broadcast update
                console.log(`${playerName} joined room ${normalizedRoomId}`);
            }
        } catch (e) {
            callback({ success: false, error: e.message });
        }
    });

    socket.on('start_game', ({ roomId }, callback) => {
        const result = roomManager.startGame(roomId);
        if (result.error) {
            callback({ success: false, error: result.error });
        } else {
            // Emit game_started to everyone
            // But we need to filter: send entire room? 
            // Players shouldn't see others' hands.
            // So we iterate and send personalized events?
            // Or just send "game_started" and let client fetch/receive mapped data?
            // Or broadcast "game_started" with public info, and send specific hand to each socket.

            const room = result.room;

            room.players.forEach(player => {
                io.to(player.id).emit('game_started', {
                    hand: player.hand,
                    turnIndex: room.turnIndex,
                    indicatorTile: room.indicatorTile,
                    okeyTile: room.okeyTile,
                    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.scores, isHost: p.isHost })), // Hide hands
                    deckSize: room.deck.length
                });
            });

            // Also simpler generic emit for room state update (masked)
            io.to(roomId).emit('room_update', {
                ...room,
                players: room.players.map(p => ({ ...p, hand: undefined })), // Mask hands
                deck: undefined // Mask deck
            });

            callback({ success: true });
        }
    });

    socket.on('draw_tile', ({ roomId, source }, callback) => {
        const result = roomManager.drawTile(roomId, socket.id, source);
        if (result.error) {
            callback({ success: false, error: result.error });
        } else {
            const room = result.room;
            callback({ success: true, tile: result.drawnTile });

            // Notify others that player drew (but don't show tile if from deck)
            // If from discard, everyone knows what it was.
            // Actually, usually drawing from deck is hidden, from discard is visible (implicitly known)

            socket.to(roomId).emit('player_drew', {
                playerId: socket.id,
                source: source
            });
        }
    });

    // Setup Bot Callback
    roomManager.setBotCallback((roomId, action) => {
        if (action.type === 'bot_draw') {
            io.to(roomId).emit('player_drew', {
                playerId: action.playerId,
                source: action.source
            });
        } else if (action.type === 'bot_move') {
            io.to(roomId).emit('player_discarded', {
                playerId: action.playerId,
                tile: action.discardedTile,
                nextTurn: action.nextTurn
            });

            // Check next turn
            const room = roomManager.getRoom(roomId);
            if (room && room.players[room.turnIndex].isBot) {
                roomManager.handleBotTurn(roomId);
            }
        }
    });

    socket.on('add_bot', ({ roomId }, callback) => {
        const result = roomManager.addBot(roomId);
        if (result.error) {
            callback({ success: false, error: result.error });
        } else {
            // Notify room update
            io.to(roomId).emit('room_update', result.room);
            callback({ success: true, room: result.room });
        }
    });

    socket.on('discard_tile', ({ roomId, tileIndex }, callback) => {
        const result = roomManager.discardTile(roomId, socket.id, tileIndex);
        if (result.error) {
            callback({ success: false, error: result.error });
        } else {
            const room = result.room;
            callback({ success: true });

            // Notify everyone of discard and turn change
            io.to(roomId).emit('player_discarded', {
                playerId: socket.id,
                tile: result.discardedTile,
                nextTurn: room.turnIndex
            });

            // Check if next player is bot
            if (room.players[room.turnIndex].isBot) {
                roomManager.handleBotTurn(roomId);
            }
        }
    });

    socket.on('leave_room', () => {
        const { roomId, roomIsEmpty } = roomManager.leaveRoom(socket.id);
        if (roomId) {
            socket.leave(roomId);
            if (!roomIsEmpty) {
                const room = roomManager.getRoom(roomId);
                io.to(roomId).emit('room_update', room);
            }
            console.log(`User left room ${roomId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const { roomId, roomIsEmpty } = roomManager.leaveRoom(socket.id);
        if (roomId) {
            if (!roomIsEmpty) {
                const room = roomManager.getRoom(roomId);
                io.to(roomId).emit('room_update', room);
            }
            io.emit('rooms_list_update', roomManager.getPublicRooms());
        }
    });
});

server.listen(PORT, () => {
    console.log(`SERVER RUNNING on port ${PORT}`);
});

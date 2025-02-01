const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

// Serve static files from public directory
app.use(express.static('public'));

// Game rooms storage
const gameRooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle player looking for game
    socket.on('findGame', () => {
        let joinedRoom = false;
        
        // Try to find an available room
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.length === 1) {
                // Join existing room
                socket.join(roomId);
                room.players.push(socket.id);
                gameRooms.set(roomId, room);
                
                // Notify both players that game can start
                io.to(roomId).emit('gameStart', {
                    roomId,
                    players: room.players,
                    player1: room.players[0],
                    player2: room.players[1]
                });
                
                joinedRoom = true;
                break;
            }
        }
        
        if (!joinedRoom) {
            // Create new room
            const roomId = uuidv4();
            socket.join(roomId);
            gameRooms.set(roomId, {
                players: [socket.id],
                gameState: {
                    food: { x: 10, y: 10 },
                    score1: 0,
                    score2: 0
                }
            });
            
            // Notify player they're waiting for opponent
            socket.emit('waitingForPlayer');
        }
    });

    // Handle player movement
    socket.on('playerMove', (data) => {
        const { roomId, direction } = data;
        if (gameRooms.has(roomId)) {
            // Broadcast movement to other player in room
            socket.to(roomId).emit('opponentMove', direction);
        }
    });

    // Handle food collection
    socket.on('foodCollected', (data) => {
        const { roomId, playerId } = data;
        const room = gameRooms.get(roomId);
        if (room) {
            // Update scores and generate new food position
            const isPlayer1 = room.players[0] === playerId;
            if (isPlayer1) {
                room.gameState.score1 += 10;
            } else {
                room.gameState.score2 += 10;
            }
            
            // Generate new food position
            const newFood = {
                x: Math.floor(Math.random() * 20),
                y: Math.floor(Math.random() * 20)
            };
            room.gameState.food = newFood;
            
            // Broadcast updated game state
            io.to(roomId).emit('gameStateUpdate', room.gameState);
        }
    });

    // Handle game over
    socket.on('gameOver', (data) => {
        const { roomId } = data;
        if (gameRooms.has(roomId)) {
            io.to(roomId).emit('gameEnded', gameRooms.get(roomId).gameState);
            gameRooms.delete(roomId);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // Find and clean up any room the player was in
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit('playerDisconnected');
                gameRooms.delete(roomId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
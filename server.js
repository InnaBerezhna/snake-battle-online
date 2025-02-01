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
    console.log('Player connected:', socket.id);
    let currentRoom = null;

    // Handle player looking for game
    socket.on('findGame', () => {
        let joinedRoom = false;
        
        // Try to find an available room
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players.length === 1) {
                // Join existing room
                socket.join(roomId);
                room.players.push({
                    id: socket.id,
                    isReady: false
                });
                currentRoom = roomId;
                gameRooms.set(roomId, room);
                
                // Notify both players about the match
                io.to(roomId).emit('gameFound', {
                    roomId,
                    players: room.players.map(p => p.id)
                });
                
                joinedRoom = true;
                break;
            }
        }
        
        if (!joinedRoom) {
            // Create new room
            const roomId = uuidv4();
            socket.join(roomId);
            currentRoom = roomId;
            gameRooms.set(roomId, {
                players: [{
                    id: socket.id,
                    isReady: false
                }],
                gameState: {
                    food: { x: 10, y: 10 },
                    score1: 0,
                    score2: 0
                },
                isStarted: false
            });
            
            // Notify player they're waiting
            socket.emit('waitingForPlayer');
        }
    });

    // Handle player ready state
    socket.on('playerReady', () => {
        if (!currentRoom || !gameRooms.has(currentRoom)) return;
        
        const room = gameRooms.get(currentRoom);
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = true;
            
            // Check if all players are ready
            const allReady = room.players.every(p => p.isReady);
            if (allReady && room.players.length === 2) {
                room.isStarted = true;
                io.to(currentRoom).emit('gameStart', {
                    initialFood: room.gameState.food
                });
            } else {
                io.to(currentRoom).emit('playerReadyUpdate', {
                    readyPlayers: room.players.filter(p => p.isReady).length
                });
            }
        }
    });

    // Handle player movement
    socket.on('playerMove', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('opponentMove', data);
    });

    // Handle food collection
    socket.on('foodCollected', (data) => {
        if (!currentRoom || !gameRooms.has(currentRoom)) return;
        
        const room = gameRooms.get(currentRoom);
        const isPlayer1 = room.players[0].id === socket.id;
        
        if (isPlayer1) {
            room.gameState.score1 += 10;
        } else {
            room.gameState.score2 += 10;
        }
        
        // Generate new food position
        room.gameState.food = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20)
        };
        
        // Broadcast updated game state
        io.to(currentRoom).emit('gameStateUpdate', {
            food: room.gameState.food,
            score1: room.gameState.score1,
            score2: room.gameState.score2
        });
    });

    // Handle game over
    socket.on('gameOver', () => {
        if (!currentRoom || !gameRooms.has(currentRoom)) return;
        
        const room = gameRooms.get(currentRoom);
        io.to(currentRoom).emit('gameEnded', {
            winner: socket.id === room.players[0].id ? 'player2' : 'player1',
            finalScore: {
                player1: room.gameState.score1,
                player2: room.gameState.score2
            }
        });
        
        // Clean up room
        gameRooms.delete(currentRoom);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (currentRoom && gameRooms.has(currentRoom)) {
            const room = gameRooms.get(currentRoom);
            
            // Notify other player
            socket.to(currentRoom).emit('opponentDisconnected');
            
            // Clean up room
            gameRooms.delete(currentRoom);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
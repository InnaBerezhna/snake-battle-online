// Connect to Socket.io server
const socket = io();

// Game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');
const score2Element = document.getElementById('score2');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const playerCount = document.getElementById('playerCount');
const playerStatus = document.getElementById('playerStatus');

// Set canvas size
canvas.width = 400;
canvas.height = 400;

// Game constants
const gridSize = 20;
const tileCount = canvas.width / gridSize;
const INITIAL_SPEED = 4;

// Game state
let roomId = null;
let isPlayer1 = false;
let gameRunning = false;
let playerReady = false;
let score = 0;
let opponentScore = 0;

// Snake states
let mySnake = [{ x: 5, y: 5 }];
let opponentSnake = [{ x: 15, y: 15 }];
let dx = 0;
let dy = 0;
let opponentDx = 0;
let opponentDy = 0;
let food = { x: 10, y: 10 };
let gameInterval;

// Game controls
document.addEventListener('keydown', handleKeyPress);
startButton.addEventListener('click', handleReady);

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('findGame');
});

socket.on('waitingForPlayer', () => {
    lobbyScreen.style.display = 'block';
    gameScreen.style.display = 'none';
    playerCount.textContent = '1';
});

socket.on('gameFound', (data) => {
    roomId = data.roomId;
    isPlayer1 = data.players[0] === socket.id;
    
    // Show game screen
    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    
    // Initialize positions based on player number
    if (isPlayer1) {
        mySnake = [{ x: 5, y: 5 }];
        opponentSnake = [{ x: 15, y: 15 }];
    } else {
        mySnake = [{ x: 15, y: 15 }];
        opponentSnake = [{ x: 5, y: 5 }];
    }
    
    playerStatus.textContent = 'Press READY when you want to start!';
    startButton.disabled = false;
});

socket.on('playerReadyUpdate', (data) => {
    playerStatus.textContent = `Players ready: ${data.readyPlayers}/2`;
});

socket.on('gameStart', (data) => {
    food = data.initialFood;
    gameRunning = true;
    startButton.style.display = 'none';
    playerStatus.textContent = 'Game Started! Good luck!';
    startGame();
});

socket.on('opponentMove', (data) => {
    opponentDx = data.dx;
    opponentDy = data.dy;
});

socket.on('gameStateUpdate', (state) => {
    food = state.food;
    if (isPlayer1) {
        score = state.score1;
        opponentScore = state.score2;
    } else {
        score = state.score2;
        opponentScore = state.score1;
    }
    updateScore();
});

socket.on('opponentDisconnected', () => {
    alert('Opponent disconnected!');
    resetGame();
    socket.emit('findGame');
});

socket.on('gameEnded', (data) => {
    const isWinner = (isPlayer1 && data.winner === 'player1') || (!isPlayer1 && data.winner === 'player2');
    const message = isWinner ? 'You won!' : 'Game Over!';
    alert(`${message}\nFinal Score:\nYou: ${score}\nOpponent: ${opponentScore}`);
    resetGame();
    socket.emit('findGame');
});

function handleReady() {
    if (!playerReady) {
        playerReady = true;
        startButton.disabled = true;
        playerStatus.textContent = 'Waiting for opponent...';
        socket.emit('playerReady');
    }
}

function handleKeyPress(event) {
    if (!gameRunning) return;
    
    const key = event.key;
    let newDx = dx;
    let newDy = dy;
    
    if (key === 'ArrowUp' && dy === 0) {
        newDx = 0;
        newDy = -1;
    } else if (key === 'ArrowDown' && dy === 0) {
        newDx = 0;
        newDy = 1;
    } else if (key === 'ArrowLeft' && dx === 0) {
        newDx = -1;
        newDy = 0;
    } else if (key === 'ArrowRight' && dx === 0) {
        newDx = 1;
        newDy = 0;
    }
    
    if (newDx !== dx || newDy !== dy) {
        dx = newDx;
        dy = newDy;
        socket.emit('playerMove', { dx, dy });
    }
}

function startGame() {
    gameInterval = setInterval(gameLoop, 1000 / INITIAL_SPEED);
}

function resetGame() {
    clearInterval(gameInterval);
    gameRunning = false;
    playerReady = false;
    dx = 0;
    dy = 0;
    opponentDx = 0;
    opponentDy = 0;
    score = 0;
    opponentScore = 0;
    updateScore();
    startButton.disabled = false;
    startButton.style.display = 'block';
    startButton.textContent = 'READY!';
}

function updateScore() {
    scoreElement.textContent = score;
    score2Element.textContent = opponentScore;
}

function gameLoop() {
    moveSnake(mySnake, dx, dy);
    moveSnake(opponentSnake, opponentDx, opponentDy);
    
    if (checkSelfCollision(mySnake)) {
        socket.emit('gameOver');
        return;
    }
    
    checkFood();
    draw();
}

function moveSnake(snake, dx, dy) {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Wrap around behavior
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;
    
    snake.unshift(head);
    snake.pop();
}

function checkSelfCollision(snake) {
    const head = snake[0];
    
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function checkFood() {
    const head = mySnake[0];
    
    if (head.x === food.x && head.y === food.y) {
        mySnake.push({});
        socket.emit('foodCollected');
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    for(let i = 0; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    // Draw my snake (Green)
    drawSnake(mySnake, '#39ff14', '#85ff85', dx, dy);
    
    // Draw opponent snake (Red)
    drawSnake(opponentSnake, '#ff3366', '#ff99aa', opponentDx, opponentDy);
    
    // Draw food
    const foodX = food.x * gridSize;
    const foodY = food.y * gridSize;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(foodX + 2, foodY + 2, gridSize - 4, gridSize - 4);
}

function drawSnake(snake, mainColor, eyeColor, dx, dy) {
    snake.forEach((segment, index) => {
        // Main body
        ctx.fillStyle = mainColor;
        ctx.fillRect(
            segment.x * gridSize + 2,
            segment.y * gridSize + 2,
            gridSize - 4,
            gridSize - 4
        );
        
        // Head details
        if (index === 0) {
            ctx.fillStyle = eyeColor;
            const eyeSize = 3;
            const eyeOffset = dx !== 0 ? 4 : 3;
            
            // Draw eyes based on direction
            ctx.fillRect(
                segment.x * gridSize + (dx === 1 ? gridSize - 8 : 4),
                segment.y * gridSize + eyeOffset,
                eyeSize,
                eyeSize
            );
            
            if (dy === 0) {
                ctx.fillRect(
                    segment.x * gridSize + (dx === 1 ? gridSize - 8 : 4),
                    segment.y * gridSize + gridSize - eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            }
        }
    });
} 
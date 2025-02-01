const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');

// Set canvas size
canvas.width = 400;
canvas.height = 400;

// Game constants
const gridSize = 20;
const tileCount = canvas.width / gridSize;
const INITIAL_SPEED = 4; // Slower initial speed
const SPEED_INCREASE = 1.5; // 10% increase
const PIECES_FOR_SPEEDUP = 3; // Speed up every 5 pieces

// Game state
let score1 = 0;
let score2 = 0;
let speed = INITIAL_SPEED;
let piecesEaten = 0;

// Snake 1 (Player 1 - Arrow keys)
let snake1 = [{ x: 5, y: 5 }];
let dx1 = 0;
let dy1 = 0;

// Snake 2 (Player 2 - WASD keys)
let snake2 = [{ x: 15, y: 15 }];
let dx2 = 0;
let dy2 = 0;

let food = { x: 10, y: 10 };
let gameInterval;
let gameRunning = false;

// Game controls
document.addEventListener('keydown', handleKeyPress);
startButton.addEventListener('click', toggleGame);

function handleKeyPress(event) {
    const key = event.key;
    
    // Player 1 controls (Arrow keys)
    if (key === 'ArrowUp' && dy1 === 0) {
        dx1 = 0;
        dy1 = -1;
    } else if (key === 'ArrowDown' && dy1 === 0) {
        dx1 = 0;
        dy1 = 1;
    } else if (key === 'ArrowLeft' && dx1 === 0) {
        dx1 = -1;
        dy1 = 0;
    } else if (key === 'ArrowRight' && dx1 === 0) {
        dx1 = 1;
        dy1 = 0;
    }
    
    // Player 2 controls (WASD)
    if (key === 'w' && dy2 === 0) {
        dx2 = 0;
        dy2 = -1;
    } else if (key === 's' && dy2 === 0) {
        dx2 = 0;
        dy2 = 1;
    } else if (key === 'a' && dx2 === 0) {
        dx2 = -1;
        dy2 = 0;
    } else if (key === 'd' && dx2 === 0) {
        dx2 = 1;
        dy2 = 0;
    }
}

function toggleGame() {
    if (gameRunning) {
        clearInterval(gameInterval);
        startButton.textContent = 'Start Game';
    } else {
        resetGame();
        gameInterval = setInterval(gameLoop, 1000 / speed);
        startButton.textContent = 'Stop Game';
    }
    gameRunning = !gameRunning;
}

function resetGame() {
    snake1 = [{ x: 5, y: 5 }];
    snake2 = [{ x: 15, y: 15 }];
    dx1 = 0;
    dy1 = 0;
    dx2 = 0;
    dy2 = 0;
    score1 = 0;
    score2 = 0;
    speed = INITIAL_SPEED;
    piecesEaten = 0;
    placeFood();
    updateScore();
}

function updateScore() {
    scoreElement.textContent = `P1: ${score1} | P2: ${score2}`;
}

function gameLoop() {
    moveSnake(snake1, dx1, dy1);
    moveSnake(snake2, dx2, dy2);
    
    // Check collisions for both snakes
    if (checkSelfCollision(snake1)) {
        endGame("Player 1");
        return;
    }
    if (checkSelfCollision(snake2)) {
        endGame("Player 2");
        return;
    }
    
    checkFood();
    draw();
}

function endGame(losingPlayer) {
    clearInterval(gameInterval);
    const winner = score1 > score2 ? "Player 1" : score2 > score1 ? "Player 2" : "It's a tie";
    alert(`${losingPlayer} hit themselves!\nGame Over!\nFinal Score:\nPlayer 1: ${score1}\nPlayer 2: ${score2}\n${winner} wins!`);
    gameRunning = false;
    startButton.textContent = 'Start Game';
}

function moveSnake(snake, dx, dy) {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Wrap around behavior
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;
    
    snake.unshift(head);
    if (!checkFood()) {
        snake.pop();
    }
}

function checkSelfCollision(snake) {
    const head = snake[0];
    
    // Only check for self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function checkFood() {
    // Check both snakes for food collision
    const head1 = snake1[0];
    const head2 = snake2[0];
    
    if (head1.x === food.x && head1.y === food.y) {
        score1 += 10;
        piecesEaten++;
        updateScore();
        placeFood();
        return true;
    }
    
    if (head2.x === food.x && head2.y === food.y) {
        score2 += 10;
        piecesEaten++;
        updateScore();
        placeFood();
        return true;
    }
    
    return false;
}

function placeFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Make sure food doesn't appear on either snake
    const checkSnake = (snake) => {
        for (let segment of snake) {
            if (food.x === segment.x && food.y === segment.y) {
                placeFood();
                return;
            }
        }
    };
    
    checkSnake(snake1);
    checkSnake(snake2);
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
    
    // Draw snake 1 (Green)
    drawSnake(snake1, '#39ff14', '#85ff85', dx1, dy1);
    
    // Draw snake 2 (Blue)
    drawSnake(snake2, '#00ffff', '#99ffff', dx2, dy2);
    
    // Draw food
    const foodX = food.x * gridSize;
    const foodY = food.y * gridSize;
    
    // Main apple shape
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(foodX + 4, foodY + 2, gridSize - 8, gridSize - 4);
    ctx.fillRect(foodX + 2, foodY + 4, gridSize - 4, gridSize - 8);
    
    // Shine details
    ctx.fillStyle = '#ff9999';
    ctx.fillRect(foodX + 4, foodY + 4, 3, 3);
    
    // Leaf
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(foodX + gridSize - 8, foodY + 2, 4, 4);
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
        
        // Pixel art details
        if (index === 0) { // Head
            ctx.fillStyle = eyeColor;
            // Eyes
            const eyeSize = 3;
            const eyeOffset = dx !== 0 ? 4 : 3;
            ctx.fillRect(
                segment.x * gridSize + (dx === 1 ? gridSize - 8 : 4),
                segment.y * gridSize + eyeOffset,
                eyeSize,
                eyeSize
            );
            if (dy === 0) { // Second eye only visible when moving horizontally
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
// ==================== CONSTANTS ====================
const GRAVITY = 0.15;
const FRUIT_COLORS = ['#ff6b35', '#ff1744', '#00e676', '#ffd600']; // orange, red, green, yellow

// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    gameObjects: [],
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastSpawnTime: 0,
    spawnInterval: 0 // Will be set randomly
};

// ==================== GAME OBJECT CLASS ====================
class GameObject {
    constructor(x, y, radius, velocityX, velocityY, color, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.color = color;
        this.type = type; // 'fruit' or 'bomb'
    }

    update() {
        // Apply gravity
        this.velocityY += GRAVITY;
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw border for bomb
        if (this.type === 'bomb') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    isOffScreen(canvasHeight) {
        return this.y > canvasHeight + this.radius;
    }
}

// ==================== INITIALIZATION ====================
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    resizeCanvas();
    setupEventListeners();
    setNextSpawnTime();
    gameLoop();
}

function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
}

function setNextSpawnTime() {
    // Random spawn interval between 1.5 and 2 seconds
    gameState.spawnInterval = 1500 + Math.random() * 500;
    gameState.lastSpawnTime = Date.now();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Mouse events
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Touch events (for mobile)
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    // Resize handler
    window.addEventListener('resize', resizeCanvas);
}

function handleMouseDown(e) {
    gameState.isDrawing = true;
    gameState.lastX = e.clientX;
    gameState.lastY = e.clientY;
}

function handleMouseMove(e) {
    if (gameState.isDrawing) {
        addBladeTrailPoint(e.clientX, e.clientY);
    }
}

function handleMouseUp(e) {
    gameState.isDrawing = false;
}

// Touch handlers
function handleTouchStart(e) {
    if (e.touches.length > 0) {
        gameState.isDrawing = true;
        const touch = e.touches[0];
        gameState.lastX = touch.clientX;
        gameState.lastY = touch.clientY;
    }
}

function handleTouchMove(e) {
    if (gameState.isDrawing && e.touches.length > 0) {
        const touch = e.touches[0];
        addBladeTrailPoint(touch.clientX, touch.clientY);
    }
}

function handleTouchEnd(e) {
    gameState.isDrawing = false;
}

// ==================== BLADE TRAIL SYSTEM ====================
function addBladeTrailPoint(x, y) {
    const now = Date.now();
    gameState.bladeTrail.push({
        x: x,
        y: y,
        timestamp: now,
        life: 1 // 0 to 1 (for opacity)
    });
}

// ==================== SPAWNER SYSTEM ====================
function spawnObjects() {
    const now = Date.now();
    
    if (now - gameState.lastSpawnTime < gameState.spawnInterval) {
        return; // Not time to spawn yet
    }

    // Spawn 1-3 objects
    const objectCount = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < objectCount; i++) {
        // Random spawn position from bottom, spread across width
        const x = Math.random() * gameState.canvas.width;
        const y = gameState.canvas.height;
        const radius = 15 + Math.random() * 10;

        // Velocity: upward (negative Y) + slight horizontal variation
        const velocityY = -10 - Math.random() * 4; // -10 to -14
        const velocityX = (Math.random() - 0.5) * 8; // Sway left/right

        // Type: 85% fruit, 15% bomb
        const rand = Math.random();
        const isBomb = rand < 0.15;
        const type = isBomb ? 'bomb' : 'fruit';
        
        let color;
        if (isBomb) {
            color = '#111111'; // Black bomb
        } else {
            color = FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)];
        }

        const obj = new GameObject(x, y, radius, velocityX, velocityY, color, type);
        gameState.gameObjects.push(obj);
    }

    setNextSpawnTime();
}

// ==================== UPDATE & DRAW ====================
function drawBladeTrail() {
    const ctx = gameState.ctx;
    const now = Date.now();
    const trailLifetime = 150; // milliseconds
    
    // Remove old trail points and update life
    gameState.bladeTrail = gameState.bladeTrail.filter(point => {
        const age = now - point.timestamp;
        if (age > trailLifetime) {
            return false; // Remove old points
        }
        point.life = 1 - (age / trailLifetime); // Fade out
        return true;
    });
    
    // Draw trail
    if (gameState.bladeTrail.length > 1) {
        for (let i = 0; i < gameState.bladeTrail.length - 1; i++) {
            const point1 = gameState.bladeTrail[i];
            const point2 = gameState.bladeTrail[i + 1];
            
            // Interpolate life (take average)
            const avgLife = (point1.life + point2.life) / 2;
            
            // Line width: start thick (25px) and taper to thin (2px)
            const lineWidth = 25 * avgLife + 2;
            
            // Draw line with gradient opacity
            ctx.strokeStyle = `rgba(236, 240, 241, ${0.8 * avgLife})`;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(point1.x, point1.y);
            ctx.lineTo(point2.x, point2.y);
            ctx.stroke();
        }
    }
}

function updateGameObjects() {
    // Update all game objects
    for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
        const obj = gameState.gameObjects[i];
        obj.update();

        // Remove objects that go off-screen
        if (obj.isOffScreen(gameState.canvas.height)) {
            gameState.gameObjects.splice(i, 1);
        }
    }
}

function drawGameObjects() {
    const ctx = gameState.ctx;
    for (const obj of gameState.gameObjects) {
        obj.draw(ctx);
    }
}

// ==================== GAME LOOP ====================
function gameLoop() {
    const ctx = gameState.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // Spawn new objects
    spawnObjects();
    
    // Update and draw game objects
    updateGameObjects();
    drawGameObjects();
    
    // Draw blade trail (on top)
    drawBladeTrail();
    
    // Next frame
    requestAnimationFrame(gameLoop);
}

// ==================== START GAME ====================
window.addEventListener('DOMContentLoaded', init);
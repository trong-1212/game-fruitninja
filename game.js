// ==================== GAME CONSTANTS ====================
const GRAVITY = 500; // pixels per second squared
const SPAWN_INTERVAL = 1500; // 1.5 - 2 giây
const FRUIT_SPAWN_CHANCE = 0.85; // 85% hoa quả, 15% bom
const FRUIT_COLORS = ['#ff6b35', '#ff1744', '#00e676', '#ffd600'];
const FRUIT_POINTS = 10;

// Emoji thay thế hình ảnh
const FRUIT_EMOJIS = ['🍊', '🍎', '🍉', '🍌'];
const BOMB_EMOJI = '💣';

// ==================== ASSET MANAGER ====================
class AssetManager {
    constructor() {
        this.assets = {};
        this.fontSize = 60; // Kích thước emoji
    }

    loadEmoji(name, emoji) {
        this.assets[name] = emoji;
    }

    getEmoji(name) {
        return this.assets[name] || '⭕';
    }

    drawEmoji(ctx, emoji, x, y, size = 60, rotation = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }
}

const assetManager = new AssetManager();

// Load emojis
FRUIT_EMOJIS.forEach((emoji, i) => {
    assetManager.loadEmoji(`fruit${i}`, emoji);
});
assetManager.loadEmoji('bomb', BOMB_EMOJI);

// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    gameObjects: [],
    particles: [],
    fruitPieces: [], // Nửa hoa quả
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastSpawnTime: 0,
    lastFrameTime: 0,
    score: 0,
    lives: 3,
    isGameOver: false
};

// ==================== FRUIT PIECE CLASS ====================
class FruitPiece {
    constructor(x, y, velocityX, velocityY, emoji, side) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.emoji = emoji;
        this.side = side; // 'left' hoặc 'right'
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 10; // rad/s
        this.alpha = 1;
        this.lifetime = 1; // seconds
        this.createdAt = Date.now();
        this.scale = 0.7;
    }

    update(deltaTime) {
        this.velocityY += GRAVITY * deltaTime;
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;

        const age = (Date.now() - this.createdAt) / 1000;
        this.alpha = Math.max(0, 1 - (age / this.lifetime));
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        assetManager.drawEmoji(ctx, this.emoji, this.x, this.y, 50 * this.scale, this.rotation);
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.alpha <= 0;
    }
}

// ==================== GAME OBJECT CLASS ====================
class GameObject {
    constructor(x, y, radius, velocityX, velocityY, color, emoji, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocityX = velocityX; // pixels per second
        this.velocityY = velocityY; // pixels per second
        this.color = color;
        this.emoji = emoji;
        this.type = type; // 'fruit' or 'bomb'
        this.wasMissed = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 5; // rad/s
    }

    update(deltaTime) {
        // Áp dụng gravity (deltaTime tính bằng giây)
        this.velocityY += GRAVITY * deltaTime;
        
        // Cập nhật vị trí dựa trên deltaTime
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Xoay vật thể
        this.rotation += this.rotationSpeed * deltaTime;
    }

    draw(ctx) {
        assetManager.drawEmoji(ctx, this.emoji, this.x, this.y, 60, this.rotation);
    }

    isOutOfBounds(canvasHeight) {
        return this.y > canvasHeight + 50;
    }
}

// ==================== PARTICLE CLASS ====================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 3 + Math.random() * 4;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 300; // pixels per second
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        
        this.alpha = 1;
        this.lifetime = 0.6; // seconds
        this.createdAt = Date.now();
    }

    update(deltaTime) {
        this.velocityY += GRAVITY * 0.3 * deltaTime;
        
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        const age = (Date.now() - this.createdAt) / 1000;
        this.alpha = Math.max(0, 1 - (age / this.lifetime));
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.alpha <= 0;
    }
}

// ==================== INITIALIZATION ====================
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    resizeCanvas();
    setupEventListeners();
    gameState.lastSpawnTime = Date.now();
    gameState.lastFrameTime = Date.now();
    gameLoop();
}

function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
}

// ==================== RESET GAME ====================
function resetGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.isGameOver = false;
    gameState.bladeTrail = [];
    gameState.gameObjects = [];
    gameState.particles = [];
    gameState.fruitPieces = [];
    gameState.lastSpawnTime = Date.now();
    gameState.lastFrameTime = Date.now();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    window.addEventListener('resize', resizeCanvas);
}

function handleMouseDown(e) {
    if (gameState.isGameOver) return;
    gameState.isDrawing = true;
    gameState.lastX = e.clientX;
    gameState.lastY = e.clientY;
}

function handleMouseMove(e) {
    if (gameState.isDrawing && !gameState.isGameOver) {
        addBladeTrailPoint(e.clientX, e.clientY);
    }
}

function handleMouseUp(e) {
    gameState.isDrawing = false;
}

function handleClick(e) {
    if (gameState.isGameOver) {
        resetGame();
    }
}

function handleTouchStart(e) {
    if (gameState.isGameOver) return;
    if (e.touches.length > 0) {
        gameState.isDrawing = true;
        const touch = e.touches[0];
        gameState.lastX = touch.clientX;
        gameState.lastY = touch.clientY;
    }
}

function handleTouchMove(e) {
    if (gameState.isDrawing && !gameState.isGameOver && e.touches.length > 0) {
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
        life: 1
    });
}

// ==================== SPAWNER SYSTEM ====================
function spawnObjects() {
    if (gameState.isGameOver) return;
    
    const now = Date.now();
    if (now - gameState.lastSpawnTime < SPAWN_INTERVAL) {
        return;
    }

    gameState.lastSpawnTime = now;

    const count = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
        const isFruit = Math.random() < FRUIT_SPAWN_CHANCE;
        
        const x = Math.random() * gameState.canvas.width;
        const y = gameState.canvas.height;
        const radius = 15 + Math.random() * 10;
        
        // Vận tốc ban đầu (pixels per second) - FIX: velocityY phải âm (bay lên)
        const velocityX = (Math.random() - 0.5) * 400; // -200 to 200
        const velocityY = -(500 + Math.random() * 300); // -500 to -800 (âm = bay lên)
        
        let emoji;
        let type;

        if (isFruit) {
            emoji = FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];
            type = 'fruit';
        } else {
            emoji = BOMB_EMOJI;
            type = 'bomb';
        }

        gameState.gameObjects.push(
            new GameObject(x, y, radius, velocityX, velocityY, '#fff', emoji, type)
        );
    }
}

// ==================== COLLISION DETECTION ====================
function getBladeSegment() {
    if (gameState.bladeTrail.length < 2) {
        return null;
    }

    const p1 = gameState.bladeTrail[gameState.bladeTrail.length - 2];
    const p2 = gameState.bladeTrail[gameState.bladeTrail.length - 1];

    return { p1, p2 };
}

function lineCircleIntersection(p1, p2, circle) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - circle.x;
    const fy = p1.y - circle.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - circle.radius * circle.radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return false;
    }

    const discriminantSqrt = Math.sqrt(discriminant);
    const t1 = (-b - discriminantSqrt) / (2 * a);
    const t2 = (-b + discriminantSqrt) / (2 * a);

    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
        return true;
    }

    return false;
}

function checkCollisions() {
    const bladeSegment = getBladeSegment();
    if (!bladeSegment) return;

    const { p1, p2 } = bladeSegment;

    for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
        const obj = gameState.gameObjects[i];

        if (lineCircleIntersection(p1, p2, obj)) {
            if (obj.type === 'fruit') {
                createParticles(obj.x, obj.y, obj.color);
                createFruitPieces(obj.x, obj.y, obj.velocityX, obj.velocityY, obj.emoji);
                gameState.score += FRUIT_POINTS;
                console.log('Score +' + FRUIT_POINTS + ' - Total:', gameState.score);
                gameState.gameObjects.splice(i, 1);
            } else if (obj.type === 'bomb') {
                console.log('BOOM! Game Over!');
                gameState.lives = 0;
                gameState.isGameOver = true;
                gameState.gameObjects.splice(i, 1);
            }
        }
    }
}

// ==================== FRUIT PIECES ====================
function createFruitPieces(x, y, baseVelX, baseVelY, emoji) {
    // Nửa trái - bay sang trái
    const leftPiece = new FruitPiece(
        x - 10,
        y,
        baseVelX - 200, // bay sang trái
        baseVelY,
        emoji,
        'left'
    );
    gameState.fruitPieces.push(leftPiece);

    // Nửa phải - bay sang phải
    const rightPiece = new FruitPiece(
        x + 10,
        y,
        baseVelX + 200, // bay sang phải
        baseVelY,
        emoji,
        'right'
    );
    gameState.fruitPieces.push(rightPiece);
}

// ==================== PARTICLE SYSTEM ====================
function createParticles(x, y, color) {
    const particleCount = 15 + Math.floor(Math.random() * 6);

    for (let i = 0; i < particleCount; i++) {
        gameState.particles.push(new Particle(x, y, color));
    }
}

// ==================== DRAWING ====================
function drawBladeTrail() {
    const ctx = gameState.ctx;
    const now = Date.now();
    const trailLifetime = 150; // milliseconds
    
    gameState.bladeTrail = gameState.bladeTrail.filter(point => {
        const age = now - point.timestamp;
        if (age > trailLifetime) {
            return false;
        }
        point.life = 1 - (age / trailLifetime);
        return true;
    });
    
    if (gameState.bladeTrail.length > 1) {
        for (let i = 0; i < gameState.bladeTrail.length - 1; i++) {
            const point1 = gameState.bladeTrail[i];
            const point2 = gameState.bladeTrail[i + 1];
            
            const avgLife = (point1.life + point2.life) / 2;
            const lineWidth = 25 * avgLife + 2;
            
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

function drawGameObjects() {
    const ctx = gameState.ctx;

    for (const obj of gameState.gameObjects) {
        obj.draw(ctx);
    }
}

function drawFruitPieces() {
    const ctx = gameState.ctx;

    for (const piece of gameState.fruitPieces) {
        piece.draw(ctx);
    }
}

function drawParticles() {
    const ctx = gameState.ctx;

    for (const particle of gameState.particles) {
        particle.draw(ctx);
    }
}

function drawUI() {
    const ctx = gameState.ctx;
    
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + gameState.score, 20, 50);
    
    ctx.textAlign = 'right';
    ctx.fillText('Lives: ' + gameState.lives, gameState.canvas.width - 20, 50);
}

function drawGameOver() {
    const ctx = gameState.ctx;
    const centerX = gameState.canvas.width / 2;
    const centerY = gameState.canvas.height / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#ff1744';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', centerX, centerY - 50);
    
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Final Score: ' + gameState.score, centerX, centerY + 40);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffd600';
    ctx.fillText('Click to Restart', centerX, centerY + 100);
}

// ==================== GAME LOOP WITH DELTA TIME ====================
function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - gameState.lastFrameTime) / 1000; // Convert to seconds
    gameState.lastFrameTime = now;

    // Update (nếu game chưa kết thúc)
    if (!gameState.isGameOver) {
        spawnObjects();
        
        // Update game objects với deltaTime
        for (const obj of gameState.gameObjects) {
            obj.update(deltaTime);
        }

        // Kiểm tra fruit rơi qua mép dưới (miss)
        for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
            const obj = gameState.gameObjects[i];
            if (obj.isOutOfBounds(gameState.canvas.height) && !obj.wasMissed) {
                obj.wasMissed = true;
                if (obj.type === 'fruit') {
                    gameState.lives--;
                    console.log('Miss! Lives: ' + gameState.lives);
                    if (gameState.lives <= 0) {
                        gameState.isGameOver = true;
                    }
                }
                gameState.gameObjects.splice(i, 1);
            }
        }

        // Update fruit pieces
        for (let i = gameState.fruitPieces.length - 1; i >= 0; i--) {
            gameState.fruitPieces[i].update(deltaTime);
            if (gameState.fruitPieces[i].isDead()) {
                gameState.fruitPieces.splice(i, 1);
            }
        }

        // Update particles với deltaTime
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            gameState.particles[i].update(deltaTime);
            if (gameState.particles[i].isDead()) {
                gameState.particles.splice(i, 1);
            }
        }

        // Collision detection
        checkCollisions();
    }

    // Draw
    const ctx = gameState.ctx;
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    if (!gameState.isGameOver) {
        drawGameObjects();
        drawFruitPieces();
        drawParticles();
        drawBladeTrail();
        drawUI();
    } else {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

// ==================== START GAME ====================
window.addEventListener('DOMContentLoaded', init);
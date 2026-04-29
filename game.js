// ==================== GAME CONSTANTS ====================
const GRAVITY = 500; // pixels per second squared
const SPAWN_INTERVAL = 1500; // 1.5 - 2 giây
const FRUIT_SPAWN_CHANCE = 0.85; // 85% hoa quả, 15% bom
const FRUIT_COLORS = ['#ff6b35', '#ff1744', '#00e676', '#ffd600'];
const FRUIT_POINTS = 10;

// Emoji thay thế hình ảnh
const FRUIT_EMOJIS = ['🍊', '🍎', '🍉', '🍌'];
const BOMB_EMOJI = '💣';

// ==================== SOUND MANAGER ====================
class SoundManager {
    constructor() {
        this.isMuted = false;
        this.lastSwooshTime = 0;
        this.swooshCooldown = 100; // ms
        this.audioContext = null;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('AudioContext not supported');
        }
    }

    playSwoosh() {
        if (this.isMuted || !this.audioContext) return;
        
        const now = Date.now();
        if (now - this.lastSwooshTime < this.swooshCooldown) return;
        this.lastSwooshTime = now;

        try {
            const audioContext = this.audioContext;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Swoosh error:', e);
        }
    }

    playSplatter() {
        if (this.isMuted || !this.audioContext) return;

        try {
            const audioContext = this.audioContext;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            console.log('Splatter error:', e);
        }
    }

    playExplosion() {
        if (this.isMuted || !this.audioContext) return;

        try {
            const audioContext = this.audioContext;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);

            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Explosion error:', e);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

const soundManager = new SoundManager();

// ==================== ASSET MANAGER ====================
class AssetManager {
    constructor() {
        this.assets = {};
    }

    loadEmoji(name, emoji) {
        this.assets[name] = emoji;
    }

    drawEmoji(ctx, emoji, x, y, size = 60, rotation = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.font = size + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }
}

const assetManager = new AssetManager();

// Load emojis
FRUIT_EMOJIS.forEach((emoji, i) => {
    assetManager.loadEmoji('fruit' + i, emoji);
});
assetManager.loadEmoji('bomb', BOMB_EMOJI);

// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    gameObjects: [],
    particles: [],
    fruitPieces: [],
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastSpawnTime: 0,
    lastFrameTime: 0,
    score: 0,
    lives: 3,
    isGameOver: false,
    isSoundOn: true
};

// ==================== FRUIT PIECE CLASS ====================
class FruitPiece {
    constructor(x, y, velocityX, velocityY, emoji, side) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.emoji = emoji;
        this.side = side;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
        this.alpha = 1;
        this.lifetime = 1;
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
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.color = color;
        this.emoji = emoji;
        this.type = type;
        this.wasMissed = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 5;
    }

    update(deltaTime) {
        this.velocityY += GRAVITY * deltaTime;
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;
    }

    draw(ctx) {
        assetManager.drawEmoji(ctx, this.emoji, this.x, this.y, 60, this.rotation);
    }

    isOutOfBounds(canvasWidth, canvasHeight) {
        return this.y > canvasHeight + 50 || this.x < -50 || this.x > canvasWidth + 50;
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
        const speed = 200 + Math.random() * 300;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        
        this.alpha = 1;
        this.lifetime = 0.6;
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
        
        const dx = e.clientX - gameState.lastX;
        const dy = e.clientY - gameState.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        
        if (speed > 5) {
            soundManager.playSwoosh();
        }
        
        gameState.lastX = e.clientX;
        gameState.lastY = e.clientY;
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
        
        const dx = touch.clientX - gameState.lastX;
        const dy = touch.clientY - gameState.lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        
        if (speed > 5) {
            soundManager.playSwoosh();
        }
        
        gameState.lastX = touch.clientX;
        gameState.lastY = touch.clientY;
    }
}

function handleTouchEnd(e) {
    gameState.isDrawing = false;
}

function toggleMute() {
    gameState.isSoundOn = !soundManager.toggleMute();
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
        
        // Spawn từ 3 cạnh: trái, phải, dưới - hướng về giữa màn hình
        const spawnSide = Math.floor(Math.random() * 3);
        let x, y;
        
        if (spawnSide === 0) {
            x = -30;
            y = Math.random() * (gameState.canvas.height * 0.6) + gameState.canvas.height * 0.1;
        } else if (spawnSide === 1) {
            x = gameState.canvas.width + 30;
            y = Math.random() * (gameState.canvas.height * 0.6) + gameState.canvas.height * 0.1;
        } else {
            x = Math.random() * gameState.canvas.width;
            y = gameState.canvas.height + 30;
        }
        
        const radius = 15 + Math.random() * 10;
        
        // Velocity hướng về giữa màn hình
        const centerX = gameState.canvas.width / 2;
        const centerY = gameState.canvas.height / 2;
        
        const dx = centerX - x;
        const dy = centerY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        const speed = 300 + Math.random() * 200;
        const velocityX = normalizedDx * speed;
        const velocityY = normalizedDy * speed - (200 + Math.random() * 200);
        
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

    const p1 = bladeSegment.p1;
    const p2 = bladeSegment.p2;

    for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
        const obj = gameState.gameObjects[i];

        if (lineCircleIntersection(p1, p2, obj)) {
            if (obj.type === 'fruit') {
                createParticles(obj.x, obj.y, obj.color);
                createFruitPieces(obj.x, obj.y, obj.velocityX, obj.velocityY, obj.emoji);
                gameState.score += FRUIT_POINTS;
                soundManager.playSplatter();
                console.log('Score +' + FRUIT_POINTS + ' - Total:', gameState.score);
                gameState.gameObjects.splice(i, 1);
            } else if (obj.type === 'bomb') {
                console.log('BOOM! Game Over!');
                soundManager.playExplosion();
                gameState.lives = 0;
                gameState.isGameOver = true;
                gameState.gameObjects.splice(i, 1);
            }
        }
    }
}

// ==================== FRUIT PIECES ====================
function createFruitPieces(x, y, baseVelX, baseVelY, emoji) {
    const leftPiece = new FruitPiece(
        x - 10,
        y,
        baseVelX - 200,
        baseVelY,
        emoji,
        'left'
    );
    gameState.fruitPieces.push(leftPiece);

    const rightPiece = new FruitPiece(
        x + 10,
        y,
        baseVelX + 200,
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
    const trailLifetime = 150;
    
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
            
            ctx.strokeStyle = 'rgba(236, 240, 241, ' + (0.8 * avgLife) + ')';
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

    for (let i = 0; i < gameState.gameObjects.length; i++) {
        gameState.gameObjects[i].draw(ctx);
    }
}

function drawFruitPieces() {
    const ctx = gameState.ctx;

    for (let i = 0; i < gameState.fruitPieces.length; i++) {
        gameState.fruitPieces[i].draw(ctx);
    }
}

function drawParticles() {
    const ctx = gameState.ctx;

    for (let i = 0; i < gameState.particles.length; i++) {
        gameState.particles[i].draw(ctx);
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
    
    // Mute button emoji
    const muteText = gameState.isSoundOn ? '🔊' : '🔇';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(muteText, gameState.canvas.width - 20, 100);
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
    const deltaTime = (now - gameState.lastFrameTime) / 1000;
    gameState.lastFrameTime = now;

    if (!gameState.isGameOver) {
        spawnObjects();
        
        for (let i = 0; i < gameState.gameObjects.length; i++) {
            gameState.gameObjects[i].update(deltaTime);
        }

        for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
            const obj = gameState.gameObjects[i];
            if (obj.isOutOfBounds(gameState.canvas.width, gameState.canvas.height) && !obj.wasMissed) {
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

        for (let i = gameState.fruitPieces.length - 1; i >= 0; i--) {
            gameState.fruitPieces[i].update(deltaTime);
            if (gameState.fruitPieces[i].isDead()) {
                gameState.fruitPieces.splice(i, 1);
            }
        }

        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            gameState.particles[i].update(deltaTime);
            if (gameState.particles[i].isDead()) {
                gameState.particles.splice(i, 1);
            }
        }

        checkCollisions();
    }

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
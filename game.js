// ==================== GAME CONSTANTS ====================
const GRAVITY = 0.15;
const SPAWN_INTERVAL = 1500; // 1.5 - 2 giây
const FRUIT_SPAWN_CHANCE = 0.85; // 85% hoa quả, 15% bom
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms
const FRUIT_COLORS = ['#ff6b35', '#ff1744', '#00e676', '#ffd600']; // orange, red, green, yellow

// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    gameObjects: [],
    particles: [],
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastSpawnTime: 0,
    lastFrameTime: 0,
    score: 0
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
        // Áp dụng gravity
        this.velocityY += GRAVITY;
        
        // Cập nhật vị trí
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ viền cho bomb
        if (this.type === 'bomb') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    isOutOfBounds(canvasHeight) {
        return this.y > canvasHeight + this.radius;
    }
}

// ==================== PARTICLE CLASS ====================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 3 + Math.random() * 4;
        
        // Vận tốc ngẫu nhiên theo mọi hướng
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        
        this.alpha = 1;
        this.lifetime = 600; // milliseconds
        this.createdAt = Date.now();
    }

    update() {
        // Áp dụng gravity
        this.velocityY += GRAVITY * 0.5;
        
        // Cập nhật vị trí
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Mờ dần theo thời gian
        const age = Date.now() - this.createdAt;
        this.alpha = Math.max(0, 1 - (age / this.lifetime));
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        life: 1
    });
}

// ==================== SPAWNER SYSTEM ====================
function spawnObjects() {
    const now = Date.now();
    if (now - gameState.lastSpawnTime < SPAWN_INTERVAL) {
        return;
    }

    gameState.lastSpawnTime = now;

    // Sinh ra 1 đến 3 vật thể
    const count = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
        const isFruit = Math.random() < FRUIT_SPAWN_CHANCE;
        
        const x = Math.random() * gameState.canvas.width;
        const y = gameState.canvas.height;
        const radius = 15 + Math.random() * 10;
        
        // Vận tốc ban đầu
        const velocityX = (Math.random() - 0.5) * 8; // -4 đến 4
        const velocityY = -(10 + Math.random() * 4); // -10 đến -14
        
        let color;
        let type;

        if (isFruit) {
            // Màu hoa quả ngẫu nhiên
            color = FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)];
            type = 'fruit';
        } else {
            // Bom
            color = '#111111';
            type = 'bomb';
        }

        gameState.gameObjects.push(
            new GameObject(x, y, radius, velocityX, velocityY, color, type)
        );
    }
}

// ==================== COLLISION DETECTION (LINE-CIRCLE INTERSECTION) ====================
function getBladeSegment() {
    if (gameState.bladeTrail.length < 2) {
        return null;
    }

    // Lấy 2 điểm mới nhất
    const p1 = gameState.bladeTrail[gameState.bladeTrail.length - 2];
    const p2 = gameState.bladeTrail[gameState.bladeTrail.length - 1];

    return { p1, p2 };
}

function lineCircleIntersection(p1, p2, circle) {
    // Kiểm tra xem đoạn thẳng p1-p2 có cắt qua hình tròn không
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

    // Kiểm tra xem giao điểm có nằm trên đoạn thẳng không
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
        return true;
    }

    return false;
}

function checkCollisions() {
    const bladeSegment = getBladeSegment();
    if (!bladeSegment) return;

    const { p1, p2 } = bladeSegment;

    // Kiểm tra va chạm với từng GameObject
    for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
        const obj = gameState.gameObjects[i];

        if (lineCircleIntersection(p1, p2, obj)) {
            if (obj.type === 'fruit') {
                // Chém trúng hoa quả
                createParticles(obj.x, obj.y, obj.color);
                gameState.score++;
                console.log('Score +1 - Total:', gameState.score);
                gameState.gameObjects.splice(i, 1);
            } else if (obj.type === 'bomb') {
                // Chém trúng bom
                console.log('BOOM!');
                gameState.gameObjects.splice(i, 1);
            }
        }
    }
}

// ==================== PARTICLE SYSTEM ====================
function createParticles(x, y, color) {
    const particleCount = 15 + Math.floor(Math.random() * 6); // 15-20 particles

    for (let i = 0; i < particleCount; i++) {
        gameState.particles.push(new Particle(x, y, color));
    }
}

// ==================== DRAWING ====================
function drawBladeTrail() {
    const ctx = gameState.ctx;
    const now = Date.now();
    const trailLifetime = 150; // milliseconds
    
    // Remove old trail points and update life
    gameState.bladeTrail = gameState.bladeTrail.filter(point => {
        const age = now - point.timestamp;
        if (age > trailLifetime) {
            return false;
        }
        point.life = 1 - (age / trailLifetime);
        return true;
    });
    
    // Draw trail
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

function drawParticles() {
    const ctx = gameState.ctx;

    for (const particle of gameState.particles) {
        particle.draw(ctx);
    }
}

function drawScore() {
    const ctx = gameState.ctx;
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Score: ' + gameState.score, 20, 50);
}

// ==================== GAME LOOP (60 FPS) ====================
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - gameState.lastFrameTime;

    // Chỉ update nếu đủ thời gian cho frame tiếp theo
    if (deltaTime < FRAME_TIME) {
        requestAnimationFrame(gameLoop);
        return;
    }

    gameState.lastFrameTime = now - (deltaTime % FRAME_TIME);

    // Update
    spawnObjects();
    
    for (const obj of gameState.gameObjects) {
        obj.update();
    }

    // Xóa object rơi qua mép dưới
    gameState.gameObjects = gameState.gameObjects.filter(
        obj => !obj.isOutOfBounds(gameState.canvas.height)
    );

    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        gameState.particles[i].update();
        if (gameState.particles[i].isDead()) {
            gameState.particles.splice(i, 1);
        }
    }

    // Collision detection
    checkCollisions();

    // Draw
    const ctx = gameState.ctx;
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    drawGameObjects();
    drawParticles();
    drawBladeTrail();
    drawScore();

    requestAnimationFrame(gameLoop);
}

// ==================== START GAME ====================
window.addEventListener('DOMContentLoaded', init);
// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    isDrawing: false,
    lastX: 0,
    lastY: 0
};

// ==================== INITIALIZATION ====================
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    resizeCanvas();
    setupEventListeners();
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
        life: 1 // 0 to 1 (for opacity)
    });
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

// ==================== GAME LOOP ====================
function gameLoop() {
    const ctx = gameState.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // Draw blade trail
    drawBladeTrail();
    
    // Next frame
    requestAnimationFrame(gameLoop);
}

// ==================== START GAME ====================
window.addEventListener('DOMContentLoaded', init);
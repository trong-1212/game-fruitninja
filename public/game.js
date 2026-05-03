// ==================== GAME CONSTANTS ====================
const GRAVITY = 500;
const SPAWN_INTERVAL = 1500;
const FRUIT_SPAWN_CHANCE = 0.85;
const FRUIT_POINTS = 10;
const COMBO_WINDOW = 600; // ms between slices to count as combo
const FRUIT_HITBOX_SCALE = 1.2; // 20% larger hitbox
const BLADE_WIDTH = 40; // thickness of blade collision polygon

const FRUIT_EMOJIS = ['🍊', '🍎', '🍉', '🍌'];
const BOMB_EMOJI = '💣';

// Color palette per fruit (index matches FRUIT_EMOJIS)
const FRUIT_JUICE_COLORS = [
    ['#ff6b35', '#ff9a00', '#ffd700'],  // orange
    ['#ff1744', '#ff4569', '#ff8a80'],  // apple
    ['#00e676', '#ff5252', '#ffeb3b'],  // watermelon
    ['#ffd600', '#ffee58', '#fff176'],  // banana
];

// ==================== SOUND MANAGER ====================
class SoundManager {
    constructor() {
        this.isMuted = false;
        this.lastSwooshTime = 0;
        this.swooshCooldown = 100;
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
    }

    _play(setup) {
        if (this.isMuted || !this.audioContext) return;
        try { setup(this.audioContext); } catch (e) {}
    }

    playSwoosh() {
        const now = Date.now();
        if (now - this.lastSwooshTime < this.swooshCooldown) return;
        this.lastSwooshTime = now;
        this._play(ac => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            const filter = ac.createBiquadFilter();
            osc.connect(filter); filter.connect(gain); gain.connect(ac.destination);
            osc.type = 'triangle';
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(600, ac.currentTime);
            osc.frequency.setValueAtTime(300, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ac.currentTime + 0.12);
            gain.gain.setValueAtTime(0.35, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
            osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.12);
        });
    }

    playSplatter() {
        this._play(ac => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
            osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.15);
        });
    }

    playExplosion() {
        this._play(ac => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.5);
            gain.gain.setValueAtTime(0.4, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.5);
            osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBackgroundMusic();
        }
        return this.isMuted;
    }

    playBackgroundMusic() {
        if (this.isMuted || !this.audioContext) return;
        if (this.bgMusicNodes) return;
        try {
            const ac = this.audioContext;

            // Pad oscillator - soft sustained chord
            this.bgPadOsc = ac.createOscillator();
            this.bgPadGain = ac.createGain();
            this.bgPadFilter = ac.createBiquadFilter();
            this.bgPadOsc.connect(this.bgPadFilter);
            this.bgPadFilter.connect(this.bgPadGain);
            this.bgPadGain.connect(ac.destination);
            this.bgPadOsc.type = 'sine';
            this.bgPadFilter.type = 'lowpass';
            this.bgPadFilter.frequency.setValueAtTime(800, ac.currentTime);
            this.bgPadGain.gain.setValueAtTime(0.04, ac.currentTime);
            this.bgPadOsc.start();

            // Melody oscillator - gentle triangle
            this.bgMelodyOsc = ac.createOscillator();
            this.bgMelodyGain = ac.createGain();
            this.bgMelodyFilter = ac.createBiquadFilter();
            this.bgMelodyOsc.connect(this.bgMelodyFilter);
            this.bgMelodyFilter.connect(this.bgMelodyGain);
            this.bgMelodyGain.connect(ac.destination);
            this.bgMelodyOsc.type = 'triangle';
            this.bgMelodyFilter.type = 'lowpass';
            this.bgMelodyFilter.frequency.setValueAtTime(1200, ac.currentTime);
            this.bgMelodyGain.gain.setValueAtTime(0.035, ac.currentTime);
            this.bgMelodyOsc.start();

            // Sub bass - deep sine
            this.bgSubOsc = ac.createOscillator();
            this.bgSubGain = ac.createGain();
            this.bgSubOsc.connect(this.bgSubGain);
            this.bgSubGain.connect(ac.destination);
            this.bgSubOsc.type = 'sine';
            this.bgSubGain.gain.setValueAtTime(0.03, ac.currentTime);
            this.bgSubOsc.start();

            this.bgMusicNodes = true;
            this.bgMusicNoteTime = ac.currentTime;
            this.bgMusicPhrase = 0;
        } catch (e) {}
    }

    updateBackgroundMusic() {
        if (this.isMuted || !this.bgMusicNodes || !this.audioContext) return;
        const ac = this.audioContext;
        const noteDuration = 0.8;
        const elapsed = ac.currentTime - this.bgMusicNoteTime;
        if (elapsed > noteDuration) {
            // Gentle pentatonic melody in C major pentatonic (soft, airy)
            const melody = [262, 294, 330, 392, 440, 392, 330, 294, 262, 330, 392, 440, 523, 440, 392, 330];
            // Pad harmony (slow moving, every 4 notes)
            const pad = [131, 131, 147, 131, 131, 131, 147, 131, 131, 131, 147, 131, 131, 131, 147, 131];
            // Sub bass (root, changes every 8 notes)
            const sub = [65, 65, 65, 65, 73, 73, 73, 73, 65, 65, 65, 65, 73, 73, 73, 73];

            const i = this.bgMusicPhrase % melody.length;
            this.bgMelodyOsc.frequency.setTargetAtTime(melody[i], ac.currentTime, 0.15);
            this.bgPadOsc.frequency.setTargetAtTime(pad[i], ac.currentTime, 0.3);
            this.bgSubOsc.frequency.setTargetAtTime(sub[i], ac.currentTime, 0.5);
            this.bgMusicPhrase++;
            this.bgMusicNoteTime = ac.currentTime;
        }
    }

    stopBackgroundMusic() {
        try { if (this.bgPadOsc) { this.bgPadOsc.stop(); this.bgPadOsc = null; } } catch (e) {}
        try { if (this.bgMelodyOsc) { this.bgMelodyOsc.stop(); this.bgMelodyOsc = null; } } catch (e) {}
        try { if (this.bgSubOsc) { this.bgSubOsc.stop(); this.bgSubOsc = null; } } catch (e) {}
        this.bgPadGain = null;
        this.bgMelodyGain = null;
        this.bgSubGain = null;
        this.bgPadFilter = null;
        this.bgMelodyFilter = null;
        this.bgMusicNodes = null;
    }
}

const soundManager = new SoundManager();

// ==================== ASSET MANAGER ====================
class AssetManager {
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

// ==================== LEADERBOARD (localStorage) ====================
function getLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem('fruitNinjaLeaderboard')) || [];
    } catch (e) { return []; }
}

function saveToLeaderboard(name, score) {
    const board = getLeaderboard();
    const existing = board.find(e => e.name === name);
    if (existing) {
        if (score > existing.score) existing.score = score;
    } else {
        board.push({ name, score, date: Date.now() });
    }
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem('fruitNinjaLeaderboard', JSON.stringify(board.slice(0, 5)));
}

function getPlayerName() {
    return localStorage.getItem('fruitNinjaPlayerName') || '';
}

function setPlayerName(name) {
    localStorage.setItem('fruitNinjaPlayerName', name);
}

// ==================== GAME STATE ====================
const gameState = {
    canvas: null,
    ctx: null,
    bladeTrail: [],
    gameObjects: [],
    particles: [],
    juiceSplashes: [],
    fruitPieces: [],
    juiceStains: [],
    scorePopups: [],
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lastSpawnTime: 0,
    lastFrameTime: 0,
    score: 0,
    lives: 3,
    isGameOver: false,
    isSoundOn: true,
    // Combo system
    comboCount: 0,
    lastSliceTime: 0,
    // Screen shake
    shakeIntensity: 0,
    shakeDecay: 0.85,
    // Pause system
    isPaused: false,
    showHowToPlay: false,
    showLeaderboard: false,
    // Name entry screen
    showNameEntry: true,
    playerName: getPlayerName(),
    nameInput: getPlayerName(),
    nameCursorBlink: 0,
    // Game started
    gameStarted: false,
    // New record screen
    showNewRecord: false,
    // Button hover states
    hoveredButton: null,
    hoveredButtonTime: 0,
    // Background image
    bgImage: null,
    bgImageLoaded: false,
};

// ==================== JUICE SPLASH PARTICLE ====================
class JuiceSplash {
    constructor(x, y, colors) {
        this.x = x;
        this.y = y;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        const isDroplet = Math.random() > 0.5;
        this.radius = isDroplet ? (2 + Math.random() * 5) : (4 + Math.random() * 8);
        this.isDroplet = isDroplet;

        const angle = Math.random() * Math.PI * 2;
        const speed = isDroplet ? (150 + Math.random() * 350) : (80 + Math.random() * 180);
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed - (isDroplet ? 50 : 0);

        this.alpha = 1;
        this.lifetime = isDroplet ? (0.5 + Math.random() * 0.4) : (0.3 + Math.random() * 0.2);
        this.createdAt = Date.now();
        this.trail = [];
    }

    update(deltaTime) {
        if (this.isDroplet) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 5) this.trail.shift();
        }

        this.velocityY += GRAVITY * 0.5 * deltaTime;
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        const age = (Date.now() - this.createdAt) / 1000;
        this.alpha = Math.max(0, 1 - (age / this.lifetime));
    }

    draw(ctx) {
        if (this.isDroplet && this.trail.length > 1) {
            ctx.save();
            for (let i = 1; i < this.trail.length; i++) {
                const t = i / this.trail.length;
                ctx.globalAlpha = this.alpha * t * 0.5;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.radius * t;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isDroplet ? 6 : 12;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    isDead() { return this.alpha <= 0; }
}

// ==================== JUICE STAIN ====================
class JuiceStain {
    constructor(x, y, colors) {
        this.x = x + (Math.random() - 0.5) * 40;
        this.y = y + (Math.random() - 0.5) * 40;
        this.color = colors[0];
        this.radius = 8 + Math.random() * 20;
        this.alpha = 0.45 + Math.random() * 0.3;
        this.maxAlpha = this.alpha;
        this.lifetime = 4 + Math.random() * 3;
        this.createdAt = Date.now();
        this.scaleX = 0.6 + Math.random() * 0.8;
        this.scaleY = 0.4 + Math.random() * 0.6;
        this.rotation = Math.random() * Math.PI * 2;
        this.blobs = Array.from({ length: 4 + Math.floor(Math.random() * 4) }, () => ({
            dx: (Math.random() - 0.5) * this.radius * 1.2,
            dy: (Math.random() - 0.5) * this.radius * 1.2,
            r: this.radius * (0.3 + Math.random() * 0.5),
        }));
    }

    update() {
        const age = (Date.now() - this.createdAt) / 1000;
        const t = age / this.lifetime;
        this.alpha = t > 0.7 ? this.maxAlpha * (1 - (t - 0.7) / 0.3) : this.maxAlpha;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        for (const blob of this.blobs) {
            ctx.beginPath();
            ctx.arc(blob.dx, blob.dy, blob.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    isDead() {
        const age = (Date.now() - this.createdAt) / 1000;
        return age > this.lifetime;
    }
}

// ==================== SCORE POPUP ====================
class ScorePopup {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1;
        this.velocityY = -120;
        this.lifetime = 0.9;
        this.createdAt = Date.now();
        this.scale = 1.4;
    }

    update(deltaTime) {
        this.velocityY *= 0.92;
        this.y += this.velocityY * deltaTime;
        this.scale = Math.max(1, this.scale - deltaTime * 3);
        const age = (Date.now() - this.createdAt) / 1000;
        this.alpha = Math.max(0, 1 - (age / this.lifetime));
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = `bold ${Math.round(28 * this.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    isDead() { return this.alpha <= 0; }
}

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

    isDead() { return this.alpha <= 0; }
}

// ==================== GAME OBJECT CLASS ====================
class GameObject {
    constructor(x, y, radius, velocityX, velocityY, emoji, type, fruitIndex) {
        this.x = x;
        this.y = y;
        this.radius = radius * FRUIT_HITBOX_SCALE;
        this.visualRadius = radius;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.emoji = emoji;
        this.type = type;
        this.fruitIndex = fruitIndex;
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

// ==================== INITIALIZATION ====================
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    resizeCanvas();
    setupEventListeners();
    gameState.lastSpawnTime = Date.now();
    gameState.lastFrameTime = Date.now();

    // Load background image
    gameState.bgImage = new Image();
    gameState.bgImage.crossOrigin = 'anonymous';
    gameState.bgImage.onload = () => { gameState.bgImageLoaded = true; };
    gameState.bgImage.src = 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1920';

    soundManager.playBackgroundMusic();
    gameLoop();
}

function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
}

// ==================== RESET GAME ====================
function resetGame() {
    // Save score to leaderboard on game over
    if (gameState.isGameOver && gameState.playerName.trim()) {
        saveToLeaderboard(gameState.playerName.trim(), gameState.score);
    }
    gameState.score = 0;
    gameState.lives = 3;
    gameState.isGameOver = false;
    gameState.bladeTrail = [];
    gameState.gameObjects = [];
    gameState.particles = [];
    gameState.juiceSplashes = [];
    gameState.fruitPieces = [];
    gameState.juiceStains = [];
    gameState.scorePopups = [];
    gameState.comboCount = 0;
    gameState.lastSliceTime = 0;
    gameState.shakeIntensity = 0;
    gameState.lastSpawnTime = Date.now();
    gameState.lastFrameTime = Date.now();
    gameState.gameStarted = true;
    gameState._scoreSaved = false;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e) {
    if (gameState.showNameEntry || gameState.isGameOver) return;
    gameState.isDrawing = true;
    gameState.lastX = e.clientX;
    gameState.lastY = e.clientY;
}

function handleMouseMove(e) {
    if (gameState.showNameEntry && gameState.showLeaderboard) {
        // Hover on leaderboard back button
        const cx = gameState.canvas.width / 2;
        const cy = gameState.canvas.height / 2;
        const panelW = Math.min(440, gameState.canvas.width * 0.85);
        const panelH = 420;
        const panelY = cy - panelH / 2;
        const btnW = 200;
        const btnH = 46;
        const btnX = cx - btnW / 2;
        const btnY = panelY + panelH - 65;
        gameState.hoveredButton = null;
        if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
            gameState.hoveredButton = 'back';
        }
        return;
    }
    if (gameState.showNameEntry) {
        updateNameEntryHover(e.clientX, e.clientY);
        return;
    }
    if (gameState.isPaused) {
        updatePauseMenuHover(e.clientX, e.clientY);
        return;
    }
    if (!gameState.isDrawing || gameState.isGameOver) return;
    addBladeTrailPoint(e.clientX, e.clientY);
    const dx = e.clientX - gameState.lastX;
    const dy = e.clientY - gameState.lastY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) soundManager.playSwoosh();
    gameState.lastX = e.clientX;
    gameState.lastY = e.clientY;
}

function handleMouseUp() { gameState.isDrawing = false; }

function handleClick(e) {
    if (gameState.showNameEntry && gameState.showLeaderboard) {
        // Back button on leaderboard from name entry
        const cx = gameState.canvas.width / 2;
        const cy = gameState.canvas.height / 2;
        const panelW = Math.min(440, gameState.canvas.width * 0.85);
        const panelH = 420;
        const panelY = cy - panelH / 2;
        const btnW = 200;
        const btnH = 46;
        const btnX = cx - btnW / 2;
        const btnY = panelY + panelH - 65;
        if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
            gameState.showLeaderboard = false;
        }
        return;
    }
    if (gameState.showNameEntry) {
        handleNameEntryClick(e);
        return;
    }
    if (gameState.isPaused) handlePauseMenuClick(e);
}

function handleKeyDown(e) {
    if (gameState.showNameEntry && gameState.showLeaderboard) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            gameState.showLeaderboard = false;
        }
        return;
    }
    if (gameState.showNameEntry) {
        handleNameEntryKeyDown(e);
        return;
    }
    if (e.key === 'Escape') togglePause();
    if (e.key === 'Enter' && gameState.isGameOver) {
        if (gameState.showNewRecord) {
            gameState.showNewRecord = false;
            gameState._confetti = null;
            gameState.isGameOver = false;
            gameState.gameStarted = false;
            gameState.showNameEntry = true;
            gameState.nameInput = gameState.playerName;
            gameState.gameObjects = [];
            gameState.bladeTrail = [];
            gameState.juiceSplashes = [];
            gameState.fruitPieces = [];
            gameState.juiceStains = [];
            gameState.scorePopups = [];
            gameState.score = 0;
            gameState.lives = 3;
        } else {
            resetGame();
        }
    }
}

// ==================== PAUSE MENU ====================
function togglePause() {
    if (gameState.isGameOver) return;
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        gameState.lastFrameTime = Date.now();
    } else {
        gameState.showHowToPlay = false;
    }
}

function handlePauseMenuClick(e) {
    const cx = gameState.canvas.width / 2;
    const cy = gameState.canvas.height / 2;
    const boxWidth = 380;
    const boxHeight = (gameState.showHowToPlay || gameState.showLeaderboard) ? 480 : 490;
    const boxX = cx - boxWidth / 2;
    const boxY = cy - boxHeight / 2;

    if (gameState.showHowToPlay || gameState.showLeaderboard) {
        const backBtnX = cx - 120;
        const backBtnW = 240;
        const backBtnY = boxY + boxHeight - 70;
        const backBtnH = 50;
        if (e.clientX >= backBtnX && e.clientX <= backBtnX + backBtnW &&
            e.clientY >= backBtnY && e.clientY <= backBtnY + backBtnH) {
            gameState.showHowToPlay = false;
            gameState.showLeaderboard = false;
        }
        return;
    }

    // Resume button at top
    const resumeBtnX = cx - 75;
    const resumeBtnW = 150;
    const resumeBtnY = boxY + 20;
    const resumeBtnH = 45;
    if (e.clientX >= resumeBtnX && e.clientX <= resumeBtnX + resumeBtnW &&
        e.clientY >= resumeBtnY && e.clientY <= resumeBtnY + resumeBtnH) {
        togglePause();
        return;
    }

    const btnStartY = boxY + 90;
    const btnH = 50;
    const btnGap = 65;
    const btnX = boxX + 20;
    const btnW = boxWidth - 40;

    // Sound toggle
    if (e.clientY >= btnStartY && e.clientY <= btnStartY + btnH) {
        if (e.clientX >= btnX && e.clientX <= btnX + btnW) {
            toggleMute();
        }
    }
    // Restart
    else if (e.clientY >= btnStartY + btnGap && e.clientY <= btnStartY + btnGap + btnH) {
        if (e.clientX >= btnX && e.clientX <= btnX + btnW) {
            gameState.isPaused = false;
            resetGame();
        }
    }
    // How to play
    else if (e.clientY >= btnStartY + btnGap * 2 && e.clientY <= btnStartY + btnGap * 2 + btnH) {
        if (e.clientX >= btnX && e.clientX <= btnX + btnW) {
            gameState.showHowToPlay = true;
        }
    }
    // Leaderboard
    else if (e.clientY >= btnStartY + btnGap * 3 && e.clientY <= btnStartY + btnGap * 3 + btnH) {
        if (e.clientX >= btnX && e.clientX <= btnX + btnW) {
            gameState.showLeaderboard = true;
        }
    }
    // Change Name
    else if (e.clientY >= btnStartY + btnGap * 4 && e.clientY <= btnStartY + btnGap * 4 + btnH) {
        if (e.clientX >= btnX && e.clientX <= btnX + btnW) {
            gameState.isPaused = false;
            gameState.gameStarted = false;
            gameState.showNameEntry = true;
            gameState.nameInput = gameState.playerName;
            gameState.gameObjects = [];
            gameState.bladeTrail = [];
            gameState.juiceSplashes = [];
            gameState.fruitPieces = [];
            gameState.juiceStains = [];
            gameState.scorePopups = [];
            gameState.score = 0;
            gameState.lives = 3;
        }
    }
}

function handleTouchStart(e) {
    if (gameState.showNameEntry || gameState.isGameOver || e.touches.length === 0) return;
    gameState.isDrawing = true;
    gameState.lastX = e.touches[0].clientX;
    gameState.lastY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (gameState.showNameEntry || !gameState.isDrawing || gameState.isGameOver || e.touches.length === 0) return;
    const touch = e.touches[0];
    addBladeTrailPoint(touch.clientX, touch.clientY);
    const dx = touch.clientX - gameState.lastX;
    const dy = touch.clientY - gameState.lastY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) soundManager.playSwoosh();
    gameState.lastX = touch.clientX;
    gameState.lastY = touch.clientY;
}

function handleTouchEnd() { gameState.isDrawing = false; }

function toggleMute() {
    soundManager.toggleMute();
    gameState.isSoundOn = !soundManager.isMuted;
    if (!soundManager.isMuted && !soundManager.bgMusicNodes) {
        soundManager.playBackgroundMusic();
    }
}

// ==================== BLADE TRAIL ====================
function addBladeTrailPoint(x, y) {
    gameState.bladeTrail.push({ x, y, timestamp: Date.now(), life: 1 });
}

// ==================== SPAWNER ====================
function spawnObjects() {
    if (gameState.isGameOver) return;
    const now = Date.now();
    if (now - gameState.lastSpawnTime < SPAWN_INTERVAL) return;
    gameState.lastSpawnTime = now;

    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const isFruit = Math.random() < FRUIT_SPAWN_CHANCE;
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
        const centerX = gameState.canvas.width / 2;
        const centerY = gameState.canvas.height / 2;
        const dx = centerX - x;
        const dy = centerY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 300 + Math.random() * 200;
        const velocityX = (dx / dist) * speed;
        const velocityY = (dy / dist) * speed - (200 + Math.random() * 200);

        let emoji, type, fruitIndex;
        if (isFruit) {
            fruitIndex = Math.floor(Math.random() * FRUIT_EMOJIS.length);
            emoji = FRUIT_EMOJIS[fruitIndex];
            type = 'fruit';
        } else {
            fruitIndex = -1;
            emoji = BOMB_EMOJI;
            type = 'bomb';
        }

        gameState.gameObjects.push(new GameObject(x, y, radius, velocityX, velocityY, emoji, type, fruitIndex));
    }
}

// ==================== COLLISION DETECTION ====================
function getBladeSegment() {
    if (gameState.bladeTrail.length < 2) return null;
    return {
        p1: gameState.bladeTrail[gameState.bladeTrail.length - 2],
        p2: gameState.bladeTrail[gameState.bladeTrail.length - 1],
    };
}

function lineCircleIntersection(p1, p2, circle) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - circle.x;
    const fy = p1.y - circle.y;
    const a = dx * dx + dy * dy;
    if (a === 0) {
        const distSq = fx * fx + fy * fy;
        return distSq <= (circle.radius + BLADE_WIDTH / 2) * (circle.radius + BLADE_WIDTH / 2);
    }
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - (circle.radius + BLADE_WIDTH / 2) * (circle.radius + BLADE_WIDTH / 2);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    const sq = Math.sqrt(discriminant);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function checkCollisions() {
    const seg = getBladeSegment();
    if (!seg) return;

    let slicedThisFrame = 0;

    for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
        const obj = gameState.gameObjects[i];
        if (!lineCircleIntersection(seg.p1, seg.p2, obj)) continue;

        if (obj.type === 'fruit') {
            const colors = FRUIT_JUICE_COLORS[obj.fruitIndex] || ['#ff6b35'];
            createJuiceSplash(obj.x, obj.y, colors);
            createJuiceStain(obj.x, obj.y, colors);
            createFruitPieces(obj.x, obj.y, obj.velocityX, obj.velocityY, obj.emoji);
            slicedThisFrame++;

            // Combo tracking
            const now = Date.now();
            if (now - gameState.lastSliceTime < COMBO_WINDOW) {
                gameState.comboCount++;
            } else {
                gameState.comboCount = 1;
            }
            gameState.lastSliceTime = now;

            const points = FRUIT_POINTS * (gameState.comboCount >= 3 ? gameState.comboCount : 1);
            gameState.score += points;

            const popupText = gameState.comboCount >= 2
                ? `x${gameState.comboCount} COMBO! +${points}`
                : `+${points}`;
            gameState.scorePopups.push(new ScorePopup(obj.x, obj.y - 30, popupText, colors[0]));

            if (gameState.comboCount >= 2) triggerScreenShake(gameState.comboCount * 2.5);

            soundManager.playSplatter();
            gameState.gameObjects.splice(i, 1);
        } else if (obj.type === 'bomb') {
            soundManager.playExplosion();
            triggerScreenShake(18);
            createExplosionParticles(obj.x, obj.y);
            gameState.lives = 0;
            gameState.isGameOver = true;
            gameState.gameObjects.splice(i, 1);
        }
    }
}

// ==================== SCREEN SHAKE ====================
function triggerScreenShake(intensity) {
    gameState.shakeIntensity = Math.max(gameState.shakeIntensity, intensity);
}

function applyScreenShake(ctx) {
    if (gameState.shakeIntensity < 0.5) return;
    const sx = (Math.random() - 0.5) * 2 * gameState.shakeIntensity;
    const sy = (Math.random() - 0.5) * 2 * gameState.shakeIntensity;
    ctx.translate(sx, sy);
    gameState.shakeIntensity *= gameState.shakeDecay;
}

// ==================== JUICE SPLASH ====================
function createJuiceSplash(x, y, colors) {
    const count = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
        gameState.juiceSplashes.push(new JuiceSplash(x, y, colors));
    }
}

function createJuiceStain(x, y, colors) {
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        gameState.juiceStains.push(new JuiceStain(x, y, colors));
    }
}

function createExplosionParticles(x, y) {
    const colors = ['#ff5722', '#ff9800', '#ffc107', '#f44336'];
    for (let i = 0; i < 30; i++) {
        gameState.juiceSplashes.push(new JuiceSplash(x, y, colors));
    }
}

// ==================== FRUIT PIECES ====================
function createFruitPieces(x, y, baseVelX, baseVelY, emoji) {
    gameState.fruitPieces.push(new FruitPiece(x - 10, y, baseVelX - 200, baseVelY, emoji, 'left'));
    gameState.fruitPieces.push(new FruitPiece(x + 10, y, baseVelX + 200, baseVelY, emoji, 'right'));
}

// ==================== DRAWING ====================
function drawBackground(ctx) {
    const w = gameState.canvas.width;
    const h = gameState.canvas.height;
    const time = Date.now() / 1000;

    // Background image with dark overlay
    if (gameState.bgImageLoaded && gameState.bgImage) {
        const imgRatio = gameState.bgImage.width / gameState.bgImage.height;
        const canvasRatio = w / h;
        let drawW, drawH, drawX, drawY;
        if (canvasRatio > imgRatio) {
            drawW = w;
            drawH = w / imgRatio;
            drawX = 0;
            drawY = (h - drawH) / 2;
        } else {
            drawH = h;
            drawW = h * imgRatio;
            drawX = (w - drawW) / 2;
            drawY = 0;
        }
        ctx.drawImage(gameState.bgImage, drawX, drawY, drawW, drawH);
        // Dark overlay for readability
        ctx.fillStyle = 'rgba(5, 10, 25, 0.55)';
        ctx.fillRect(0, 0, w, h);
    } else {
        // Fallback gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.3, '#0d1b3e');
        gradient.addColorStop(0.6, '#122a4f');
        gradient.addColorStop(1, '#0a1628');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // Stars
    if (!gameState._stars) {
        gameState._stars = [];
        for (let i = 0; i < 80; i++) {
            gameState._stars.push({
                x: Math.random(), y: Math.random(),
                size: 0.5 + Math.random() * 1.5,
                speed: 0.5 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    for (const star of gameState._stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
        ctx.fillStyle = `rgba(220, 230, 255, ${twinkle * 0.6})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h * 0.5, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Floating soft particles
    ctx.save();
    for (let i = 0; i < 12; i++) {
        const px = (Math.sin(time * 0.15 + i * 1.3) * 0.4 + 0.5) * w;
        const py = (Math.cos(time * 0.1 + i * 0.7) * 0.3 + 0.5) * h;
        const psize = 2 + Math.sin(time * 0.5 + i) * 1.5;
        const alpha = 0.025 + 0.015 * Math.sin(time * 0.3 + i);
        const radGrad = ctx.createRadialGradient(px, py, 0, px, py, psize * 4);
        radGrad.addColorStop(0, `rgba(180, 220, 255, ${alpha})`);
        radGrad.addColorStop(1, 'rgba(180, 220, 255, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(px, py, psize * 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Bottom mist
    const mistGrad = ctx.createLinearGradient(0, h - 100, 0, h);
    mistGrad.addColorStop(0, 'rgba(5, 10, 25, 0)');
    mistGrad.addColorStop(1, 'rgba(5, 10, 25, 0.4)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, h - 100, w, 100);
}

function drawRibbonBlade() {
    const ctx = gameState.ctx;
    const now = Date.now();
    const trailLifetime = 200;

    gameState.bladeTrail = gameState.bladeTrail.filter(pt => {
        const age = now - pt.timestamp;
        if (age > trailLifetime) return false;
        pt.life = 1 - age / trailLifetime;
        return true;
    });

    const pts = gameState.bladeTrail;
    if (pts.length < 2) return;

    // Glow outer layer
    for (let pass = 0; pass < 3; pass++) {
        const glowWidth = [32, 18, 8][pass];
        const glowAlpha = [0.08, 0.18, 0.5][pass];
        const glowColor = ['rgba(200,230,255,', 'rgba(220,240,255,', 'rgba(255,255,255,'][pass];

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const avgLife = (p1.life + p2.life) / 2;

            ctx.strokeStyle = glowColor + (glowAlpha * avgLife) + ')';
            ctx.lineWidth = glowWidth * avgLife;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Ribbon edge lines for depth
    if (pts.length >= 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const avgLife = (p1.life + p2.life) / 2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            const spread = 6 * avgLife;

            // Upper ribbon edge
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, `rgba(100,200,255,${0.7 * p1.life})`);
            grad.addColorStop(1, `rgba(100,200,255,${0.7 * p2.life})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p1.x + Math.cos(angle) * spread, p1.y + Math.sin(angle) * spread);
            ctx.lineTo(p2.x + Math.cos(angle) * spread, p2.y + Math.sin(angle) * spread);
            ctx.stroke();

            // Lower ribbon edge
            ctx.beginPath();
            ctx.moveTo(p1.x - Math.cos(angle) * spread, p1.y - Math.sin(angle) * spread);
            ctx.lineTo(p2.x - Math.cos(angle) * spread, p2.y - Math.sin(angle) * spread);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function drawJuiceStains() {
    for (const stain of gameState.juiceStains) stain.draw(gameState.ctx);
}

function drawJuiceSplashes() {
    for (const splash of gameState.juiceSplashes) splash.draw(gameState.ctx);
}

function drawGameObjects() {
    for (const obj of gameState.gameObjects) obj.draw(gameState.ctx);
}

function drawFruitPieces() {
    for (const piece of gameState.fruitPieces) piece.draw(gameState.ctx);
}

function drawScorePopups() {
    for (const popup of gameState.scorePopups) popup.draw(gameState.ctx);
}

function drawUI() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Draw UI without shake

    // Score
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Score: ' + gameState.score, 20, 50);

    // Lives as hearts
    ctx.textAlign = 'right';
    let heartsStr = '';
    for (let i = 0; i < 3; i++) heartsStr += i < gameState.lives ? '\u2665 ' : '\u2661 ';
    ctx.fillText(heartsStr.trim(), gameState.canvas.width - 20, 50);

    // Combo indicator
    if (gameState.comboCount >= 2) {
        const now = Date.now();
        const timeSince = now - gameState.lastSliceTime;
        if (timeSince < COMBO_WINDOW) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#ffd600';
            ctx.shadowColor = '#ff6b00';
            ctx.shadowBlur = 15;
            ctx.fillText(`COMBO x${gameState.comboCount}`, gameState.canvas.width / 2, 50);
        }
    }

    // Mute
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'right';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(gameState.isSoundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07', gameState.canvas.width - 20, 95);

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGameOver() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = gameState.canvas.width;
    const h = gameState.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Save score to leaderboard (once) and check for new record
    if (!gameState._scoreSaved && gameState.playerName.trim()) {
        const board = getLeaderboard();
        const topScore = board.length > 0 ? board[0].score : 0;
        if (gameState.score > topScore && gameState.score > 0) {
            gameState.showNewRecord = true;
        }
        saveToLeaderboard(gameState.playerName.trim(), gameState.score);
        gameState._scoreSaved = true;
    }

    // If new record, show congratulations screen instead
    if (gameState.showNewRecord) {
        drawNewRecord();
        ctx.restore();
        return;
    }

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    // Banner dimensions
    const bannerW = Math.min(500, w * 0.85);
    const bannerH = 260;
    const bannerX = cx - bannerW / 2;
    const bannerY = cy - bannerH / 2;

    // Banner shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(bannerX + 4, bannerY + 6, bannerW, bannerH, 24);
    ctx.fill();

    // Banner background gradient
    const bannerGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
    bannerGrad.addColorStop(0, 'rgba(30, 10, 10, 0.97)');
    bannerGrad.addColorStop(1, 'rgba(50, 15, 15, 0.97)');
    ctx.fillStyle = bannerGrad;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
    ctx.fill();

    // Banner border glow
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
    ctx.stroke();

    // Inner accent line
    const accentGrad = ctx.createLinearGradient(bannerX + 40, 0, bannerX + bannerW - 40, 0);
    accentGrad.addColorStop(0, 'rgba(255, 60, 60, 0)');
    accentGrad.addColorStop(0.5, 'rgba(255, 60, 60, 0.6)');
    accentGrad.addColorStop(1, 'rgba(255, 60, 60, 0)');
    ctx.strokeStyle = accentGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bannerX + 40, bannerY + 55);
    ctx.lineTo(bannerX + bannerW - 40, bannerY + 55);
    ctx.stroke();

    // "GAME OVER" title
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ff3c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff3c3c';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', cx, bannerY + 35);

    // Score
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Score: ' + gameState.score, cx, bannerY + 100);

    // "Press Enter to Restart" with pulsing animation
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.shadowColor = `rgba(255, 215, 0, ${pulse * 0.5})`;
    ctx.shadowBlur = 12;
    ctx.fillText('Press Enter to Restart', cx, bannerY + 170);

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ==================== NEW RECORD SCREEN ====================
function drawNewRecord() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = gameState.canvas.width;
    const h = gameState.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const time = Date.now() / 1000;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Confetti particles
    if (!gameState._confetti) {
        gameState._confetti = [];
        const confettiColors = ['#ffd600', '#ff1744', '#00e676', '#2979ff', '#ff9100', '#e040fb'];
        for (let i = 0; i < 60; i++) {
            gameState._confetti.push({
                x: Math.random() * w,
                y: -20 - Math.random() * h * 0.5,
                vx: (Math.random() - 0.5) * 100,
                vy: 80 + Math.random() * 200,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 8,
                w: 6 + Math.random() * 8,
                h: 4 + Math.random() * 6,
                color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                alpha: 0.8 + Math.random() * 0.2,
            });
        }
    }

    // Update and draw confetti
    for (const c of gameState._confetti) {
        c.x += c.vx * 0.016;
        c.y += c.vy * 0.016;
        c.rotation += c.rotSpeed * 0.016;
        if (c.y > h + 20) {
            c.y = -20;
            c.x = Math.random() * w;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.globalAlpha = c.alpha;
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Banner dimensions
    const bannerW = Math.min(520, w * 0.85);
    const bannerH = 320;
    const bannerX = cx - bannerW / 2;
    const bannerY = cy - bannerH / 2;

    // Banner shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(bannerX + 4, bannerY + 6, bannerW, bannerH, 24);
    ctx.fill();

    // Banner background gradient - gold theme
    const bannerGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
    bannerGrad.addColorStop(0, 'rgba(30, 25, 5, 0.97)');
    bannerGrad.addColorStop(0.5, 'rgba(40, 30, 5, 0.97)');
    bannerGrad.addColorStop(1, 'rgba(25, 20, 5, 0.97)');
    ctx.fillStyle = bannerGrad;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
    ctx.fill();

    // Animated gold border glow
    const glowPulse = 0.4 + 0.3 * Math.sin(time * 3);
    ctx.strokeStyle = `rgba(255, 215, 0, ${glowPulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
    ctx.stroke();

    // Inner accent line
    const accentGrad = ctx.createLinearGradient(bannerX + 40, 0, bannerX + bannerW - 40, 0);
    accentGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
    accentGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.7)');
    accentGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.strokeStyle = accentGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bannerX + 40, bannerY + 70);
    ctx.lineTo(bannerX + bannerW - 40, bannerY + 70);
    ctx.stroke();

    // Trophy emoji
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83C\uDFC6', cx, bannerY + 40);

    // "NEW RECORD!" title with glow
    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = '#ffd600';
    ctx.shadowColor = '#ffd600';
    ctx.shadowBlur = 25;
    ctx.fillText('NEW RECORD!', cx, bannerY + 100);
    ctx.shadowBlur = 0;

    // Player name
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(gameState.playerName, cx, bannerY + 145);

    // Score with emphasis
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffd600';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.fillText(gameState.score.toString(), cx, bannerY + 195);
    ctx.shadowBlur = 0;

    // "Press Enter for Menu" with pulsing animation
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.shadowColor = `rgba(255, 215, 0, ${pulse * 0.4})`;
    ctx.shadowBlur = 10;
    ctx.fillText('Press Enter for Menu', cx, bannerY + 260);

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawPauseMenu() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    const cx = gameState.canvas.width / 2;
    const cy = gameState.canvas.height / 2;
    const boxWidth = 400;
    const boxHeight = (gameState.showHowToPlay || gameState.showLeaderboard) ? 480 : 490;
    const boxX = cx - boxWidth / 2;
    const boxY = cy - boxHeight / 2;

    // Gradient background
    const gradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
    gradient.addColorStop(0, 'rgba(52, 73, 94, 0.98)');
    gradient.addColorStop(1, 'rgba(44, 62, 80, 0.98)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border glow
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (gameState.showHowToPlay) {
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffd600';
        ctx.fillText('How to Play', cx, boxY + 25);

        ctx.font = '15px Arial';
        ctx.fillStyle = '#ecf0f1';
        ctx.textBaseline = 'top';
        const instructions = [
            'Drag your mouse or touch to slice fruits',
            '',
            'Green fruits: +10 points',
            'Combo 2+ slices: Score multiplies',
            '',
            'Avoid bombs! Hit = Game Over',
            'Miss 3 fruits = Game Over',
            '',
            'Press ESC to Pause/Resume'
        ];
        let y = boxY + 75;
        for (const line of instructions) {
            ctx.fillText(line, cx, y);
            y += 22;
        }

        // Back button
        const backBtnX = cx - 120;
        const backBtnY = boxY + boxHeight - 70;
        const backBtnW = 240;
        const backBtnH = 50;
        drawMenuButton(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 'Back', '#666666', gameState.hoveredButton === 'back');
    } else if (gameState.showLeaderboard) {
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffd600';
        ctx.fillText('LEADERBOARD', cx, boxY + 25);

        const board = getLeaderboard();
        const medals = ['#ffd600', '#c0c0c0', '#cd7f32'];
        const startY = boxY + 70;

        if (board.length === 0) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#90a4ae';
            ctx.fillText('No scores yet.', cx, startY + 30);
        } else {
            for (let i = 0; i < Math.min(5, board.length); i++) {
                const rowY = startY + i * 38;
                const entry = board[i];
                const medalColor = i < 3 ? medals[i] : '#78909c';

                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = medalColor;
                ctx.textAlign = 'left';
                ctx.fillText(`${i + 1}.`, boxX + 30, rowY);

                ctx.font = '16px Arial';
                ctx.fillStyle = '#ecf0f1';
                ctx.fillText(entry.name, boxX + 65, rowY);

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#ffd600';
                ctx.textAlign = 'right';
                ctx.fillText(entry.score.toString(), boxX + boxWidth - 30, rowY);
                ctx.textAlign = 'center';
            }
        }

        // Back button
        const backBtnX = cx - 120;
        const backBtnY = boxY + boxHeight - 70;
        const backBtnW = 240;
        const backBtnH = 50;
        drawMenuButton(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 'Back', '#666666', gameState.hoveredButton === 'back');
    } else {
        ctx.font = 'bold 44px Arial';
        ctx.fillStyle = '#ffd600';
        ctx.fillText('PAUSED', cx, boxY + 20);

        const btnStartY = boxY + 90;
        const btnH = 50;
        const btnGap = 65;
        const btnX = boxX + 20;
        const btnW = boxWidth - 40;

        // Sound button
        drawMenuButton(ctx, btnX, btnStartY, btnW, btnH,
            gameState.isSoundOn ? 'Sound: ON' : 'Sound: OFF',
            '#00e676', gameState.hoveredButton === 'sound');

        // Restart button
        drawMenuButton(ctx, btnX, btnStartY + btnGap, btnW, btnH,
            'Restart Game', '#ff9800', gameState.hoveredButton === 'restart');

        // How to play button
        drawMenuButton(ctx, btnX, btnStartY + btnGap * 2, btnW, btnH,
            'How to Play', '#2196F3', gameState.hoveredButton === 'howto');

        // Leaderboard button
        drawMenuButton(ctx, btnX, btnStartY + btnGap * 3, btnW, btnH,
            'Leaderboard', '#9c27b0', gameState.hoveredButton === 'leaderboard');

        // Back to Name Entry button
        drawMenuButton(ctx, btnX, btnStartY + btnGap * 4, btnW, btnH,
            'Change Name', '#607d8b', gameState.hoveredButton === 'changename');

        // Resume button (top)
        const resumeBtnX = cx - 75;
        const resumeBtnW = 150;
        const resumeBtnY = boxY + 20;
        const resumeBtnH = 45;
        drawMenuButton(ctx, resumeBtnX, resumeBtnY, resumeBtnW, resumeBtnH,
            'Resume', '#ff1744', gameState.hoveredButton === 'resume');

        ctx.font = '14px Arial';
        ctx.fillStyle = '#bdbdbd';
        ctx.textBaseline = 'top';
        ctx.fillText('Press ESC to Resume', cx, boxY + boxHeight - 25);
    }

    ctx.restore();
}

function drawMenuButton(ctx, x, y, w, h, text, baseColor, isHovered) {
    const scale = isHovered ? 1.08 : 1;
    const scaledW = w * scale;
    const scaledH = h * scale;
    const scaledX = x + (w - scaledW) / 2;
    const scaledY = y + (h - scaledH) / 2;

    // Shadow
    ctx.fillStyle = isHovered ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(scaledX + 2, scaledY + 2, scaledW, scaledH, 10);
    ctx.fill();

    // Button
    ctx.fillStyle = isHovered ? adjustBrightness(baseColor, 20) : baseColor;
    ctx.beginPath();
    ctx.roundRect(scaledX, scaledY, scaledW, scaledH, 10);
    ctx.fill();

    // Border glow on hover
    if (isHovered) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(scaledX, scaledY, scaledW, scaledH, 10);
        ctx.stroke();
    }

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, scaledX + scaledW / 2, scaledY + scaledH / 2);
}

function adjustBrightness(color, percent) {
    let rgb = parseInt(color.slice(1), 16);
    let r = (rgb >> 16) & 255;
    let g = (rgb >> 8) & 255;
    let b = rgb & 255;
    r = Math.min(255, r + percent);
    g = Math.min(255, g + percent);
    b = Math.min(255, b + percent);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function updatePauseMenuHover(mx, my) {
    const cx = gameState.canvas.width / 2;
    const cy = gameState.canvas.height / 2;
    const boxWidth = 400;
    const boxHeight = (gameState.showHowToPlay || gameState.showLeaderboard) ? 480 : 490;
    const boxX = cx - boxWidth / 2;
    const boxY = cy - boxHeight / 2;

    gameState.hoveredButton = null;

    if (gameState.showHowToPlay || gameState.showLeaderboard) {
        const backBtnX = cx - 120;
        const backBtnY = boxY + boxHeight - 70;
        const backBtnW = 240;
        const backBtnH = 50;
        if (mx >= backBtnX && mx <= backBtnX + backBtnW && my >= backBtnY && my <= backBtnY + backBtnH) {
            gameState.hoveredButton = 'back';
        }
    } else {
        const resumeBtnX = cx - 75;
        const resumeBtnY = boxY + 20;
        const resumeBtnW = 150;
        const resumeBtnH = 45;
        if (mx >= resumeBtnX && mx <= resumeBtnX + resumeBtnW && my >= resumeBtnY && my <= resumeBtnY + resumeBtnH) {
            gameState.hoveredButton = 'resume';
        }

        const btnStartY = boxY + 90;
        const btnH = 50;
        const btnGap = 65;
        const btnX = boxX + 20;
        const btnW = boxWidth - 40;

        if (my >= btnStartY && my <= btnStartY + btnH && mx >= btnX && mx <= btnX + btnW) {
            gameState.hoveredButton = 'sound';
        } else if (my >= btnStartY + btnGap && my <= btnStartY + btnGap + btnH && mx >= btnX && mx <= btnX + btnW) {
            gameState.hoveredButton = 'restart';
        } else if (my >= btnStartY + btnGap * 2 && my <= btnStartY + btnGap * 2 + btnH && mx >= btnX && mx <= btnX + btnW) {
            gameState.hoveredButton = 'howto';
        } else if (my >= btnStartY + btnGap * 3 && my <= btnStartY + btnGap * 3 + btnH && mx >= btnX && mx <= btnX + btnW) {
            gameState.hoveredButton = 'leaderboard';
        } else if (my >= btnStartY + btnGap * 4 && my <= btnStartY + btnGap * 4 + btnH && mx >= btnX && mx <= btnX + btnW) {
            gameState.hoveredButton = 'changename';
        }
    }
}

// ==================== NAME ENTRY SCREEN ====================
function drawNameEntry() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = gameState.canvas.width;
    const h = gameState.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Panel
    const panelW = Math.min(440, w * 0.85);
    const panelH = 320;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(panelX + 4, panelY + 6, panelW, panelH, 24);
    ctx.fill();

    // Background
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, 'rgba(15, 25, 50, 0.97)');
    grad.addColorStop(1, 'rgba(10, 18, 40, 0.97)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 24);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 24);
    ctx.stroke();

    // Title
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffd600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd600';
    ctx.shadowBlur = 15;
    ctx.fillText('FRUIT NINJA', cx, panelY + 45);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '18px Arial';
    ctx.fillStyle = '#90caf9';
    ctx.fillText('Enter your name to start', cx, panelY + 85);

    // Input field
    const inputW = panelW - 80;
    const inputH = 50;
    const inputX = cx - inputW / 2;
    const inputY = panelY + 115;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(inputX, inputY, inputW, inputH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(inputX, inputY, inputW, inputH, 12);
    ctx.stroke();

    // Name text with cursor
    gameState.nameCursorBlink = (gameState.nameCursorBlink + 1) % 60;
    const showCursor = gameState.nameCursorBlink < 35;
    const displayName = gameState.nameInput + (showCursor ? '|' : '');
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName || (showCursor ? '|' : ''), cx, inputY + inputH / 2);

    // Placeholder
    if (!gameState.nameInput) {
        ctx.font = '18px Arial';
        ctx.fillStyle = 'rgba(189, 189, 189, 0.4)';
        if (!showCursor) ctx.fillText('Type your name...', cx, inputY + inputH / 2);
    }

    // Start button
    const btnW = 240;
    const btnH = 50;
    const btnX = cx - btnW / 2;
    const btnY = panelY + 195;
    const canStart = gameState.nameInput.trim().length > 0;
    drawMenuButton(ctx, btnX, btnY, btnW, btnH, 'Start Game',
        canStart ? '#00c853' : '#555555',
        gameState.hoveredButton === 'start' && canStart);

    // Leaderboard button
    const lbBtnW = 240;
    const lbBtnH = 44;
    const lbBtnX = cx - lbBtnW / 2;
    const lbBtnY = panelY + 260;
    drawMenuButton(ctx, lbBtnX, lbBtnY, lbBtnW, lbBtnH, 'Leaderboard',
        '#2196F3', gameState.hoveredButton === 'leaderboard');

    ctx.restore();
}

function handleNameEntryKeyDown(e) {
    if (e.key === 'Enter' && gameState.nameInput.trim().length > 0) {
        startGameWithName();
    } else if (e.key === 'Backspace') {
        gameState.nameInput = gameState.nameInput.slice(0, -1);
    } else if (e.key.length === 1 && gameState.nameInput.length < 15) {
        gameState.nameInput += e.key;
    }
}

function handleNameEntryClick(e) {
    const cx = gameState.canvas.width / 2;
    const cy = gameState.canvas.height / 2;
    const panelW = Math.min(440, gameState.canvas.width * 0.85);
    const panelH = 320;
    const panelY = cy - panelH / 2;

    const btnW = 240;
    const btnH = 50;
    const btnX = cx - btnW / 2;
    const btnY = panelY + 195;

    if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
        if (gameState.nameInput.trim().length > 0) startGameWithName();
    }

    const lbBtnW = 240;
    const lbBtnH = 44;
    const lbBtnX = cx - lbBtnW / 2;
    const lbBtnY = panelY + 260;
    if (e.clientX >= lbBtnX && e.clientX <= lbBtnX + lbBtnW && e.clientY >= lbBtnY && e.clientY <= lbBtnY + lbBtnH) {
        gameState.showLeaderboard = true;
    }
}

function updateNameEntryHover(mx, my) {
    const cx = gameState.canvas.width / 2;
    const cy = gameState.canvas.height / 2;
    const panelW = Math.min(440, gameState.canvas.width * 0.85);
    const panelH = 320;
    const panelY = cy - panelH / 2;

    gameState.hoveredButton = null;

    const btnW = 240;
    const btnH = 50;
    const btnX = cx - btnW / 2;
    const btnY = panelY + 195;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        gameState.hoveredButton = 'start';
    }

    const lbBtnW = 240;
    const lbBtnH = 44;
    const lbBtnX = cx - lbBtnW / 2;
    const lbBtnY = panelY + 260;
    if (mx >= lbBtnX && mx <= lbBtnX + lbBtnW && my >= lbBtnY && my <= lbBtnY + lbBtnH) {
        gameState.hoveredButton = 'leaderboard';
    }
}

function startGameWithName() {
    gameState.playerName = gameState.nameInput.trim();
    setPlayerName(gameState.playerName);
    gameState.showNameEntry = false;
    gameState.gameStarted = true;
    gameState.lastSpawnTime = Date.now();
    gameState.lastFrameTime = Date.now();
}

// ==================== LEADERBOARD SCREEN ====================
function drawLeaderboard() {
    const ctx = gameState.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = gameState.canvas.width;
    const h = gameState.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const panelW = Math.min(440, w * 0.85);
    const panelH = 420;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(panelX + 4, panelY + 6, panelW, panelH, 24);
    ctx.fill();

    // Background
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, 'rgba(15, 25, 50, 0.97)');
    grad.addColorStop(1, 'rgba(10, 18, 40, 0.97)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 24);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 24);
    ctx.stroke();

    // Title
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffd600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd600';
    ctx.shadowBlur = 10;
    ctx.fillText('LEADERBOARD', cx, panelY + 40);
    ctx.shadowBlur = 0;

    // Entries
    const board = getLeaderboard();
    const medals = ['#ffd600', '#c0c0c0', '#cd7f32'];
    const startY = panelY + 85;

    if (board.length === 0) {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#90a4ae';
        ctx.fillText('No scores yet. Play to set a record!', cx, startY + 40);
    } else {
        // Header
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#78909c';
        ctx.textAlign = 'left';
        ctx.fillText('#', panelX + 30, startY);
        ctx.fillText('Player', panelX + 60, startY);
        ctx.textAlign = 'right';
        ctx.fillText('Score', panelX + panelW - 30, startY);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 25, startY + 12);
        ctx.lineTo(panelX + panelW - 25, startY + 12);
        ctx.stroke();

        for (let i = 0; i < 5; i++) {
            const rowY = startY + 35 + i * 42;
            if (i < board.length) {
                const entry = board[i];
                const medalColor = i < 3 ? medals[i] : '#78909c';

                // Row highlight for top 3
                if (i < 3) {
                    ctx.fillStyle = `rgba(255, 215, 0, ${0.04 - i * 0.01})`;
                    ctx.beginPath();
                    ctx.roundRect(panelX + 20, rowY - 14, panelW - 40, 36, 8);
                    ctx.fill();
                }

                // Rank
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = medalColor;
                ctx.textAlign = 'left';
                ctx.fillText(`${i + 1}`, panelX + 35, rowY);

                // Name
                ctx.font = '18px Arial';
                ctx.fillStyle = '#ecf0f1';
                ctx.fillText(entry.name, panelX + 65, rowY);

                // Score
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#ffd600';
                ctx.textAlign = 'right';
                ctx.fillText(entry.score.toString(), panelX + panelW - 35, rowY);
            } else {
                // Empty slot
                ctx.font = '16px Arial';
                ctx.fillStyle = 'rgba(120, 144, 156, 0.3)';
                ctx.textAlign = 'left';
                ctx.fillText(`${i + 1}`, panelX + 35, rowY);
                ctx.fillText('---', panelX + 65, rowY);
            }
        }
    }

    // Back button
    const btnW = 200;
    const btnH = 46;
    const btnX = cx - btnW / 2;
    const btnY = panelY + panelH - 65;
    drawMenuButton(ctx, btnX, btnY, btnW, btnH, 'Back', '#666666', gameState.hoveredButton === 'back');

    ctx.restore();
}

// ==================== GAME LOOP ====================
function gameLoop() {
    const now = Date.now();
    const deltaTime = Math.min((now - gameState.lastFrameTime) / 1000, 0.05);
    gameState.lastFrameTime = now;

    soundManager.updateBackgroundMusic();

    if (!gameState.isPaused && !gameState.isGameOver && gameState.gameStarted && !gameState.showNameEntry) {
        spawnObjects();

        for (const obj of gameState.gameObjects) obj.update(deltaTime);

        for (let i = gameState.gameObjects.length - 1; i >= 0; i--) {
            const obj = gameState.gameObjects[i];
            if (obj.isOutOfBounds(gameState.canvas.width, gameState.canvas.height) && !obj.wasMissed) {
                obj.wasMissed = true;
                if (obj.type === 'fruit') {
                    gameState.lives--;
                    if (gameState.lives <= 0) gameState.isGameOver = true;
                }
                gameState.gameObjects.splice(i, 1);
            }
        }

        for (let i = gameState.fruitPieces.length - 1; i >= 0; i--) {
            gameState.fruitPieces[i].update(deltaTime);
            if (gameState.fruitPieces[i].isDead()) gameState.fruitPieces.splice(i, 1);
        }

        for (let i = gameState.juiceSplashes.length - 1; i >= 0; i--) {
            gameState.juiceSplashes[i].update(deltaTime);
            if (gameState.juiceSplashes[i].isDead()) gameState.juiceSplashes.splice(i, 1);
        }

        for (let i = gameState.juiceStains.length - 1; i >= 0; i--) {
            gameState.juiceStains[i].update();
            if (gameState.juiceStains[i].isDead()) gameState.juiceStains.splice(i, 1);
        }

        for (let i = gameState.scorePopups.length - 1; i >= 0; i--) {
            gameState.scorePopups[i].update(deltaTime);
            if (gameState.scorePopups[i].isDead()) gameState.scorePopups.splice(i, 1);
        }

        checkCollisions();
    }

    const ctx = gameState.ctx;
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    drawBackground(ctx);

    if (gameState.showNameEntry) {
        drawNameEntry();
    } else if (gameState.showLeaderboard && !gameState.isPaused) {
        drawLeaderboard();
    } else if (!gameState.isGameOver) {
        ctx.save();
        applyScreenShake(ctx);
        drawJuiceStains();
        drawGameObjects();
        drawFruitPieces();
        drawJuiceSplashes();
        drawRibbonBlade();
        ctx.restore();
        drawScorePopups();
        drawUI();

        if (gameState.isPaused) {
            drawPauseMenu();
        }
    } else {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

function tryInit() {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        init();
    } else {
        // Canvas not yet mounted (React), wait for it
        const observer = new MutationObserver(() => {
            if (document.getElementById('gameCanvas')) {
                observer.disconnect();
                init();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', tryInit);
} else {
    tryInit();
}

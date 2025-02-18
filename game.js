const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stats = document.getElementById('stats');
const crosshair = document.getElementById('crosshair');

// Responsive canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game constants
const map = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
];

const tileSize = 64;
const textures = {
    wall: createWallTexture()
};

// Player state
const player = {
    x: 96,
    y: 96,
    angle: 0,
    fov: Math.PI / 3,
    speed: 3,
    turnSpeed: 0.05,
    velocity: { x: 0, y: 0 },
    friction: 0.8,
    health: 100,
    ammo: 50,
    score: 0,
    isShooting: false,
    shootTime: 0
};

// Input state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false
};

// Enemy state
const enemies = [
    { x: 300, y: 300, health: 100, speed: 1.5 },
    { x: 500, y: 200, health: 100, speed: 1.5 },
    { x: 400, y: 400, health: 100, speed: 1.5 }
];

function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 16) {
        for (let x = 0; x < 64; x += 32) {
            ctx.fillStyle = '#722d09';
            ctx.fillRect(x + (y % 32 ? 16 : 0), y, 28, 14);
        }
    }

    return canvas;
}

function checkCollision(x, y) {
    const mapX = Math.floor(x / tileSize);
    const mapY = Math.floor(y / tileSize);
    return map[mapY] && map[mapY][mapX] === 1;
}

function movePlayer() {
    if (keys.w) {
        player.velocity.x += Math.cos(player.angle) * player.speed * 0.1;
        player.velocity.y += Math.sin(player.angle) * player.speed * 0.1;
    }
    if (keys.s) {
        player.velocity.x -= Math.cos(player.angle) * player.speed * 0.1;
        player.velocity.y -= Math.sin(player.angle) * player.speed * 0.1;
    }
    if (keys.a) player.angle -= player.turnSpeed;
    if (keys.d) player.angle += player.turnSpeed;

    player.velocity.x *= player.friction;
    player.velocity.y *= player.friction;

    const newX = player.x + player.velocity.x;
    const newY = player.y + player.velocity.y;

    if (!checkCollision(newX, player.y)) player.x = newX;
    if (!checkCollision(player.x, newY)) player.y = newY;
}

function moveEnemies() {
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            } else {
                player.health -= 0.1;
            }
        }
    });
}

function shoot() {
    if (player.ammo <= 0) return;
    player.ammo--;
    player.isShooting = true;
    player.shootTime = performance.now();

    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleToEnemy = Math.atan2(dy, dx);

            if (distance < 200 && Math.abs(angleToEnemy - player.angle) < 0.2) {
                enemy.health -= 25;
                if (enemy.health <= 0) {
                    player.score += 100;
                }
            }
        }
    });
}

function render3D() {
    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    const rayCount = Math.floor(screenWidth / 2);
    const rayWidth = screenWidth / rayCount;
    const rayAngleIncrement = player.fov / rayCount;

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
    ctx.fillStyle = '#3A5F0B';
    ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

    for (let i = 0; i < rayCount; i++) {
        const rayAngle = player.angle - player.fov / 2 + i * rayAngleIncrement;
        const sin = Math.sin(rayAngle);
        const cos = Math.cos(rayAngle);

        let distanceToWall = 0;
        let hitWall = false;
        let textureX = 0;

        while (!hitWall && distanceToWall < 20) {
            distanceToWall += 0.1;

            const testX = player.x + cos * distanceToWall * tileSize;
            const testY = player.y + sin * distanceToWall * tileSize;

            const mapX = Math.floor(testX / tileSize);
            const mapY = Math.floor(testY / tileSize);

            if (map[mapY] && map[mapY][mapX] === 1) {
                hitWall = true;
                const blockX = testX % tileSize;
                const blockY = testY % tileSize;
                textureX = (Math.abs(sin) > Math.abs(cos)) ? blockX : blockY;
            }
        }

        const fisheyeCorrection = Math.cos(rayAngle - player.angle);
        const wallDistance = distanceToWall * fisheyeCorrection;
        const wallHeight = (screenHeight / wallDistance) / 2;

        const wallTop = Math.max(0, (screenHeight / 2) - wallHeight);
        const wallBottom = Math.min(screenHeight, (screenHeight / 2) + wallHeight);

        ctx.drawImage(
            textures.wall,
            textureX,
            0,
            1,
            64,
            i * rayWidth,
            wallTop,
            rayWidth + 1,
            wallBottom - wallTop
        );

        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, wallDistance / 15)}`;
        ctx.fillRect(i * rayWidth, wallTop, rayWidth + 1, wallBottom - wallTop);
    }
}

function renderEnemies() {
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleToEnemy = Math.atan2(dy, dx);

            if (distance < 500 && Math.abs(angleToEnemy - player.angle) < player.fov / 2) {
                const screenX = (angleToEnemy - player.angle + player.fov / 2) * (canvas.width / player.fov);
                const size = (500 / distance) * 50;
                ctx.fillStyle = 'red';
                ctx.fillRect(screenX - size / 2, canvas.height / 2 - size / 2, size, size);
            }
        }
    });
}

function renderWeapon() {
    if (player.isShooting) {
        const timeSinceShoot = performance.now() - player.shootTime;
        if (timeSinceShoot < 100) {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(canvas.width / 2 - 25, canvas.height - 150, 50, 100);
        } else {
            player.isShooting = false;
        }
    } else {
        ctx.fillStyle = 'gray';
        ctx.fillRect(canvas.width / 2 - 25, canvas.height - 150, 50, 100);
    }
}

let lastTime = performance.now();
let fps = 0;

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    fps = Math.round(1000 / deltaTime);
    lastTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePlayer();
    moveEnemies();
    render3D();
    renderEnemies();
    renderWeapon();

    stats.textContent = `FPS: ${fps} | Pos: (${Math.round(player.x)}, ${Math.round(player.y)}) | Ang: ${Math.round(player.angle * 180 / Math.PI)}° | Salud: ${Math.round(player.health)} | Munición: ${player.ammo} | Puntuación: ${player.score}`;

    requestAnimationFrame(gameLoop);
}

// Controls setup
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        player.angle += e.movementX * 0.002;
    }
});

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
    shoot();
});

// Mobile controls
const touchControls = {
    setupMobileControls() {
        const upBtn = document.getElementById('upBtn');
        const downBtn = document.getElementById('downBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const shootBtn = document.getElementById('shootBtn');

        const handleTouch = (button, key, active) => {
            button.addEventListener(active ? 'touchstart' : 'touchend', (e) => {
                e.preventDefault();
                keys[key] = active;
            });
        };

        handleTouch(upBtn, 'w', true);
        handleTouch(upBtn, 'w', false);
        handleTouch(downBtn, 's', true);
        handleTouch(downBtn, 's', false);
        handleTouch(leftBtn, 'a', true);
        handleTouch(leftBtn, 'a', false);
        handleTouch(rightBtn, 'd', true);
        handleTouch(rightBtn, 'd', false);

        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            shoot();
        });

        // Gyroscope controls for mobile
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.gamma) {
                    player.angle += (e.gamma * Math.PI / 180) * 0.05;
                }
            });
        }
    },

    // Handle mobile touch movement
    handleTouchMove(e) {
        const touch = e.touches[0];
        const centerX = window.innerWidth / 2;
        player.angle += (touch.clientX - centerX) * 0.002;
    }
};

// Initialize mobile controls
touchControls.setupMobileControls();

// Add touch move handler for looking around
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    touchControls.handleTouchMove(e);
}, { passive: false });

// Performance optimizations
const optimizations = {
    lastRenderTime: 0,
    targetFPS: 60,
    frameInterval: 1000 / 60,

    shouldRender(currentTime) {
        const deltaTime = currentTime - this.lastRenderTime;
        if (deltaTime >= this.frameInterval) {
            this.lastRenderTime = currentTime;
            return true;
        }
        return false;
    }
};

// Start the game
function init() {
    // Set initial device-specific settings
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Mobile settings
        player.speed = 2; // Reduce speed for better mobile control
        player.turnSpeed = 0.03;
    }

    // Start the game loop with performance optimization
    function optimizedGameLoop(currentTime) {
        if (optimizations.shouldRender(currentTime)) {
            gameLoop(currentTime);
        }
        requestAnimationFrame(optimizedGameLoop);
    }

    optimizedGameLoop(performance.now());
}

// Initialize the game when everything is loaded
window.addEventListener('load', init);

// Handle visibility change to pause/resume game
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause game logic here
        Object.keys(keys).forEach(key => keys[key] = false);
    }
});

// Handle window resize efficiently
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
    }, 250);
});
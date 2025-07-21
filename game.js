// Game state
const game = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    running: false,
    startTime: Date.now(),
    maxTime: 300000, // 5 minutes
    player: {
        x: 400,
        y: 300,
        angle: 0,
        health: 100,
        maxHealth: 100,
        speed: 4,
        rotSpeed: 0.06,
        lastShot: 0,
        shootCooldown: 150,
        fireRate: 150,
        damage: 30,
        isShooting: false,
        autoShootInterval: null,
        explosiveShots: false,
        doubleShot: false
    },
    keys: {},
    mouse: { x: 0, y: 0, locked: false, isDown: false },
    enemies: [],
    bullets: [],
    walls: [],
    powerups: [],
    score: 0,
    enemiesKilled: 0,
    lastEnemySpawn: 0,
    enemySpawnRate: 4000,
    waveNumber: 1,
    lastTime: 0
};

// Powerup types
const POWERUP_TYPES = {
    HEALTH: {
        type: 'health',
        color: '#00ff00',
        effect: 'Botiquín',
        apply: (player) => {
            player.health = Math.min(player.maxHealth, player.health + 50);
            playPowerupSound();
            return '¡BOTIQUÍN OBTENIDO!';
        }
    },
    DAMAGE: {
        type: 'damage',
        color: '#ff8800',
        effect: 'Berserk (10s)',
        apply: (player) => {
            player.damage += 20;
            setTimeout(() => player.damage -= 20, 10000);
            playPowerupSound();
            return '¡BERSERK ACTIVADO!';
        }
    },
    SPEED: {
        type: 'speed',
        color: '#00ffff',
        effect: 'Traje Radiactivo (8s)',
        apply: (player) => {
            player.speed += 2;
            setTimeout(() => player.speed -= 2, 8000);
            playPowerupSound();
            return '¡VELOCIDAD DEMONÍACA!';
        }
    },
    FIRERATE: {
        type: 'firerate',
        color: '#ff00ff',
        effect: 'Chaingun (12s)',
        apply: (player) => {
            player.fireRate = Math.max(50, player.fireRate - 50);
            setTimeout(() => player.fireRate += 50, 12000);
            playPowerupSound();
            return '¡CHAINGUN LISTA!';
        }
    },
    INVULNERABILITY: {
        type: 'invulnerability',
        color: '#ffffff',
        effect: 'Invulnerabilidad (5s)',
        apply: (player) => {
            const originalHealth = player.health;
            player.health = Infinity;
            setTimeout(() => {
                player.health = Math.min(originalHealth, player.maxHealth);
            }, 5000);
            playPowerupSound();
            return '¡INVULNERABLE!';
        }
    },
    EXPLOSIVE: {
        type: 'explosive',
        color: '#ff3300',
        effect: 'BFG (15s)',
        apply: (player) => {
            player.explosiveShots = true;
            setTimeout(() => player.explosiveShots = false, 15000);
            playPowerupSound();
            return '¡BFG ACTIVADO!';
        }
    },
    DOUBLE_SHOT: {
        type: 'double',
        color: '#9900ff',
        effect: 'Doble Escopeta (20s)',
        apply: (player) => {
            player.doubleShot = true;
            setTimeout(() => player.doubleShot = false, 20000);
            playPowerupSound();
            return '¡DOBLE ESCOPETA!';
        }
    }
};

// Initialize game
function init() {
    game.canvas = document.getElementById('canvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = game.width;
    game.canvas.height = game.height;

    setupEventListeners();
    createLevel();
    spawnEnemies();
    
    game.running = true;
    game.startTime = Date.now();
    playBGM();
    gameLoop();
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
    });

    game.canvas.addEventListener('mousedown', () => {
        game.mouse.isDown = true;
        if (!game.mouse.locked) {
            game.canvas.requestPointerLock();
        }
        startAutoShooting();
    });

    game.canvas.addEventListener('mouseup', () => {
        game.mouse.isDown = false;
        stopAutoShooting();
    });

    document.addEventListener('pointerlockchange', () => {
        game.mouse.locked = document.pointerLockElement === game.canvas;
    });

    document.addEventListener('mousemove', (e) => {
        if (game.mouse.locked) {
            game.player.angle += e.movementX * 0.003;
        }
    });
}

function startAutoShooting() {
    if (!game.player.autoShootInterval) {
        shoot();
        game.player.autoShootInterval = setInterval(shoot, game.player.fireRate);
    }
}

function stopAutoShooting() {
    if (game.player.autoShootInterval) {
        clearInterval(game.player.autoShootInterval);
        game.player.autoShootInterval = null;
    }
}

function createLevel() {
    game.walls = [
        {x1: 50, y1: 50, x2: 750, y2: 50},
        {x1: 750, y1: 50, x2: 750, y2: 550},
        {x1: 750, y1: 550, x2: 50, y2: 550},
        {x1: 50, y1: 550, x2: 50, y2: 50},
        {x1: 250, y1: 150, x2: 350, y2: 150},
        {x1: 350, y1: 150, x2: 350, y2: 250},
        {x1: 250, y1: 250, x2: 250, y2: 150},
        {x1: 450, y1: 350, x2: 550, y2: 350},
        {x1: 550, y1: 350, x2: 550, y2: 450},
        {x1: 450, y1: 450, x2: 450, y2: 350},
        {x1: 150, y1: 350, x2: 150, y2: 400},
        {x1: 650, y1: 200, x2: 650, y2: 250}
    ];
}

function spawnEnemies() {
    const spawnPoints = [
        {x: 150, y: 150}, {x: 650, y: 150},
        {x: 150, y: 450}, {x: 650, y: 450},
        {x: 400, y: 100}, {x: 100, y: 300},
        {x: 700, y: 300}
    ];

    spawnPoints.forEach(point => {
        game.enemies.push(createEnemy(point.x, point.y));
    });
}

function createEnemy(x, y) {
    const waveMultiplier = 1 + (game.waveNumber - 1) * 0.25;
    return {
        x, y,
        health: Math.floor(60 * waveMultiplier),
        maxHealth: Math.floor(60 * waveMultiplier),
        speed: Math.min(2.5, 1.2 + (game.waveNumber - 1) * 0.15),
        damage: Math.floor(15 * waveMultiplier),
        lastAttack: 0,
        attackCooldown: Math.max(400, 800 - (game.waveNumber - 1) * 40),
        radius: 20,
        color: `hsl(${Math.random() * 30 + 360}, 70%, 40%)`,
        target: game.player
    };
}

function spawnRandomEnemy() {
    const spawnPoints = [
        {x: 100, y: 100}, {x: 700, y: 100},
        {x: 100, y: 500}, {x: 700, y: 500},
        {x: 400, y: 80}, {x: 80, y: 300},
        {x: 720, y: 300}
    ];
    
    const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    game.enemies.push(createEnemy(point.x, point.y));
}

function spawnPowerup(x, y) {
    const powerupKeys = Object.keys(POWERUP_TYPES);
    let powerupType;
    
    const rand = Math.random();
    if (rand < 0.4) {
        powerupType = POWERUP_TYPES.HEALTH;
    } else {
        const index = Math.floor((rand - 0.4) / 0.1) + 1;
        powerupType = POWERUP_TYPES[powerupKeys[index]];
    }
    
    game.powerups.push({
        x, y,
        type: powerupType.type,
        color: powerupType.color,
        effect: powerupType.effect,
        radius: 15,
        lifetime: 12000,
        spawnTime: Date.now(),
        pulsePhase: 0
    });
}

function shoot() {
    const now = Date.now();
    if (now - game.player.lastShot < game.player.fireRate) return;
    
    const bulletConfig = {
        x: game.player.x,
        y: game.player.y,
        angle: game.player.angle,
        speed: 10,
        distance: 0,
        explosive: game.player.explosiveShots || false
    };
    
    game.bullets.push(bulletConfig);
    
    if (game.player.doubleShot) {
        const angleOffset = 0.15;
        game.bullets.push({
            ...bulletConfig,
            angle: game.player.angle - angleOffset
        });
        game.bullets.push({
            ...bulletConfig,
            angle: game.player.angle + angleOffset
        });
    }
    
    game.player.lastShot = now;
    playShootSound();
}

function update(deltaTime) {
    updatePlayer(deltaTime);
    updateEnemies(deltaTime);
    updateBullets(deltaTime);
    updatePowerups(deltaTime);
    spawnEnemiesOverTime();
    checkCollisions();
}

function updatePlayer(deltaTime) {
    const player = game.player;
    let moveX = 0, moveY = 0;

    if (game.keys['w']) moveY -= player.speed;
    if (game.keys['s']) moveY += player.speed;
    if (game.keys['a']) moveX -= player.speed;
    if (game.keys['d']) moveX += player.speed;

    const newX = player.x + moveX;
    const newY = player.y + moveY;
    
    if (!checkWallCollision(newX, player.y, 12)) player.x = newX;
    if (!checkWallCollision(player.x, newY, 12)) player.y = newY;
}

function updateEnemies(deltaTime) {
    game.enemies.forEach((enemy, enemyIndex) => {
        const dx = game.player.x - enemy.x;
        const dy = game.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 40) {
            const moveX = (dx / distance) * enemy.speed;
            const moveY = (dy / distance) * enemy.speed;
            
            if (!checkWallCollision(enemy.x + moveX, enemy.y, enemy.radius)) {
                enemy.x += moveX;
            }
            if (!checkWallCollision(enemy.x, enemy.y + moveY, enemy.radius)) {
                enemy.y += moveY;
            }
        } else {
            const now = Date.now();
            if (now - enemy.lastAttack > enemy.attackCooldown && game.player.health !== Infinity) {
                game.player.health -= enemy.damage;
                enemy.lastAttack = now;
                showDamageFlash();
                playHitSound();
                
                if (game.player.health <= 0) {
                    game.player.health = 0;
                }
            }
        }

        if (enemy.health <= 0) {
            if (Math.random() < 0.4) spawnPowerup(enemy.x, enemy.y);
            game.score += 150;
            game.enemiesKilled++;
            game.enemies.splice(enemyIndex, 1);
        }
    });
}

function updateBullets(deltaTime) {
    game.bullets.forEach(bullet => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        bullet.distance += bullet.speed;
    });

    game.bullets = game.bullets.filter(bullet => {
        if (bullet.distance > 600) return false;
        return !checkWallCollision(bullet.x, bullet.y, 3);
    });
}

function updatePowerups(deltaTime) {
    const now = Date.now();
    game.powerups.forEach((powerup, index) => {
        // Update pulse phase for visual effect
        powerup.pulsePhase += deltaTime * 0.005;
        // Remove powerups that have exceeded their lifetime
        if (now - powerup.spawnTime > powerup.lifetime) {
            game.powerups.splice(index, 1);
        }
    });
}

function checkCollisions() {
    game.bullets.forEach((bullet, bulletIndex) => {
        game.enemies.forEach((enemy, enemyIndex) => {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.radius) {
                enemy.health -= game.player.damage;
                
                if (bullet.explosive) {
                    game.enemies.forEach(otherEnemy => {
                        const dist = Math.sqrt(
                            Math.pow(otherEnemy.x - bullet.x, 2) + 
                            Math.pow(otherEnemy.y - bullet.y, 2)
                        );
                        if (dist < 60 && otherEnemy !== enemy) {
                            otherEnemy.health -= game.player.damage * 0.6;
                        }
                    });
                }
                
                game.bullets.splice(bulletIndex, 1);
            }
        });
    });

    game.powerups.forEach((powerup, powerupIndex) => {
        const dx = game.player.x - powerup.x;
        const dy = game.player.y - powerup.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < powerup.radius + 12) {
            applyPowerup(powerup);
            game.powerups.splice(powerupIndex, 1);
        }
    });
}

function applyPowerup(powerup) {
    game.score += 100;
    const powerupType = Object.values(POWERUP_TYPES).find(p => p.type === powerup.type);
    
    if (powerupType) {
        const message = powerupType.apply(game.player);
        showPowerupMessage(message, powerupType.color);
    }
}

function showPowerupMessage(message, color) {
    const msgElement = document.createElement('div');
    msgElement.textContent = message;
    msgElement.className = 'powerup-message';
    msgElement.style.color = color;
    msgElement.style.textShadow = `0 0 15px ${color}`;
    
    document.body.appendChild(msgElement);
    setTimeout(() => msgElement.remove(), 1800);
}

function checkWallCollision(x, y, radius) {
    return game.walls.some(wall => {
        return pointToLineDistance(x, y, wall.x1, wall.y1, wall.x2, wall.y2) < radius;
    });
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    if (param < 0) {
        return Math.sqrt(A * A + B * B);
    } else if (param > 1) {
        const dx = px - x2;
        const dy = py - y2;
        return Math.sqrt(dx * dx + dy * dy);
    } else {
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function render() {
    const ctx = game.ctx;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
    gradient.addColorStop(0, '#3c2f2f');
    gradient.addColorStop(0.5, '#2b1d1d');
    gradient.addColorStop(1, '#4b3f3f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, game.width, game.height);
    
    ctx.strokeStyle = '#6b4e31';
    ctx.lineWidth = 4;
    game.walls.forEach(wall => {
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
    });
    
    game.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        const barWidth = enemy.radius * 2;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#3c2f2f';
        ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.radius - 12, barWidth, 5);
        ctx.fillStyle = '#ff5555';
        ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.radius - 12, barWidth * healthPercent, 5);
    });
    
    game.powerups.forEach(powerup => {
        const pulseSize = powerup.radius + Math.sin(powerup.pulsePhase) * 4;
        
        ctx.fillStyle = powerup.color + '60';
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, pulseSize + 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = powerup.color;
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, pulseSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.fillStyle = '#ffff55';
    game.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        if (bullet.explosive) {
            ctx.fillStyle = '#ff880099';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffff55';
        }
    });
    
    const player = game.player;
    ctx.fillStyle = game.player.health === Infinity ? '#ffffff' : '#55ff55';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#55ff55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(player.angle) * 25,
        player.y + Math.sin(player.angle) * 25
    );
    ctx.stroke();
}

function updateHUD() {
    const timeLeft = Math.max(0, game.maxTime - (Date.now() - game.startTime));
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    document.getElementById('health').textContent = `VIDA: ${game.player.health === Infinity ? '∞' : game.player.health}`;
    document.getElementById('score').textContent = `PUNTOS: ${game.score}`;
    document.getElementById('timer').textContent = `TIEMPO: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('kills').textContent = `DEMONIOS: ${game.enemiesKilled}`;
    document.getElementById('wave').textContent = `INFIERNO: ${game.waveNumber}`;
    
    const highScore = getHighScore();
    document.getElementById('highScoreValue').textContent = highScore;
    
    const healthElement = document.getElementById('health');
    if (game.player.health === Infinity) {
        healthElement.style.color = '#ffffff';
        healthElement.style.textShadow = '0 0 10px #ffffff';
    } else if (game.player.health < 30) {
        healthElement.style.color = '#ff5555';
        healthElement.style.textShadow = '0 0 10px #ff5555';
    } else if (game.player.health < 60) {
        healthElement.style.color = '#ffff55';
        healthElement.style.textShadow = '0 0 10px #ffff55';
    } else {
        healthElement.style.color = '#55ff55';
        healthElement.style.textShadow = '0 0 10px #55ff55';
    }
}

function spawnEnemiesOverTime() {
    const now = Date.now();
    const gameTime = now - game.startTime;
    
    const newWave = Math.floor(gameTime / 60000) + 1;
    if (newWave > game.waveNumber) {
        game.waveNumber = newWave;
        game.enemySpawnRate = Math.max(1500, game.enemySpawnRate - 500);
    }
    
    if (now - game.lastEnemySpawn > game.enemySpawnRate && game.enemies.length < 20) {
        spawnRandomEnemy();
        game.lastEnemySpawn = now;
    }
}

function checkGameEnd() {
    const timeLeft = game.maxTime - (Date.now() - game.startTime);
    
    if (game.player.health <= 0) {
        endGame(false);
    } else if (timeLeft <= 0) {
        endGame(true);
    }
}

function endGame(victory) {
    game.running = false;
    stopAutoShooting();
    
    saveHighScore(game.score);
    
    if (victory) {
        document.getElementById('victory').style.display = 'flex';
    } else {
        document.getElementById('gameOver').style.display = 'flex';
    }
    
    const bgm = document.getElementById('bgm');
    bgm.pause();
}

function saveHighScore(score) {
    if (!window.gameStorage) {
        window.gameStorage = {};
    }
    
    const currentHigh = window.gameStorage.highScore || 0;
    if (score > currentHigh) {
        window.gameStorage.highScore = score;
    }
}

function getHighScore() {
    if (!window.gameStorage) {
        window.gameStorage = {};
    }
    return window.gameStorage.highScore || 0;
}

function restartGame() {
    game.player.health = 100;
    game.player.x = 400;
    game.player.y = 300;
    game.player.angle = 0;
    game.player.speed = 4;
    game.player.damage = 30;
    game.player.fireRate = 150;
    game.player.explosiveShots = false;
    game.player.doubleShot = false;
    game.player.lastShot = 0;
    game.player.autoShootInterval = null;
    game.enemies = [];
    game.bullets = [];
    game.powerups = [];
    game.score = 0;
    game.enemiesKilled = 0;
    game.waveNumber = 1;
    game.enemySpawnRate = 4000;
    game.lastEnemySpawn = 0;
    game.startTime = Date.now();
    game.running = true;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('victory').style.display = 'none';
    
    spawnEnemies();
    playBGM();
    gameLoop();
}

function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 150);
}

function playShootSound() {
    const sound = document.getElementById('shootSound');
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function playHitSound() {
    const sound = document.getElementById('hitSound');
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function playPowerupSound() {
    const sound = document.getElementById('powerupSound');
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function playBGM() {
    const bgm = document.getElementById('bgm');
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
}

function gameLoop(currentTime = 0) {
    if (!game.running) return;

    const deltaTime = currentTime - game.lastTime;
    game.lastTime = currentTime;

    update(deltaTime);
    render();
    updateHUD();
    checkGameEnd();

    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
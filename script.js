/******************************************************
 * script.js – Mit Pause, rotem Streifen an Austrittsstelle,
 * Wahl links/rechts, Highscore, Touch & Keyboard, Spielmodi
 ******************************************************/

// DOM-Elemente
const menu = document.getElementById('menu');
const gameCanvas = document.getElementById('gameCanvas');
const endScreen = document.getElementById('endScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
const difficultySelect = document.getElementById('difficulty');
const maxPointsInput = document.getElementById('maxPoints');
const soundCheckbox = document.getElementById('soundOn');
const highscoreDisplay = document.getElementById('highscoreValue');
const pingSound = document.getElementById('pingSound');
const sideChoiceSelect = document.getElementById('sideChoice');
const pauseBtn = document.getElementById('pauseBtn');
const standardModeBtn = document.getElementById('standardMode');
const survivalModeBtn = document.getElementById('survivalMode');
const modeDescription = document.getElementById('modeDescription');
const fullscreenIcon = document.getElementById('fullscreenIcon');
const fullscreenToggle = document.getElementById('fullscreenToggle');
const abortBtn = document.getElementById('abortBtn');

// Canvas-Kontext
const ctx = gameCanvas.getContext('2d');
const WIDTH = gameCanvas.width;
const HEIGHT = gameCanvas.height;

// Paddles
const paddleWidth = 10;
const paddleHeight = 80;

// Ball
const ballSize = 10; // Durchmesser

// Globale Variablen für Highscore ergänzen
let storedStandardHighscore = parseInt(localStorage.getItem('pongStandardHighscore'), 10) || 0;
let storedSurvivalHighscore = parseInt(localStorage.getItem('pongSurvivalHighscore'), 10) || 0;

// Score
let userScore = 0;
let aiScore = 0;

// Einstellungen/Status
let paddleSpeed, ballSpeed;
let maxPoints;
let difficulty;
let soundOn;
let userSide; // 'left' oder 'right'
let gameRunning = false;
let isPaused = false;
let gameMode = "standard"; // "standard" oder "survival"

// Zeit / Geschwindigkeit
let gameStartTime = 0;
let lastSpeedIncreaseTime = 0;
let speedMultiplier = 1.0;

// Survival-Modus spezifisch
let lives = 3;
let gameTimer;
let gameStatusDiv;
let speedIndicator;

// Paddles und Ball
let userPaddle, aiPaddle, ball;

// "Roter Streifen" bei Punktverlust
// - wir zeichnen nur dort, wo der Ball wirklich rausging
let flashX = null;   // x-Koordinate (0 oder WIDTH)
let flashY = null;   // y-Koordinate (Ballhöhe) 
let flashTimer = 0;  // frames, in denen die Linie sichtbar ist


fullscreenToggle.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullscreenIcon.textContent = 'fullscreen_exit';
  } else {
    document.exitFullscreen();
    fullscreenIcon.textContent = 'fullscreen';
  }
});
// Endscreen und Pause-Button anfangs ausblenden
endScreen.style.display = 'none';
pauseBtn.style.display = 'none';
abortBtn.style.display = 'none';
// Initialen Highscore setzen
updateHighscoreDisplay();

/******************************************************
 * Events
 ******************************************************/

// Spiel starten
startBtn.addEventListener('click', startGame);

// Nochmal spielen
restartBtn.addEventListener('click', () => {
  endScreen.style.display = 'none';
  menu.style.display = 'flex';
});

// Pause/Weiter
pauseBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '▶ Continue' : '⏸ Pause';
});
// Event-Listener für den Abbruch-Button hinzufügen
abortBtn.addEventListener('click', () => {
  // Bestätigung vom Benutzer einholen
  if (confirm('Spiel wirklich abbrechen?')) {
    // Spiel beenden und zum Menü zurückkehren
    endGame(false, 'Spiel abgebrochen');
  }
});
// Spielmodus wechseln
if (standardModeBtn) {
  standardModeBtn.addEventListener('click', () => {
    setGameMode("standard");
  });
}

if (survivalModeBtn) {
  survivalModeBtn.addEventListener('click', () => {
    setGameMode("survival");
  });
}

function updateHighscoreDisplay() {
  if (highscoreDisplay) {
    if (gameMode === "standard") {
      highscoreDisplay.textContent = storedStandardHighscore;
    } else {
      const minutes = Math.floor(storedSurvivalHighscore / 60);
      const seconds = storedSurvivalHighscore % 60;
      highscoreDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}

function saveGameSettings() {
  const settings = {
    difficulty: difficultySelect.value,
    maxPoints: maxPointsInput.value, 
    soundOn: soundCheckbox.checked,
    userSide: sideChoiceSelect.value,
    gameMode: gameMode
  };
  localStorage.setItem('pongSettings', JSON.stringify(settings));
}

// Gespeicherte Einstellungen laden
function loadGameSettings() {
  const savedSettings = localStorage.getItem('pongSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    
    // Einstellungen anwenden
    difficultySelect.value = settings.difficulty || 'medium';
    maxPointsInput.value = settings.maxPoints || 5;
    soundCheckbox.checked = settings.soundOn !== undefined ? settings.soundOn : true;
    sideChoiceSelect.value = settings.userSide || 'left';
    
    // Spielmodus setzen
    if (settings.gameMode) {
      gameMode = settings.gameMode;
      setGameMode(gameMode); // UI aktualisieren
    }
  } else {
    // Standardwerte setzen wenn keine Einstellungen vorhanden
    soundCheckbox.checked = true;
  }
}

// Aktuellen Spielstand speichern
function saveCurrentGameState() {
  if (!gameRunning) return; // Nur speichern, wenn ein Spiel läuft
  
  const gameState = {
    userScore,
    aiScore,
    ballPosition: {x: ball.x, y: ball.y, dx: ball.dx, dy: ball.dy},
    userPaddlePos: userPaddle.y,
    aiPaddlePos: aiPaddle.y,
    timestamp: Date.now(),
    lives: lives,
    speedMultiplier: speedMultiplier
  };
  
  localStorage.setItem('pongGameState', JSON.stringify(gameState));
}

// Spielstand wiederherstellen
function restoreGameState() {
  const savedState = localStorage.getItem('pongGameState');
  if (!savedState) return false;
  
  const gameState = JSON.parse(savedState);
  // Prüfen, ob der Spielstand nicht zu alt ist (z.B. älter als 1 Tag)
  if (Date.now() - gameState.timestamp > 86400000) {
    localStorage.removeItem('pongGameState');
    return false;
  }
  
  // Hier könntest du eine Funktion implementieren, die fragt,
  // ob der Spieler das vorherige Spiel fortsetzen möchte
  return true;
}

// Event-Listener für das Verlassen der Seite hinzufügen
window.addEventListener('beforeunload', saveCurrentGameState);
// Spielmodus setzen und Button aktiv markieren
function setGameMode(mode) {
  gameMode = mode;
  
  // UI aktualisieren
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  
  if (mode === "standard") {
    standardModeBtn.classList.add("active");
    modeDescription.textContent = "Standard: Gewinne durch Erreichen der Punktegrenze.";
    maxPointsInput.disabled = false;
    document.getElementById("highscoreDescription").textContent = "Höchste erreichte Punktzahl:";
  } else {
    survivalModeBtn.classList.add("active");
    modeDescription.textContent = "Survival: Max. 3 Tore kassieren. Ball wird alle 10 Sek. schneller.";
    maxPointsInput.disabled = true;
    document.getElementById("highscoreDescription").textContent = "Längste überlebte Zeit:";
  }
  
  // Highscore-Anzeige aktualisieren
  updateHighscoreDisplay();
}

/******************************************************
 * startGame
 ******************************************************/
function startGame() {
  // Menü ausblenden, Canvas und Pause-Button anzeigen
  menu.style.display = 'none';
  gameCanvas.style.display = 'block';
  pauseBtn.style.display = 'block';
  abortBtn.style.display = 'block';  // Abbruch-Button anzeigen
  pauseBtn.textContent = '⏸ Pause';
  endScreen.style.display = 'none';
  isPaused = false;

  // Canvas-Container für relative Positionierung (für Status-Anzeigen)
  document.getElementById("canvasContainer").style.position = "relative";

  // Einstellungen
  difficulty = difficultySelect.value; // 'easy', 'medium', 'hard'
  maxPoints = parseInt(maxPointsInput.value, 10);
  soundOn = soundCheckbox.checked;
  userSide = sideChoiceSelect.value;   // 'left' oder 'right'

  // Schwierigkeitsgrade
  switch(difficulty) {
    case 'easy':
      paddleSpeed = 5;
      ballSpeed = 4;
      break;
    case 'medium':
      paddleSpeed = 7;
      ballSpeed = 5;
      break;
    case 'hard':
      paddleSpeed = 9;
      ballSpeed = 6;
      break;
  }

  // Score zurücksetzen
  userScore = 0;
  aiScore = 0;

  // Paddles
  let leftPaddle = {
    x: 0,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    prevY: HEIGHT / 2 - paddleHeight / 2 // Speichere die vorherige Position
  };
  let rightPaddle = {
    x: WIDTH - paddleWidth,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    prevY: HEIGHT / 2 - paddleHeight / 2 // Speichere die vorherige Position
  };

  // Je nach userSide
  if (userSide === 'left') {
    userPaddle = leftPaddle;
    aiPaddle = rightPaddle;
  } else {
    userPaddle = rightPaddle;
    aiPaddle = leftPaddle;
  }

  // Ball
  ball = {
    x: WIDTH / 2 - ballSize / 2,
    y: HEIGHT / 2 - ballSize / 2,
    width: ballSize,
    height: ballSize,
    dx: (Math.random() < 0.5 ? 1 : -1) * ballSpeed,
    dy: (Math.random() < 0.5 ? 1 : -1) * ballSpeed
  };

  // Zeit
  gameStartTime = performance.now();
  lastSpeedIncreaseTime = gameStartTime;
  
  // Survival-Modus spezifisch
  if (gameMode === "survival") {
    lives = 3;
    speedMultiplier = 1.0;
    
    // Status-Anzeigen erstellen - ÜBER dem Spielfeld
    gameStatusDiv = document.createElement("div");
    gameStatusDiv.className = "game-status";
    gameStatusDiv.style.position = "absolute";
    gameStatusDiv.style.top = "-40px";
    gameStatusDiv.style.left = "0";
    gameStatusDiv.style.right = "0";
    gameStatusDiv.style.display = "flex";
    gameStatusDiv.style.justifyContent = "space-between";
    gameStatusDiv.style.padding = "0 20px";
    gameStatusDiv.style.zIndex = "10";
    
    gameStatusDiv.innerHTML = `
      <div class="lives-counter" style="background-color: rgb(255, 0, 0); padding: 5px 10px; border-radius: 4px;">
        Leben: <span id="livesValue">0 von 3</span>
      </div>
      <div class="timer" style="background-color: rgba(0,0,0,0.0); padding: 5px 10px; border-radius: 4px;">
        Zeit: <span id="timeValue">00:00</span>
      </div>
    `;
    document.getElementById("canvasContainer").appendChild(gameStatusDiv);
    
    speedIndicator = document.createElement("div");
    speedIndicator.className = "speed-indicator";
    speedIndicator.style.position = "absolute";
    speedIndicator.style.bottom = "10px";
    speedIndicator.style.right = "20px";
    speedIndicator.style.backgroundColor = "rgba(0,0,0,0.0)";
    speedIndicator.style.padding = "5px 10px";
    speedIndicator.style.borderRadius = "4px";
    speedIndicator.style.fontSize = "14px";
    speedIndicator.style.color = "white";
    speedIndicator.style.zIndex = "10";
    
    speedIndicator.innerHTML = `Geschwindigkeit: <span id="speedValue">1.0x</span>`;
    document.getElementById("canvasContainer").appendChild(speedIndicator);
    
    // Timer starten
    gameTimer = setInterval(updateTimer, 100);
    
    // Anzeigen aktualisieren
    updateLifeCounter();
  }

  // Steuerung
  activateKeyboardControls();
  activateTouchControls();

  // Los geht's
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

// Timer für den Survival-Modus aktualisieren
function updateTimer() {
  if (gameMode === "survival" && gameRunning && !isPaused) {
    const now = performance.now();
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000);
    
    // Formatieren als MM:SS
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    const timeElement = document.getElementById("timeValue");
    if (timeElement) {
      timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Alle 10 Sekunden Ball beschleunigen
    if (now - lastSpeedIncreaseTime >= 10000) {
      speedMultiplier += 0.1;
      lastSpeedIncreaseTime = now;
      
      const speedElement = document.getElementById("speedValue");
      if (speedElement) {
        speedElement.textContent = speedMultiplier.toFixed(1) + "x";
      }
      
      // Ballgeschwindigkeit erhöhen
      const speedDirection = ball.dx > 0 ? 1 : -1;
      ball.dx = speedDirection * ballSpeed * speedMultiplier;
      
      const dyDirection = ball.dy > 0 ? 1 : -1;
      ball.dy = dyDirection * ballSpeed * speedMultiplier;
    }
  }
}

// Leben-Anzeige aktualisieren
function updateLifeCounter() {
  const livesElement = document.getElementById("livesValue");
  if (livesElement) {
    livesElement.textContent = `${3 - lives} von 3`;
  }
}

/******************************************************
 * Keyboard Controls
 ******************************************************/
function activateKeyboardControls() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onKeyDown(e) {
  if (!gameRunning) return;
  switch(e.keyCode) {
    case 38: // Pfeil hoch
      userPaddle.dy = -paddleSpeed;
      break;
    case 40: // Pfeil runter
      userPaddle.dy = paddleSpeed;
      break;
  }
}

function onKeyUp(e) {
  if (!gameRunning) return;
  switch(e.keyCode) {
    case 38:
    case 40:
      userPaddle.dy = 0;
      break;
  }
}

/******************************************************
 * Touch Controls
 ******************************************************/
function activateTouchControls() {
  gameCanvas.addEventListener('touchmove', onTouchMove);
}

function onTouchMove(e) {
  e.preventDefault();
  if (!gameRunning || e.touches.length === 0) return;

  const touch = e.touches[0];
  const rect = gameCanvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;

  userPaddle.y = touchY - paddleHeight / 2;

  // Begrenzungen
  if (userPaddle.y < 0) userPaddle.y = 0;
  if (userPaddle.y + paddleHeight > HEIGHT) {
    userPaddle.y = HEIGHT - paddleHeight;
  }
}

/******************************************************
 * gameLoop
 ******************************************************/
function gameLoop(timestamp) {
  if (!gameRunning) return;

  // Nur updaten & zeichnen, wenn nicht pausiert
  if (!isPaused) {
    update(timestamp);
    draw();
  }

  requestAnimationFrame(gameLoop);
}

/******************************************************
 * update
 ******************************************************/
function update(timestamp) {
  // Ballbeschleunigung im Standard-Modus alle 60 Sek.
  if (gameMode === "standard") {
    const elapsedSec = (timestamp - lastSpeedIncreaseTime) / 1000;
    if (elapsedSec >= 60) {
      ball.dx *= 1.2;
      ball.dy *= 1.2;
      lastSpeedIncreaseTime = timestamp;
    }
  }
  
  // User-Paddle
  userPaddle.y += userPaddle.dy;
  if (userPaddle.y < 0) userPaddle.y = 0;
  if (userPaddle.y + paddleHeight > HEIGHT) {
    userPaddle.y = HEIGHT - paddleHeight;
  }

  // AI-Paddle 
  let computerSpeed = paddleSpeed;
  let errorFactor = 0.7;

  if (gameMode === "survival") {
    // Survival-Modus bleibt unverändert - KI ist herausfordernd
    computerSpeed = paddleSpeed + 2;  
    errorFactor = 0.9;
  } else {
    // Standard-Modus - einfacher gestalten
    if (difficulty === 'easy') {
      computerSpeed = paddleSpeed - 3; // Langsamer
      errorFactor = 0.3;  // Mehr Fehler/Verzögerung
    } else if (difficulty === 'medium') {
      computerSpeed = paddleSpeed - 2;
      errorFactor = 0.5;
    } else if (difficulty === 'hard') {
      computerSpeed = paddleSpeed;
      errorFactor = 0.7;  // Immer noch schlagbar
    }
  }

  // KI-Algorithmus
  const aiTarget = ball.y + (ball.height / 2) - (aiPaddle.height / 2);
  
  // Verzögerung für die Reaktion im Standard-Modus
  let reactionDelay = 0;
  if (gameMode === "standard") {
    if (difficulty === 'easy') reactionDelay = 10; // Starke Verzögerung
    else if (difficulty === 'medium') reactionDelay = 5;
    else if (difficulty === 'hard') reactionDelay = 2;
  }
  
  // KI-Bewegung mit Verzögerung
  if (Math.abs(aiTarget - aiPaddle.y) > reactionDelay) {
    aiPaddle.y += (aiTarget - aiPaddle.y) * errorFactor;
  }
  
  // Bewegungsgeschwindigkeit der KI begrenzen
  const maxMovement = computerSpeed;
  if (Math.abs(aiPaddle.y - aiPaddle.prevY) > maxMovement) {
    if (aiPaddle.y > aiPaddle.prevY) {
      aiPaddle.y = aiPaddle.prevY + maxMovement;
    } else {
      aiPaddle.y = aiPaddle.prevY - maxMovement;
    }
  }
  aiPaddle.prevY = aiPaddle.y;
  
  // KI-Paddle Grenzen
  if (aiPaddle.y < 0) aiPaddle.y = 0;
  if (aiPaddle.y + paddleHeight > HEIGHT) {
    aiPaddle.y = HEIGHT - paddleHeight;
  }

  // Ball bewegen
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Koll. oben/unten
  if (ball.y < 0 || (ball.y + ball.height) > HEIGHT) {
    ball.dy *= -1;
    playSound();
  }

  // Koll. userPaddle
  if (checkCollision(ball, userPaddle)) {
    if (userSide === 'left') {
      ball.dx = Math.abs(ball.dx); // immer nach rechts
    } else {
      ball.dx = -Math.abs(ball.dx); // immer nach links
    }
    addSpin(userPaddle);
    playSound();
  }

  // Koll. aiPaddle
  if (checkCollision(ball, aiPaddle)) {
    if (userSide === 'left') {
      // AI ist rechts
      ball.dx = -Math.abs(ball.dx); 
    } else {
      // AI ist links
      ball.dx = Math.abs(ball.dx);
    }
    addSpin(aiPaddle);
    playSound();
  }

  // Ball links raus
  if (ball.x < 0) {
    if (gameMode === "survival" && userSide === 'left') {
      // In Survival: Leben verlieren wenn der Ball hinter dem Spieler rausgeht
      lives--;
      updateLifeCounter();
      
      if (lives <= 0) {
        const now = performance.now();
        const survivedTime = Math.floor((now - gameStartTime) / 1000);
        checkAndUpdateSurvivalHighscore(survivedTime);
        
        const minutes = Math.floor(survivedTime / 60);
        const seconds = survivedTime % 60;
        endGame(false, `Überlebt: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }
    } else {
      // Standard-Modus Punktezählung
      if (userSide === 'left') {
        // User hat verpasst -> AI Punkt
        aiScore++;
      } else {
        // AI ist links -> User Punkt
        userScore++;
      }
    }
    // Roter Streifen genau dort, wo der Ball rausging
    flashX = 0;
    // Y-Position = Ballmitte (zur Zeit des Austritts)
    flashY = ball.y + ball.height / 2;
    flashTimer = 20; // 20 Frames
    resetBall();
  }

  // Ball rechts raus
  if (ball.x + ball.width > WIDTH) {
    if (gameMode === "survival" && userSide === 'right') {
      // In Survival: Leben verlieren wenn der Ball hinter dem Spieler rausgeht
      lives--;
      updateLifeCounter();
      
      if (lives <= 0) {
        const now = performance.now();
        const survivedTime = Math.floor((now - gameStartTime) / 1000);
        checkAndUpdateSurvivalHighscore(survivedTime);
        
        const minutes = Math.floor(survivedTime / 60);
        const seconds = survivedTime % 60;
        endGame(false, `Überlebt: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }
    } else {
      // Standard-Modus Punktezählung
      if (userSide === 'right') {
        // User hat verpasst -> AI Punkt
        aiScore++;
      } else {
        // AI ist rechts -> User Punkt
        userScore++;
      }
    }
    flashX = WIDTH;
    flashY = ball.y + ball.height / 2;
    flashTimer = 20;
    resetBall();
  }

  // Siegbedingung im Standard-Modus
  if (gameMode === "standard" && maxPoints > 0) {
    if (userScore >= maxPoints) {
      checkAndUpdateStandardHighscore();
      endGame(true);
    } else if (aiScore >= maxPoints) {
      checkAndUpdateStandardHighscore();
      endGame(false);
    }
  }
}

/******************************************************
 * draw
 ******************************************************/
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Paddles
  ctx.fillStyle = '#FFF';
  ctx.fillRect(userPaddle.x, userPaddle.y, userPaddle.width, userPaddle.height);
  ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);

  // Ball (rund)
  ctx.beginPath();
  ctx.arc(
    ball.x + ball.width / 2,
    ball.y + ball.height / 2,
    ball.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.closePath();

  // Score oben - aber nur im Standard-Modus
  if (gameMode === "standard") {
    ctx.font = '28px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`You: ${userScore} - Computer: ${aiScore}`, WIDTH / 2, 40);
  }

  // Roter Streifen falls Timer aktiv
  if (flashTimer > 0 && flashX !== null && flashY !== null) {
    ctx.fillStyle = 'red';
    // "Breite" in X-Richtung je nachdem, ob links oder rechts
    const thickness = 40; // wie hoch der Balken ist
    const half = thickness / 2;
    const lineWidth = 15; // dicke Linie in X-Richtung

    // flashX = 0 oder WIDTH
    // flashY = Ballmitte
    // Wir zeichnen also senkrecht bei x=flashX, Höhe ~thickness
    // Bei left => x=0
    // Bei right => x=WIDTH-(lineWidth)
    let drawX = flashX === 0 ? 0 : (WIDTH - lineWidth);
    let drawY = flashY - half; // zentriert um die Ballmitte

    // Begrenzung, falls der Ball gerade ganz oben/unten raus ist
    if (drawY < 0) drawY = 0;
    if (drawY + thickness > HEIGHT) {
      drawY = HEIGHT - thickness;
    }

    ctx.fillRect(drawX, drawY, lineWidth, thickness);

    flashTimer--;
    if (flashTimer <= 0) {
      flashX = null;
      flashY = null;
    }
  }
}

/******************************************************
 * Hilfsfunktionen
 ******************************************************/
function resetBall() {
  ball.x = WIDTH / 2 - ballSize / 2;
  ball.y = HEIGHT / 2 - ballSize / 2;
  
  if (gameMode === "survival") {
    // Im Survival-Modus bleibt die erhöhte Geschwindigkeit erhalten
    const baseSpeed = ballSpeed * speedMultiplier;
    ball.dx = (Math.random() < 0.5 ? 1 : -1) * baseSpeed;
    ball.dy = (Math.random() < 0.5 ? 1 : -1) * baseSpeed;
  } else {
    // Im Standard-Modus normale Geschwindigkeit
    ball.dx = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
    ball.dy = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
  }
}

function checkCollision(b, p) {
  return (
    b.x < p.x + p.width &&
    b.x + b.width > p.x &&
    b.y < p.y + p.height &&
    b.y + b.height > p.y
  );
}

function addSpin(paddle) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.height / 2;
  const distance = ballCenter - paddleCenter;
  ball.dy += distance * 0.1;
}

function playSound() {
  if (!soundOn) return;
  pingSound.currentTime = 0;
  pingSound.play();
}

// Highscore für Standard-Spiel prüfen und aktualisieren
function checkAndUpdateStandardHighscore() {
  if (userScore > storedStandardHighscore) {
    localStorage.setItem('pongStandardHighscore', userScore);
    storedStandardHighscore = userScore;
  }
}

function checkAndUpdateSurvivalHighscore(survivedTime) {
  if (survivedTime > storedSurvivalHighscore) {
    localStorage.setItem('pongSurvivalHighscore', survivedTime);
    storedSurvivalHighscore = survivedTime;
  }
}
function endGame(playerWon, customMessage = null) {
  gameRunning = false;
  gameCanvas.style.display = 'none';
  pauseBtn.style.display = 'none'; // Pause-Button ausblenden
  abortBtn.style.display = 'none'; 
  endScreen.style.display = 'block';

  // Events entfernen
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  gameCanvas.removeEventListener('touchmove', onTouchMove);
  
  // Survival-Modus Timer stoppen
  if (gameMode === "survival") {
    clearInterval(gameTimer);
    
    // Status-Anzeigen entfernen
    if (gameStatusDiv) gameStatusDiv.remove();
    if (speedIndicator) speedIndicator.remove();
  }

  if (customMessage) {
    // Benutzerdefinierte Nachricht für den Survival-Modus
    endTitle.textContent = 'Spielende!';
    endMessage.textContent = customMessage;
  } else if (playerWon) {
    // Standard-Modus Gewonnen
    endTitle.textContent = 'Glückwunsch!';
    endMessage.textContent = `Du hast ${userScore}:${aiScore} gewonnen.`;
  } else {
    // Standard-Modus Verloren
    endTitle.textContent = 'Verloren!';
    endMessage.textContent = `Der Computer hat ${aiScore}:${userScore} gewonnen.`;
  }

  // Highscore-Anzeige aktualisieren
  updateHighscoreDisplay();
}
// Initial den ausgewählten Spielmodus setzen
setGameMode(gameMode);
// Gespeicherte Einstellungen laden
loadGameSettings();
// Zu Ereignis-Listenern hinzufügen
standardModeBtn.addEventListener('click', () => {
  setGameMode("standard");
  saveGameSettings();
});

survivalModeBtn.addEventListener('click', () => {
  setGameMode("survival");
  saveGameSettings();
});

// Bei Änderungen an Schwierigkeit, Punkten usw.
difficultySelect.addEventListener('change', saveGameSettings);
maxPointsInput.addEventListener('change', saveGameSettings);
soundCheckbox.addEventListener('change', saveGameSettings);
sideChoiceSelect.addEventListener('change', saveGameSettings);
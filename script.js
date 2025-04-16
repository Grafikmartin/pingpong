/******************************************************
 * Globale Variablen und Konfiguration
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

// Canvas
const ctx = gameCanvas.getContext('2d');
const WIDTH = gameCanvas.width;
const HEIGHT = gameCanvas.height;

// Schläger (Paddles)
const paddleWidth = 10;
const paddleHeight = 80;

// Ball
const ballSize = 10; // Durchmesser

// Variablen für Spiel-Status
let userPaddle, aiPaddle;
let userScore = 0;
let aiScore = 0;

let paddleSpeed, ballSpeed;
let maxPoints;
let difficulty;
let soundOn;
let userSide; // 'left' oder 'right'

let gameRunning = false;
let gameStartTime = 0;
let lastSpeedIncreaseTime = 0;

// Highscore aus localStorage laden (oder 0, falls nichts gespeichert)
let storedHighscore = parseInt(localStorage.getItem('pongHighscore'), 10) || 0;
highscoreDisplay.textContent = storedHighscore;

// Endscreen anfangs versteckt halten
endScreen.style.display = 'none';


/******************************************************
 * Events
 ******************************************************/
startBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  // Endscreen ausblenden, Menü zeigen
  endScreen.style.display = 'none';
  menu.style.display = 'flex';
});

/******************************************************
 * Initialisierung / Spiel starten
 ******************************************************/
function startGame() {
  // Menü ausblenden, Canvas einblenden
  menu.style.display = 'none';
  gameCanvas.style.display = 'block';
  endScreen.style.display = 'none';

  // Einstellungen auslesen
  difficulty = difficultySelect.value; // 'easy', 'medium', 'hard'
  maxPoints = parseInt(maxPointsInput.value, 10);
  soundOn = soundCheckbox.checked;
  userSide = sideChoiceSelect.value;   // 'left' oder 'right'

  // Schwierigkeitsgrade definieren
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

  // Schläger-Objekte
  let leftPaddle = {
    x: 0,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
  };
  let rightPaddle = {
    x: WIDTH - paddleWidth,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
  };

  // Abhängig von userSide definieren wir userPaddle und aiPaddle
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

  // Zeitstempel
  gameStartTime = performance.now();
  lastSpeedIncreaseTime = gameStartTime;

  // Steuerung aktivieren
  activateKeyboardControls();
  activateTouchControls();

  // Spiel starten
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

/******************************************************
 * Keyboard-Steuerung (Pfeiltasten)
 ******************************************************/
function activateKeyboardControls() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onKeyDown(e) {
  if (!gameRunning) return;

  // Pfeil hoch = 38, Pfeil runter = 40
  switch(e.keyCode) {
    case 38:
      userPaddle.dy = -paddleSpeed;
      break;
    case 40:
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
 * Touch-Steuerung (Handy/Tablet)
 ******************************************************/
function activateTouchControls() {
  gameCanvas.addEventListener('touchmove', onTouchMove);
}

function onTouchMove(e) {
  e.preventDefault(); // Verhindert Scrollen auf Handy
  if (!gameRunning || e.touches.length === 0) return;

  const touch = e.touches[0];
  const rect = gameCanvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;

  // Paddle zentrieren auf touchY
  userPaddle.y = touchY - paddleHeight / 2;

  // Begrenzungen
  if (userPaddle.y < 0) userPaddle.y = 0;
  if (userPaddle.y + paddleHeight > HEIGHT) {
    userPaddle.y = HEIGHT - paddleHeight;
  }
}

/******************************************************
 * Hauptschleife: gameLoop
 ******************************************************/
function gameLoop(timestamp) {
  if (!gameRunning) return;

  update(timestamp);
  draw();

  requestAnimationFrame(gameLoop);
}

/******************************************************
 * Logik: update
 ******************************************************/
function update(timestamp) {
  // Alle 60 Sekunden Ball schneller machen
  const elapsedSec = (timestamp - lastSpeedIncreaseTime) / 1000;
  if (elapsedSec >= 60) {
    ball.dx *= 1.2;
    ball.dy *= 1.2;
    lastSpeedIncreaseTime = timestamp;
  }

  // User-Paddle bewegen
  userPaddle.y += userPaddle.dy;
  // Begrenzungen
  if (userPaddle.y < 0) userPaddle.y = 0;
  if (userPaddle.y + paddleHeight > HEIGHT) {
    userPaddle.y = HEIGHT - paddleHeight;
  }

  // KI-Paddle bewegen
  let computerSpeed = paddleSpeed;
  if (difficulty === 'easy') {
    computerSpeed = paddleSpeed - 2;
  } else if (difficulty === 'hard') {
    computerSpeed = paddleSpeed + 2;
  }

  // Einfache KI: Paddle folgt dem Ball
  // (Der Computer steuert aiPaddle)
  if (ball.y < aiPaddle.y) {
    aiPaddle.y -= computerSpeed * 0.7;
  } else if (ball.y > aiPaddle.y + aiPaddle.height) {
    aiPaddle.y += computerSpeed * 0.7;
  }
  // Begrenzungen
  if (aiPaddle.y < 0) aiPaddle.y = 0;
  if (aiPaddle.y + paddleHeight > HEIGHT) {
    aiPaddle.y = HEIGHT - paddleHeight;
  }

  // Ball aktualisieren
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Kollision oben/unten
  if (ball.y < 0 || (ball.y + ball.height) > HEIGHT) {
    ball.dy *= -1;
    playSound();
  }

  // Prüfen, ob der Ball das userPaddle trifft
  if (checkCollision(ball, userPaddle)) {
    // Stoß nach "innen"
    if (userSide === 'left') {
      // Ball geht nach rechts
      ball.dx = Math.abs(ball.dx);
    } else {
      // Ball geht nach links
      ball.dx = -Math.abs(ball.dx);
    }
    addSpin(userPaddle);
    playSound();
  }

  // Prüfen, ob der Ball das aiPaddle trifft
  if (checkCollision(ball, aiPaddle)) {
    // Stoß nach "innen"
    if (userSide === 'left') {
      // AI ist rechts => Ball muss nach links
      ball.dx = -Math.abs(ball.dx);
    } else {
      // AI ist links => Ball muss nach rechts
      ball.dx = Math.abs(ball.dx);
    }
    addSpin(aiPaddle);
    playSound();
  }

  // Punktevergabe: Je nach userSide
  // Wenn Ball links rausgeht
  if (ball.x < 0) {
    if (userSide === 'left') {
      // User hat links verpasst => AI kriegt den Punkt
      aiScore++;
    } else {
      // AI ist links => User punktet
      userScore++;
    }
    resetBall();
  }
  // Wenn Ball rechts rausgeht
  if (ball.x + ball.width > WIDTH) {
    if (userSide === 'right') {
      // User hat rechts verpasst => AI kriegt den Punkt
      aiScore++;
    } else {
      // AI ist rechts => User punktet
      userScore++;
    }
    resetBall();
  }

  // Prüfen, ob das Spiel vorbei ist
  if (maxPoints > 0) {
    if (userScore >= maxPoints) {
      endGame(true);
    } else if (aiScore >= maxPoints) {
      endGame(false);
    }
  }
}

/******************************************************
 * Zeichnen: draw()
 ******************************************************/
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Paddles
  ctx.fillStyle = '#FFF';
  ctx.fillRect(userPaddle.x, userPaddle.y, userPaddle.width, userPaddle.height);
  ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);

  // Ball als Kreis
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

  // Spielstand
  // Wir zeigen "User: X - AI: Y" mittig oben in größerer Schrift
  ctx.font = '28px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`User: ${userScore} - AI: ${aiScore}`, WIDTH / 2, 40);
}

/******************************************************
 * Hilfsfunktionen
 ******************************************************/

function resetBall() {
  ball.x = WIDTH / 2 - ballSize / 2;
  ball.y = HEIGHT / 2 - ballSize / 2;
  ball.dx = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
  ball.dy = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
}

function playSound() {
  if (!soundOn) return;
  pingSound.currentTime = 0;
  pingSound.play();
}

function addSpin(paddle) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.height / 2;
  const distance = ballCenter - paddleCenter;
  ball.dy += distance * 0.1;
}

// Kollisions-Check
function checkCollision(b, p) {
  return (
    b.x < p.x + p.width &&
    b.x + b.width > p.x &&
    b.y < p.y + p.height &&
    b.y + b.height > p.y
  );
}

/**
 * endGame: wird aufgerufen, wenn maxPoints erreicht ist.
 * playerWon = true/false
 */
function endGame(playerWon) {
  gameRunning = false;
  gameCanvas.style.display = 'none';
  endScreen.style.display = 'block';

  // Events entfernen
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  gameCanvas.removeEventListener('touchmove', onTouchMove);

  if (playerWon) {
    endTitle.textContent = 'Glückwunsch!';
    endMessage.textContent = `Du hast ${userScore}:${aiScore} gewonnen.`;

    // Highscore
    if (userScore > storedHighscore) {
      localStorage.setItem('pongHighscore', userScore);
      storedHighscore = userScore;
    }
  } else {
    endTitle.textContent = 'Verloren!';
    endMessage.textContent = `Der Computer hat ${aiScore}:${userScore} gewonnen.`;

    // Vielleicht will man den Highscore nur erhöhen, wenn man gewinnt.
    // Falls du stattdessen die userScore immer speicherst (z.B. "Best Score"):
    if (userScore > storedHighscore) {
      localStorage.setItem('pongHighscore', userScore);
      storedHighscore = userScore;
    }
  }

  highscoreDisplay.textContent = storedHighscore;
}

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

// Audio
const pingSound = document.getElementById('pingSound');

// Canvas
const ctx = gameCanvas.getContext('2d');
const WIDTH = gameCanvas.width;
const HEIGHT = gameCanvas.height;

// Paddles
const paddleWidth = 10;
const paddleHeight = 80;

// Ball
const ballSize = 10;

// Variablen für Spiel-Status
let leftPaddle, rightPaddle, ball;
let leftScore = 0;
let rightScore = 0;
let paddleSpeed, ballSpeed;
let maxPoints;
let difficulty;
let soundOn;
let gameRunning = false;
let gameStartTime = 0;
let lastSpeedIncreaseTime = 0;

// Highscore aus localStorage laden (oder 0, falls nichts gespeichert)
let storedHighscore = parseInt(localStorage.getItem('pongHighscore'), 10) || 0;
highscoreDisplay.textContent = storedHighscore;

/******************************************************
 * Event Listener für Buttons
 ******************************************************/
startBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  // Endscreen ausblenden, Menü einblenden
  endScreen.style.display = 'none';
  menu.style.display = 'flex';
});

/******************************************************
 * Initialisierung
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
  
  // Schwierigkeitsgrade definieren (Computer-Geschwindigkeit, Start-Ballgeschwindigkeit)
  switch(difficulty) {
    case 'easy':
      paddleSpeed = 5;   // Spieler
      ballSpeed = 4;     // Ball
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

  // Scores zurücksetzen
  leftScore = 0;
  rightScore = 0;

  // Paddles positionieren
  leftPaddle = {
    x: 0,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
  };
  rightPaddle = {
    x: WIDTH - paddleWidth,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0 // Wird von Computer gesteuert
  };

  // Ball initialisieren
  ball = {
    x: WIDTH / 2 - ballSize / 2,
    y: HEIGHT / 2 - ballSize / 2,
    width: ballSize,
    height: ballSize,
    dx: (Math.random() < 0.5 ? 1 : -1) * ballSpeed,
    dy: (Math.random() < 0.5 ? 1 : -1) * ballSpeed
  };

  // Zeitstempel setzen
  gameStartTime = performance.now();
  lastSpeedIncreaseTime = gameStartTime;

  // Input-Events registrieren
  activateKeyboardControls();
  activateTouchControls();

  // Spiel starten
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

/******************************************************
 * Key-Events (Pfeiltasten) aktivieren
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
      leftPaddle.dy = -paddleSpeed;
      break;
    case 40:
      leftPaddle.dy = paddleSpeed;
      break;
  }
}

function onKeyUp(e) {
  if (!gameRunning) return;

  switch(e.keyCode) {
    case 38:
    case 40:
      leftPaddle.dy = 0;
      break;
  }
}

/******************************************************
 * Touch-Events (Mobile) aktivieren
 ******************************************************/
function activateTouchControls() {
  // Wenn der Nutzer den Finger auf dem Canvas bewegt,
  // setzen wir das Paddle zentriert auf die Touch-Y-Position
  gameCanvas.addEventListener('touchmove', onTouchMove);
  // Optional: bei touchstart / touchend könnte man noch andere Dinge machen
}

function onTouchMove(e) {
  // Verhindert Scrollen oder andere Touch-Effekte im Browser
  e.preventDefault();
  
  if (!gameRunning || e.touches.length === 0) return;

  // Nur den ersten Finger berücksichtigen
  const touch = e.touches[0];
  // Position relativ zum Canvas bestimmen
  const rect = gameCanvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;

  // Paddle zentrieren auf touchY
  leftPaddle.y = touchY - paddleHeight / 2;
  
  // Begrenzungen beachten
  if (leftPaddle.y < 0) leftPaddle.y = 0;
  if (leftPaddle.y + paddleHeight > HEIGHT) {
    leftPaddle.y = HEIGHT - paddleHeight;
  }
}

/******************************************************
 * Hauptspiel-Schleife
 ******************************************************/
function gameLoop(timestamp) {
  if (!gameRunning) return;

  update(timestamp);
  draw();

  requestAnimationFrame(gameLoop);
}

/******************************************************
 * Logik: Aktualisieren
 ******************************************************/
function update(timestamp) {
  // Alle 60 Sekunden Ball schneller machen
  const elapsedSec = (timestamp - lastSpeedIncreaseTime) / 1000;
  if (elapsedSec >= 60) {
    // Ballgeschwindigkeit erhöhen
    ball.dx *= 1.2;
    ball.dy *= 1.2;
    lastSpeedIncreaseTime = timestamp;
  }

  // Paddles aktualisieren (Spieler links)
  leftPaddle.y += leftPaddle.dy;
  // Begrenzungen
  if (leftPaddle.y < 0) leftPaddle.y = 0;
  if (leftPaddle.y + paddleHeight > HEIGHT) leftPaddle.y = HEIGHT - paddleHeight;

  // Computer-Logik (rechtes Paddle)
  let computerSpeed = paddleSpeed;
  if (difficulty === 'easy') {
    computerSpeed = paddleSpeed - 2;
  } else if (difficulty === 'hard') {
    computerSpeed = paddleSpeed + 2;
  }

  // Simple KI: Paddle folgt dem Ball
  if (ball.y < rightPaddle.y) {
    rightPaddle.y -= computerSpeed * 0.7; 
  } else if (ball.y > rightPaddle.y + rightPaddle.height) {
    rightPaddle.y += computerSpeed * 0.7;
  }
  // Begrenzungen
  if (rightPaddle.y < 0) rightPaddle.y = 0;
  if (rightPaddle.y + paddleHeight > HEIGHT) rightPaddle.y = HEIGHT - paddleHeight;

  // Ball aktualisieren
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Ball-Kollision oben/unten
  if (ball.y < 0 || ball.y + ball.height > HEIGHT) {
    ball.dy *= -1;
    playSound();
  }

  // Ball-Kollision mit linkem Paddle
  if (
    ball.x <= leftPaddle.x + leftPaddle.width &&
    ball.y + ball.height >= leftPaddle.y &&
    ball.y <= leftPaddle.y + leftPaddle.height
  ) {
    ball.dx = Math.abs(ball.dx); // Ball nach rechts leiten
    addSpin(leftPaddle);
    playSound();
  }

  // Ball-Kollision mit rechtem Paddle
  if (
    ball.x + ball.width >= rightPaddle.x &&
    ball.y + ball.height >= rightPaddle.y &&
    ball.y <= rightPaddle.y + rightPaddle.height
  ) {
    ball.dx = -Math.abs(ball.dx); // Ball nach links leiten
    addSpin(rightPaddle);
    playSound();
  }

  // Ball aus dem linken Spielfeld raus -> Punkt Computer
  if (ball.x < 0) {
    rightScore++;
    resetBall();
  }

  // Ball aus dem rechten Spielfeld raus -> Punkt Spieler
  if (ball.x + ball.width > WIDTH) {
    leftScore++;
    resetBall();
  }

  // Prüfen, ob das Spiel vorbei ist (falls maxPoints != 0)
  if (maxPoints > 0) {
    if (leftScore >= maxPoints) {
      endGame(true);
    } else if (rightScore >= maxPoints) {
      endGame(false);
    }
  }
}

/******************************************************
 * Zeichnen
 ******************************************************/
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
  
    // Paddles
    ctx.fillStyle = '#FFF';
    ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);
  
    // Ball
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height); // <-- DAS musst du ersetzen!
  
    // Scores
    ctx.font = '20px Arial';
    ctx.fillText(`${leftScore}`, WIDTH / 4, 30);
    ctx.fillText(`${rightScore}`, (WIDTH * 3) / 4, 30);
  }
  
/******************************************************
 * Hilfsfunktionen
 ******************************************************/

function resetBall() {
  ball.x = WIDTH / 2 - ballSize / 2;
  ball.y = HEIGHT / 2 - ballSize / 2;
  // Richtung zufällig
  ball.dx = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
  ball.dy = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
}

function playSound() {
  if (!soundOn) return;
  pingSound.currentTime = 0;
  pingSound.play();
}

// Erzeugt leichten "Spin", je nachdem, wo der Ball das Paddle trifft
function addSpin(paddle) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.height / 2;
  const distance = ballCenter - paddleCenter;
  // Je größer der Abstand, desto stärker die Änderung in dy
  ball.dy += distance * 0.1;
}

// Spielende
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
    endMessage.textContent = `Du hast ${leftScore}:${rightScore} gewonnen.`;
    // Highscore erhöhen
    if (leftScore > storedHighscore) {
      localStorage.setItem('pongHighscore', leftScore);
      storedHighscore = leftScore;
    }
  } else {
    endTitle.textContent = 'Verloren!';
    endMessage.textContent = `Der Computer hat ${rightScore}:${leftScore} gewonnen.`;
    // Ggf. Highscore checken
    if (leftScore > storedHighscore) {
      localStorage.setItem('pongHighscore', leftScore);
      storedHighscore = leftScore;
    }
  }

  highscoreDisplay.textContent = storedHighscore;
}

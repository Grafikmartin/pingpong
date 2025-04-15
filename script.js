/******************************************************
 * script.js
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

// Canvas und Kontext
const ctx = gameCanvas.getContext('2d');
const WIDTH = gameCanvas.width;
const HEIGHT = gameCanvas.height;

// Schläger (Paddles)
const paddleWidth = 10;
const paddleHeight = 80;

// Ball
const ballSize = 10; // Durchmesser

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

// Beim Laden: Endscreen verstecken, Highscore anzeigen
endScreen.style.display = 'none';
highscoreDisplay.textContent = storedHighscore;

/******************************************************
 * Events
 ******************************************************/

// "Spiel starten" aus dem Menü
startBtn.addEventListener('click', () => {
  startGame();
});

// "Nochmal spielen" aus dem Endscreen
restartBtn.addEventListener('click', () => {
  // Endscreen ausblenden, Menü wieder zeigen
  endScreen.style.display = 'none';
  menu.style.display = 'flex';
});

/******************************************************
 * Spiel starten
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
  switch (difficulty) {
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

  // Paddles initialisieren
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
    dy: 0 // Wird per KI gesteuert
  };

  // Ball initialisieren
  ball = {
    // Wir nehmen ballSize als Durchmesser
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
  switch (e.keyCode) {
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
  switch (e.keyCode) {
    case 38:
    case 40:
      leftPaddle.dy = 0;
      break;
  }
}

/******************************************************
 * Touch-Steuerung (Handy/Tablet)
 ******************************************************/
function activateTouchControls() {
  // Fingerbewegung auf dem Canvas -> Paddle verschieben
  gameCanvas.addEventListener('touchmove', onTouchMove);
}

function onTouchMove(e) {
  e.preventDefault(); // verhindert Scrollen auf Handy
  if (!gameRunning || e.touches.length === 0) return;

  const touch = e.touches[0];
  const rect = gameCanvas.getBoundingClientRect();
  const touchY = touch.clientY - rect.top;

  // Paddle zentrieren auf touchY
  leftPaddle.y = touchY - paddleHeight / 2;

  // Begrenzungen
  if (leftPaddle.y < 0) leftPaddle.y = 0;
  if (leftPaddle.y + paddleHeight > HEIGHT) {
    leftPaddle.y = HEIGHT - paddleHeight;
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

  // Linkes Paddle (Spieler)
  leftPaddle.y += leftPaddle.dy;
  // Begrenzungen
  if (leftPaddle.y < 0) leftPaddle.y = 0;
  if (leftPaddle.y + paddleHeight > HEIGHT) leftPaddle.y = HEIGHT - paddleHeight;

  // Rechtes Paddle (Computer-Gegner)
  let computerSpeed = paddleSpeed;
  if (difficulty === 'easy') {
    computerSpeed = paddleSpeed - 2;
  } else if (difficulty === 'hard') {
    computerSpeed = paddleSpeed + 2;
  }

  // Einfacher Algorithmus: Paddle folgt dem Ball
  if (ball.y < rightPaddle.y) {
    rightPaddle.y -= computerSpeed * 0.7;
  } else if (ball.y > rightPaddle.y + rightPaddle.height) {
    rightPaddle.y += computerSpeed * 0.7;
  }
  // Begrenzungen
  if (rightPaddle.y < 0) rightPaddle.y = 0;
  if (rightPaddle.y + paddleHeight > HEIGHT) {
    rightPaddle.y = HEIGHT - paddleHeight;
  }

  // Ball bewegen
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Kollision oben/unten
  if (ball.y < 0 || (ball.y + ball.height) > HEIGHT) {
    ball.dy *= -1;
    playSound();
  }

  // Kollision mit linkem Paddle
  if (
    ball.x <= leftPaddle.x + leftPaddle.width &&
    ball.y + ball.height >= leftPaddle.y &&
    ball.y <= leftPaddle.y + leftPaddle.height
  ) {
    ball.dx = Math.abs(ball.dx); // nach rechts
    addSpin(leftPaddle);
    playSound();
  }

  // Kollision mit rechtem Paddle
  if (
    ball.x + ball.width >= rightPaddle.x &&
    ball.y + ball.height >= rightPaddle.y &&
    ball.y <= rightPaddle.y + rightPaddle.height
  ) {
    ball.dx = -Math.abs(ball.dx); // nach links
    addSpin(rightPaddle);
    playSound();
  }

  // Ball aus linker Seite raus -> Punkt Computer
  if (ball.x < 0) {
    rightScore++;
    resetBall();
  }

  // Ball aus rechter Seite raus -> Punkt Spieler
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
 * Zeichnen: draw()
 ******************************************************/
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Paddles
  ctx.fillStyle = '#FFF';
  ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
  ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

  // Ball als Kreis
  ctx.beginPath();
  // ball.width == ballSize (Durchmesser), radius = ballSize/2
  ctx.arc(
    ball.x + ball.width / 2,
    ball.y + ball.height / 2,
    ball.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.closePath();

  // Scores
  ctx.font = '20px Arial';
  ctx.fillText(`${leftScore}`, WIDTH / 4, 30);
  ctx.fillText(`${rightScore}`, (WIDTH * 3) / 4, 30);
}

/******************************************************
 * Hilfsfunktionen
 ******************************************************/

// Ball neu positionieren nach Punkt
function resetBall() {
  ball.x = WIDTH / 2 - ballSize / 2;
  ball.y = HEIGHT / 2 - ballSize / 2;
  // Richtung zufällig
  ball.dx = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
  ball.dy = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
}

// Sound
function playSound() {
  if (!soundOn) return;
  pingSound.currentTime = 0;
  pingSound.play();
}

// Spin, je nachdem wo der Ball das Paddle trifft
function addSpin(paddle) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.height / 2;
  const distance = ballCenter - paddleCenter;
  ball.dy += distance * 0.1;
}

// Spielende: Endscreen anzeigen
function endGame(playerWon) {
  gameRunning = false;
  gameCanvas.style.display = 'none';
  endScreen.style.display = 'block';

  // Events entfernen (damit nach dem Spiel kein Durcheinander entsteht)
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  gameCanvas.removeEventListener('touchmove', onTouchMove);

  if (playerWon) {
    endTitle.textContent = 'Glückwunsch!';
    endMessage.textContent = `Du hast ${leftScore}:${rightScore} gewonnen.`;

    // Highscore updaten, falls nötig
    if (leftScore > storedHighscore) {
      localStorage.setItem('pongHighscore', leftScore);
      storedHighscore = leftScore;
    }

  } else {
    endTitle.textContent = 'Verloren!';
    endMessage.textContent = `Der Computer hat ${rightScore}:${leftScore} gewonnen.`;

    // Auch hier Highscore prüfen, wenn gewünscht
    if (leftScore > storedHighscore) {
      localStorage.setItem('pongHighscore', leftScore);
      storedHighscore = leftScore;
    }
  }

  highscoreDisplay.textContent = storedHighscore;
}

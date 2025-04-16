/******************************************************
 * script.js – Mit Pause, rotem Streifen an Austrittsstelle,
 * Wahl links/rechts, Highscore, Touch & Keyboard, usw.
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

// Canvas-Kontext
const ctx = gameCanvas.getContext('2d');
const WIDTH = gameCanvas.width;
const HEIGHT = gameCanvas.height;

// Paddles
const paddleWidth = 10;
const paddleHeight = 80;

// Ball
const ballSize = 10; // Durchmesser

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

// Zeit / Geschwindigkeit
let gameStartTime = 0;
let lastSpeedIncreaseTime = 0;

// Highscore
let storedHighscore = parseInt(localStorage.getItem('pongHighscore'), 10) || 0;
highscoreDisplay.textContent = storedHighscore;

// Paddles und Ball
let userPaddle, aiPaddle, ball;

// "Roter Streifen" bei Punktverlust
// - wir zeichnen nur dort, wo der Ball wirklich rausging
let flashX = null;   // x-Koordinate (0 oder WIDTH)
let flashY = null;   // y-Koordinate (Ballhöhe) 
let flashTimer = 0;  // frames, in denen die Linie sichtbar ist

// Endscreen und Pause-Button anfangs ausblenden
endScreen.style.display = 'none';
pauseBtn.style.display = 'none';

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
  pauseBtn.textContent = isPaused ? '▶ Weiter' : '⏸ Pause';
});

/******************************************************
 * startGame
 ******************************************************/
function startGame() {
  // Menü ausblenden, Canvas und Pause-Button anzeigen
  menu.style.display = 'none';
  gameCanvas.style.display = 'block';
  pauseBtn.style.display = 'block';
  pauseBtn.textContent = '⏸ Pause';
  endScreen.style.display = 'none';
  isPaused = false;

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
    dy: 0
  };
  let rightPaddle = {
    x: WIDTH - paddleWidth,
    y: HEIGHT / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
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

  // Steuerung
  activateKeyboardControls();
  activateTouchControls();

  // Los geht's
  gameRunning = true;
  requestAnimationFrame(gameLoop);
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
  // Ballbeschleunigung alle 60 Sek.
  const elapsedSec = (timestamp - lastSpeedIncreaseTime) / 1000;
  if (elapsedSec >= 60) {
    ball.dx *= 1.2;
    ball.dy *= 1.2;
    lastSpeedIncreaseTime = timestamp;
  }

  // User-Paddle
  userPaddle.y += userPaddle.dy;
  if (userPaddle.y < 0) userPaddle.y = 0;
  if (userPaddle.y + paddleHeight > HEIGHT) {
    userPaddle.y = HEIGHT - paddleHeight;
  }

  // AI-Paddle
  let computerSpeed = paddleSpeed;
  if (difficulty === 'easy') {
    computerSpeed = paddleSpeed - 2;
  } else if (difficulty === 'hard') {
    computerSpeed = paddleSpeed + 2;
  }

  // Einfacher KI-Algorithmus
  if (ball.y < aiPaddle.y) {
    aiPaddle.y -= computerSpeed * 0.7;
  } else if (ball.y > aiPaddle.y + aiPaddle.height) {
    aiPaddle.y += computerSpeed * 0.7;
  }
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
    if (userSide === 'left') {
      // User hat verpasst -> AI Punkt
      aiScore++;
      // Roter Streifen genau dort, wo der Ball rausging
      flashX = 0;
    } else {
      // AI ist links -> User Punkt
      userScore++;
      flashX = 0;
    }
    // Y-Position = Ballmitte (zur Zeit des Austritts)
    flashY = ball.y + ball.height / 2;
    flashTimer = 20; // 20 Frames
    resetBall();
  }

  // Ball rechts raus
  if (ball.x + ball.width > WIDTH) {
    if (userSide === 'right') {
      // User hat verpasst -> AI Punkt
      aiScore++;
      flashX = WIDTH;
    } else {
      // AI ist rechts -> User Punkt
      userScore++;
      flashX = WIDTH;
    }
    flashY = ball.y + ball.height / 2;
    flashTimer = 20;
    resetBall();
  }

  // Siegbedingung
  if (maxPoints > 0) {
    if (userScore >= maxPoints) {
      endGame(true);
    } else if (aiScore >= maxPoints) {
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

  // Score oben
  ctx.font = '28px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`User: ${userScore} - AI: ${aiScore}`, WIDTH / 2, 40);

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
  ball.dx = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
  ball.dy = (Math.random() < 0.5 ? 1 : -1) * ballSpeed;
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

function endGame(playerWon) {
  gameRunning = false;
  gameCanvas.style.display = 'none';
  pauseBtn.style.display = 'none'; // Pause-Button ausblenden
  endScreen.style.display = 'block';

  // Events entfernen
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  gameCanvas.removeEventListener('touchmove', onTouchMove);

  if (playerWon) {
    endTitle.textContent = 'Glückwunsch!';
    endMessage.textContent = `Du hast ${userScore}:${aiScore} gewonnen.`;
    if (userScore > storedHighscore) {
      localStorage.setItem('pongHighscore', userScore);
      storedHighscore = userScore;
    }
  } else {
    endTitle.textContent = 'Verloren!';
    endMessage.textContent = `Der Computer hat ${aiScore}:${userScore} gewonnen.`;
    if (userScore > storedHighscore) {
      localStorage.setItem('pongHighscore', userScore);
      storedHighscore = userScore;
    }
  }

  highscoreDisplay.textContent = storedHighscore;
}

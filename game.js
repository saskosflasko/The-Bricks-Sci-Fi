document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 800;
  canvas.height = 600;

  const scoreElem = document.getElementById("score");
  const timeElem = document.getElementById("time");
  const levelElem = document.getElementById("level");
  const bestScoreElem = document.getElementById("bestScore");
  const leaderboardElem = document.getElementById("leaderboardList");

  const toggleBtn = document.getElementById("toggleBtn");
  const resetBtn = document.getElementById("resetBtn");

  let score = 0;
  let timeElapsed = 0;
  let level = 1;
  let gameInterval;
  let timerInterval;
  let gameRunning = false;

  let ballRadius = 8;
  let ballX = canvas.width / 2;
  let ballY = canvas.height - 30;
  let ballSpeed = 4;
  let ballDX = ballSpeed;
  let ballDY = -ballSpeed;

  let paddleHeight = 15;
  let paddleWidth = 100;
  let paddleX = (canvas.width - paddleWidth) / 2;
  let paddleY = canvas.height - paddleHeight - 10;
  let paddleSpeed = 7;
  let rightPressed = false;
  let leftPressed = false;

  let brickRowCount = 5;
  let brickColumnCount = 8;
  let brickWidth = 75;
  let brickHeight = 20;
  let brickPadding = 10;
  let brickOffsetTop = 30;
  let brickOffsetLeft = 30;
  let bricks = [];

  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        let isBonus = Math.random() < 0.2;
        bricks[c][r] = { x: 0, y: 0, status: 1, isBonus: isBonus };
      }
    }
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#00ffff";
    ctx.fill();
    ctx.closePath();
  }

  function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#00ffff";
    ctx.fill();
    ctx.closePath();
  }

  function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        if (bricks[c][r].status === 1) {
          let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
          let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
          bricks[c][r].x = brickX;
          bricks[c][r].y = brickY;
          ctx.beginPath();
          ctx.rect(brickX, brickY, brickWidth, brickHeight);
          ctx.fillStyle = bricks[c][r].isBonus ? "#ff0066" : "#00ffff";
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  }

  function updateStats() {
    scoreElem.textContent = "Score: " + score;
    timeElem.textContent = "Time: " + timeElapsed + " s";
    levelElem.textContent = "Level: " + level;
    bestScoreElem.textContent = "Best: " + getBestScore();
    updateLeaderboardDisplay();
  }

  function getBestScore() {
    if (leaderboard.length === 0) return 0;
    return leaderboard[0].score;
  }

  function updateLeaderboard() {
    leaderboard.push({ score: score, time: timeElapsed });
    leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  }

  function updateLeaderboardDisplay() {
    leaderboardElem.innerHTML = "";
    leaderboard.forEach((entry, index) => {
      const li = document.createElement("li");
      li.textContent = `${entry.score} pts – ${entry.time}s`;
    leaderboardElem.appendChild(li);
    });
  }

  function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        let b = bricks[c][r];
        if (b.status === 1) {
          let closestX = clamp(ballX, b.x, b.x + brickWidth);
          let closestY = clamp(ballY, b.y, b.y + brickHeight);
          let distanceX = ballX - closestX;
          let distanceY = ballY - closestY;
          if ((distanceX * distanceX) + (distanceY * distanceY) < (ballRadius * ballRadius)) {
            if (Math.abs(distanceX) > Math.abs(distanceY)) {
              ballDX = -ballDX;
            } else {
              ballDY = -ballDY;
            }
            b.status = 0;
            score += b.isBonus ? 20 : 10;
            updateStats();
            if (allBricksCleared()) {
              levelUp();
            }
          }
        }
      }
    }
  }

  function allBricksCleared() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        if (bricks[c][r].status === 1) {
          return false;
        }
      }
    }
    return true;
  }

  function levelUp() {
    level++;
    ballSpeed += 1;
    ballDX = ballDX > 0 ? ballSpeed : -ballSpeed;
    ballDY = ballDY > 0 ? ballSpeed : -ballSpeed;
    initBricks();
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    paddleX = (canvas.width - paddleWidth) / 2;
    updateStats();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    collisionDetection();

    ballX += ballDX;
    ballY += ballDY;

    if (ballX + ballRadius > canvas.width || ballX - ballRadius < 0) {
      ballDX = -ballDX;
    }
    if (ballY - ballRadius < 0) {
      ballDY = -ballDY;
    }
    if (ballY + ballRadius > canvas.height) {
      endGame();
    }

    if (
      ballY + ballRadius >= paddleY &&
      ballX > paddleX &&
      ballX < paddleX + paddleWidth
    ) {
      ballDY = -ballDY;
      let hitPoint = ballX - (paddleX + paddleWidth / 2);
      ballDX = hitPoint * 0.15;
    }

    if (rightPressed && paddleX < canvas.width - paddleWidth) {
      paddleX += paddleSpeed;
    } else if (leftPressed && paddleX > 0) {
      paddleX -= paddleSpeed;
    }
  }

  function startGame() {
    if (!gameRunning) {
      gameRunning = true;
      gameInterval = setInterval(draw, 20);
      timerInterval = setInterval(() => {
        timeElapsed++;
        updateStats();
      }, 1000);
    }
  }

  function pauseGame() {
    if (gameRunning) {
      clearInterval(gameInterval);
      clearInterval(timerInterval);
      gameRunning = false;
    }
  }

  function resetGame() {
    pauseGame();
    score = 0;
    timeElapsed = 0;
    level = 1;
    ballSpeed = 4;
    ballDX = ballSpeed;
    ballDY = -ballSpeed;
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    paddleX = (canvas.width - paddleWidth) / 2;
    initBricks();
    updateStats();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
  }

  function endGame() {
    pauseGame();
    updateLeaderboard();
    swal({
      title: "Game Over!",
      text: `Your score: ${score}\nTime: ${timeElapsed}s`,
      icon: "error",
      button: "Ok",
    }).then(() => {
      toggleBtn.textContent = "Start";
      resetGame();
    });
  }

  document.addEventListener("keydown", function(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
      rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
      leftPressed = true;
    } else if (e.key === " ") {
      if (gameRunning) {
        pauseGame();
        toggleBtn.textContent = "Start";
      } else {
        startGame();
        toggleBtn.textContent = "Pause";
      }
    }
  });

  document.addEventListener("keyup", function(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
      rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
      leftPressed = false;
    }
  });

  toggleBtn.addEventListener("click", function() {
    if (gameRunning) {
      pauseGame();
      toggleBtn.textContent = "Start";
    } else {
      startGame();
      toggleBtn.textContent = "Pause";
    }
  });

  resetBtn.addEventListener("click", function() {
    resetGame();
    toggleBtn.textContent = "Start";
  });

  document.getElementById("aboutBtn").addEventListener("click", function () {
    swal({
      title: "Avtor igre",
      text: "Avtor: Sašo Simčič, 4.RB",
      icon: "info",
      button: "Zapri"
    });
  });

  document.getElementById("rulesBtn").addEventListener("click", function () {
    swal({
      title: "Pravila igre",
      text: "Premikaj plošček s puščicama levo/desno.\nRazbijaj opeke z žogico.\nIzgubiš, če ti žogica pade mimo ploščka.\nRazbij vse opeke za zmago!",
      icon: "info",
      button: "Razumem"
    });
  });

  initBricks();
  updateStats();
  drawBricks();
  drawBall();
  drawPaddle();
});

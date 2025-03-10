let paddle;
let mainBall;
let streamBalls = [];
let score = 0;
let lives = 3;
let gameStarted = false;
let gameOver = false;
let aimAngle = -Math.PI/4; // Start aiming up-right
let bricks = [];

function setup() {
  createCanvas(600, 400);
  paddle = new Paddle();
  mainBall = new Ball();
  mainBall.isMain = true;
  initializeBricks();
}

function draw() {
  background(30);
  
  if (gameOver) {
    displayGameOver();
    return;
  }
  
  paddle.show();
  paddle.move();
  
  // Draw aiming line if game not started
  if (!gameStarted) {
    stroke(255);
    strokeWeight(2);
    let lineLength = 100;
    line(mainBall.x, mainBall.y, 
         mainBall.x + cos(aimAngle) * lineLength, 
         mainBall.y + sin(aimAngle) * lineLength);
    strokeWeight(1);
    noStroke();
    
    // Adjust aim angle with arrow keys
    if (keyIsDown(LEFT_ARROW)) aimAngle -= 0.05;
    if (keyIsDown(RIGHT_ARROW)) aimAngle += 0.05;
    // Clamp angle to reasonable range (upward directions)
    aimAngle = constrain(aimAngle, -PI, 0);
  }
  
  // Handle main ball
  mainBall.show();
  if (gameStarted) {
    mainBall.move();
    mainBall.bounce();
  } else {
    // Position ball on paddle before launch
    mainBall.x = paddle.x + paddle.w/2;
    mainBall.y = paddle.y - mainBall.r;
  }
  
  // Handle stream balls
  for (let i = streamBalls.length - 1; i >= 0; i--) {
    streamBalls[i].show();
    if (gameStarted) {
      streamBalls[i].move();
      streamBalls[i].bounce();
    } else {
      // Remove balls if game not started
      streamBalls.splice(i, 1);
    }
  }
  
  // Show bricks
  for (let brick of bricks) {
    brick.show();
  }
  
  // Check ball-brick collisions
  checkBrickCollisions();

  // Display score and lives
  fill(255);
  textSize(16);
  text(`Score: ${score}`, 10, 20);
  text(`Lives: ${lives}`, 10, 40);
  
  // Instructions
  if (!gameStarted) {
    textAlign(CENTER);
    text("Use LEFT/RIGHT arrows to aim, SPACE to launch", width/2, height - 50);
    textAlign(LEFT);
  }
}

function keyPressed() {
  if (keyCode === 32) { // Space bar
    if (gameOver) {
      // Restart game
      resetGame();
      return;
    }
    
    if (!gameStarted) {
      gameStarted = true;
      mainBall.dx = cos(aimAngle) * 5;
      mainBall.dy = sin(aimAngle) * 5;
    }
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  gameStarted = false;
  gameOver = false;
  streamBalls = [];
  mainBall = new Ball();
  mainBall.isMain = true;
  initializeBricks();
}

function displayGameOver() {
  background(30);
  fill(255);
  textSize(32);
  textAlign(CENTER);
  text("GAME OVER", width/2, height/2 - 40);
  textSize(24);
  text(`Final Score: ${score}`, width/2, height/2);
  textSize(16);
  text("Press SPACE to play again", width/2, height/2 + 40);
  textAlign(LEFT);
}

function initializeBricks() {
  bricks = []; // Clear existing bricks
  let types = ['green', 'pink', 'blue'];
  let hitPoints = { 'green': 34, 'pink': 26, 'blue': 14 };
  
  // Create a grid to track occupied positions
  let grid = [];
  for (let x = 50; x < width - 50; x += 60) {
    for (let y = 50; y < 150; y += 30) {
      // Random chance to place a brick (70%)
      if (random() < 0.7) {
        let type = random(types);
        let hp = hitPoints[type];
        let brickX = x + 25;
        let brickY = y + 10;
        bricks.push(new Brick(brickX, brickY, hp, type));
        // Mark position as occupied
        grid.push({x: brickX, y: brickY});
      }
    }
  }
  
  // Spawn random balls in empty spaces (20% chance per empty space)
  for (let x = 50; x < width - 50; x += 60) {
    for (let y = 50; y < 150; y += 30) {
      let posX = x + 25;
      let posY = y + 10;
      
      // Check if position is empty
      let isEmpty = !grid.some(pos => 
        Math.abs(pos.x - posX) < 30 && Math.abs(pos.y - posY) < 15
      );
      
      // 20% chance to spawn a ball in empty space
      if (isEmpty && random() < 0.2) {
        let newBall = new Ball(posX, posY);
        newBall.spawnedBall = true;
        streamBalls.push(newBall);
      }
    }
  }
}

function addStreamBall() {
  // Create a new ball at the brick position
  let pos = getRandomBrickPosition();
  let newBall = new Ball(pos.x, pos.y);
  
  // Only move the ball once the game has started
  if (gameStarted) {
    // Give the new ball a similar trajectory to the main ball
    let speed = sqrt(mainBall.dx*mainBall.dx + mainBall.dy*mainBall.dy);
    let angle = atan2(mainBall.dy, mainBall.dx) + random(-0.2, 0.2);
    newBall.dx = cos(angle) * speed;
    newBall.dy = sin(angle) * speed;
  }
  
  newBall.spawnedBall = true;
  streamBalls.push(newBall);
}

function getRandomBrickPosition() {
  // If there are bricks, choose a random one's position
  if (bricks.length > 0) {
    let brick = random(bricks);
    return { x: brick.x, y: brick.y };
  } 
  // Otherwise use a default position in the brick area
  return { 
    x: random(50, width - 50), 
    y: random(50, 150) 
  };
}

function checkBrickCollisions() {
  // Check all balls for brick collisions
  let allBalls = [mainBall, ...streamBalls];
  
  for (let i = bricks.length - 1; i >= 0; i--) {
    let brickHit = false;
    
    for (let ball of allBalls) {
      if (checkBallBrickCollision(ball, bricks[i]) && !brickHit) {
        // Brick was hit
        brickHit = true;
        bricks[i].hp--;
        score += 10;
        
        // If brick is destroyed, add a random ball that will be added to stream
        if (bricks[i].hp <= 0) {
          // Store position before removing the brick
          let pos = {x: bricks[i].x, y: bricks[i].y};
          
          // Remove the brick
          bricks.splice(i, 1);
          
          // Add a stream ball at the brick's position
          let newBall = new Ball(pos.x, pos.y);
          newBall.spawnedBall = true;
          
          // If game has started, give the ball movement
          if (gameStarted) {
            let speed = sqrt(mainBall.dx*mainBall.dx + mainBall.dy*mainBall.dy);
            let angle = atan2(mainBall.dy, mainBall.dx) + random(-0.2, 0.2);
            newBall.dx = cos(angle) * speed;
            newBall.dy = sin(angle) * speed;
          }
          
          streamBalls.push(newBall);
        }
        
        break; // Only count one hit per brick per frame
      }
    }
  }
  
  // Check if all bricks are cleared
  if (bricks.length === 0) {
    // Initialize new level with more bricks
    initializeBricks();
  }
}

function checkBallBrickCollision(ball, brick) {
  // AABB Collision for square bricks
  let halfBrickSize = brick.size / 2;
  
  // Check if ball overlaps with brick
  if (ball.x + ball.r > brick.x - halfBrickSize && 
      ball.x - ball.r < brick.x + halfBrickSize &&
      ball.y + ball.r > brick.y - halfBrickSize && 
      ball.y - ball.r < brick.y + halfBrickSize) {
    
    // Calculate which side of the brick was hit
    let dx = (ball.x - brick.x) / halfBrickSize;
    let dy = (ball.y - brick.y) / halfBrickSize;
    
    // Determine if collision is more horizontal or vertical
    if (abs(dx) > abs(dy)) {
      ball.dx = abs(ball.dx) * (dx > 0 ? 1 : -1);
    } else {
      ball.dy = abs(ball.dy) * (dy > 0 ? 1 : -1);
    }
    
    return true;
  }
  return false;
}

class Paddle {
  constructor() {
    this.w = 80;
    this.h = 10;
    this.x = width / 2 - this.w / 2;
    this.y = height - 30;
  }
  
  show() { 
    fill(255); 
    rect(this.x, this.y, this.w, this.h); 
  }
  
  move() {
    if (keyIsDown(LEFT_ARROW) && this.x > 0) this.x -= 5;
    if (keyIsDown(RIGHT_ARROW) && this.x < width - this.w) this.x += 5;
  }
}

class Ball {
  constructor(x = width / 2, y = height - 40) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.dx = 0;
    this.dy = 0;
    this.isMain = false;
    this.spawnedBall = false;
  }
  
  show() { 
    fill(255); // White ball
    ellipse(this.x, this.y, this.r * 2);
    
    // If this is a spawned ball, draw a dotted circle around it
    if (this.spawnedBall) {
      push();
      stroke(255);
      strokeWeight(1);
      noFill();
      drawingContext.setLineDash([2, 2]);
      ellipse(this.x, this.y, this.r * 2.5);
      drawingContext.setLineDash([]);
      pop();
    }
  }
  
  move() {
    this.x += this.dx;
    this.y += this.dy;
  }
  
  bounce() {
    // Wall bouncing
    if (this.x - this.r <= 0 || this.x + this.r >= width) {
      this.dx *= -1;
    }
    
    if (this.y - this.r <= 0) {
      this.dy *= -1;
    }
    
    // Paddle bouncing with physics
    if (this.y + this.r >= paddle.y && this.y < paddle.y + paddle.h && 
        this.x > paddle.x && this.x < paddle.x + paddle.w) {
      
      // Calculate bounce angle based on where ball hits paddle
      let relativeIntersect = (this.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      let bounceAngle = relativeIntersect * (PI/4); // Max 45 degree angle
      
      // Set new velocity
      let speed = sqrt(this.dx*this.dx + this.dy*this.dy);
      this.dx = sin(bounceAngle) * speed;
      this.dy = -cos(bounceAngle) * speed;
    }
    
    // Ball falls off bottom
    if (this.y - this.r > height) {
      if (this.isMain) {
        // Lose a life
        lives--;
        
        if (lives <= 0) {
          gameOver = true;
        } else {
          // Reset main ball
          gameStarted = false;
          this.dx = 0;
          this.dy = 0;
        }
      } else {
        // Remove stream ball
        let index = streamBalls.indexOf(this);
        if (index > -1) {
          streamBalls.splice(index, 1);
        }
      }
    }
  }
}

class Brick {
  constructor(x, y, hp, type) {
    this.x = x;
    this.y = y;
    this.size = 30; // Square size
    this.hp = hp;
    this.type = type;
  }
  
  show() {
    rectMode(CENTER);
    
    // Color based on brick type
    if (this.type === 'green') fill(0, 255, 0);
    else if (this.type === 'pink') fill(255, 0, 255);
    else fill(0, 0, 255);
    
    // Draw the square brick
    rect(this.x, this.y, this.size, this.size);
    
    // Draw hit points text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(this.hp, this.x, this.y);
    textAlign(LEFT);
    rectMode(CORNER);
  }
}
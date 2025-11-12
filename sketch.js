// ==============================================
// NEELUM — YOUR VERSION + SCORE/REASONS/BAR-SIZE SCALING
// ==============================================

let neelum;
let objects; 
let bg;

let SHOW_VIDEO = true;
let SHOW_ALL_KEYPOINTS = true;
let TRACKED_KEYPOINT_INDEX = 1;

let cam;
let facemesh;
let faces = [];
let cursor;

// Bars / state
let waterLevel = 100;
let sunLevel = 50;
let gameOver = false;
let endreason = 0;

let startScreen = true; // new: start screen flag
// Score
let score = 0;
let highScore = 0;

// scaling: how much bar changes per pixel of object size
const WATER_GAIN_PER_PX = 0.7;   // size 10-30 → +7 to +21 water
const SUN_GAIN_PER_PX   = 0.6;   // size 10-30 → +6 to +18 sun

// decay each frame
const WATER_DECAY = 0.075;
const SUN_DECAY   = 0.07;        // sun goes down faster, as requested

function preload() {
  bg = loadImage('background5.png');

    water = loadImage('watericon3.png');
  sun = loadImage('sunicon2.png');
  smog = loadImage('smogicon2.png');
}
/*
function setup() {
  createCanvas(windowWidth, windowHeight);
  world.gravity.y = 0;

  neelum = new Sprite();
  neelum.image = 'neelum2.png';
  neelum.image.scale = 0.1;
  neelum.color = "black";
  neelum.collider = "kinematic";

  objects = new Group();
  objects.collider = "dynamic";

  endreason = 0;
  gameOver = false;
  score = 0;

  lockGestures();

  cam = createPhoneCamera('user', true, 'fitHeight');
  // enableCameraTap();

  cam.onReady(() => {
    let options = {
      maxFaces: 1,
      refineLandmarks: false,
      runtime: 'mediapipe',
      flipHorizontal: false
    };
    facemesh = ml5.faceMesh(options, () => {
      facemesh.detectStart(cam.videoElement, gotFaces);
    });
  });
}*/

function setup() {
  createCanvas(windowWidth, windowHeight);
  world.gravity.y = 0;

  neelum = new Sprite();
  neelum.image = 'neelum2.png';
  neelum.image.scale = 0.1;
  neelum.color = "black";
  neelum.collider = "kinematic";

  objects = new Group();
  objects.collider = "dynamic";

  endreason = 0;
  gameOver = false;
  score = 0;

  lockGestures();

  // Create camera but do NOT start or attach FaceMesh yet
  cam = createPhoneCamera('user', true, 'fitHeight');
  // no enableCameraTap()
}

function gotFaces(results) {
  faces = results;
}

function draw() {
  // START SCREEN
  if (startScreen) {
    drawStartScreen();

    // draw Neelum centered lower for aesthetic (static, no tracking yet)
    push();
    imageMode(CENTER);
    let yOffset = height * 0.65; // a bit lower on screen
    image(loadImage('neelum.png'), width / 2, yOffset, width * 0.25, width * 0.25);
    pop();
    return;
  }

if (!startScreen && (!cam.active || !facemesh)) {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("Loading camera...", width / 2, height / 2);
  return;
}

  // GAMEPLAY (unchanged)
  background(0);
  push();
  tint(255, 200);
  image(bg, 0, 0, width, height);
  pop();

  if (gameOver) {
    drawEndScreen(endreason);
    return;
  }

  score += deltaTime / 1000.0;

  // Face → Neelum (normal tracking, no offset)
  if (faces.length > 0) {
    let face = faces[0];
    if (face.keypoints && face.keypoints.length > 0) {
      let trackedKeypoint = face.keypoints[TRACKED_KEYPOINT_INDEX];
      if (trackedKeypoint) {
        cursor = cam.mapKeypoint(trackedKeypoint);
        neelum.moveTowards(cursor.x, cursor.y, 0.1); // original behavior
      }
    }
  }

  if (frameCount % 45 === 0) spawnObject();
  neelum.overlap(objects, handleCollision);

  waterLevel -= WATER_DECAY;
  sunLevel -= SUN_DECAY;

  if (waterLevel <= 0) endGame(1);
  if (sunLevel <= 0) endGame(2);

  drawBars();
  drawHUD();
}

function drawStartScreen() {
  background(0);
  push();
  tint(255, 200);
  image(bg, 0, 0, width, height);
  pop();

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.06);
  text("NEELUM", width / 2, height * 0.25);

  textSize(min(width, height) * 0.04);
  text(
    "Help Neelum the Pothos survive in the big city",
    width / 2, height * 0.45
  );

  textSize(min(width, height) * 0.035);
  text("Tap to Start", width / 2, height * 0.75);
}

// ---------------------- END SCREEN ----------------------
function drawEndScreen(code) {
  background(0, 180);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.05); // responsive text size

  let msg = "";
  if (code === 1) msg = "Neelum died from dehydration :(";
  else if (code === 2) msg = "Neelum died from vitamin D deficiency :(";
  else if (code === 3) msg = "Neelum died from air pollution :(";
  else if (code === 4) msg = "Neelum died from too much sun :(";
  else msg = "Neelum died";

  wrapText(msg, width / 2, height / 2 - 40, width * 0.85, min(width, height) * 0.05);

  textSize(min(width, height) * 0.04);
  text(
    "Final Score: " + floor(score) +
    "\nHigh Score: " + floor(highScore) +
    "\n\nTap to restart",
    width / 2, height / 2 + 80
  );
}


function spawnObject() {
  let side = floor(random(4));
  let o = new objects.Sprite();

  // type + color (no green)
  let r = random();
if (r < 0.25) {
  o.type = "blue";
  o.image = water;
  o.image.scale = 0.08; // adjust to fit screen
} else if (r < 0.9) {
  o.type = "yellow";
  o.image = sun;
  o.image.scale = 0.08;
} else {
  o.type = "red";
  o.image = smog;
  o.image.scale = 0.08;
}

  // random size 10–30, square
  const s = random(10, 30);
  o.width = o.height = s;

  // random speed
  const sp = random(3, 6);

  // spawn from a random side
  if (side === 0) {        // top
    o.x = random(width); o.y = -20; o.vel.y = sp;
  } else if (side === 1) { // bottom
    o.x = random(width); o.y = height + 20; o.vel.y = -sp;
  } else if (side === 2) { // left
    o.x = -20; o.y = random(height); o.vel.x = sp;
  } else {                 // right
    o.x = width + 20; o.y = random(height); o.vel.x = -sp;
  }
}

function handleCollision(p, o) {
  const t = o.type;
  const sizePx = o.width; // square
  o.remove();

  if (t === "blue") {
    waterLevel = constrain(waterLevel + sizePx * WATER_GAIN_PER_PX, 0, 200);
  } else if (t === "yellow") {
    sunLevel = constrain(sunLevel + sizePx * SUN_GAIN_PER_PX, 0, 200);
    if (sunLevel > 100) endGame(4); // too much sun
  } else if (t === "red") {
    endGame(3); // air pollution (instant death)
  }
}

function drawBars() {
  noStroke();
  fill(50);
  rect(width / 6, height - 60, width / 3, 20, 5);
  rect(width / 2, height - 60, width / 3, 20, 5);

  // Water bar (clamped to 0..100 for display)
  fill("blue");
  rect(width / 6, height - 60,
       map(constrain(waterLevel, 0, 100), 0, 100, 0, width / 3),
       20, 5);

  // Sun bar (clamped to 0..100 for display)
  fill("yellow");
  rect(width / 2, height - 60,
       map(constrain(sunLevel, 0, 100), 0, 100, 0, width / 3),
       20, 5);

  // Labels
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("WATER", width / 6 + width / 6, height - 65);
  text("SUN",   width / 2 + width / 6, height - 65);
}

function drawHUD() {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Score: " + floor(score), 16, 16);

  textAlign(RIGHT, TOP);
  text("High: " + floor(highScore), width - 16, 16);
}

function endGame(reasonCode) {
  if (gameOver) return;
  gameOver = true;
  endreason = reasonCode;
  highScore = max(highScore, score);
  // optionally stop all active sprites
  objects.forEach(o => { o.vel.x = 0; o.vel.y = 0; });
}
/*
function drawEndScreen(code) {
  background(0, 180);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);

  let msg = "";
  if (code === 1) msg = "Neelum died from dehydration :(";
  else if (code === 2) msg = "Neelum died from vitamin D deficiency :(";
  else if (code === 3) msg = "Neelum died from air pollution :(";
  else if (code === 4) msg = "Neelum died from too much sun :(";
  else msg = "Neelum died";

  text(msg, width / 2, height / 2 - 20);

  textSize(18);
  text(
    "Final Score: " + floor(score) + "\nHigh Score: " + floor(highScore) + "\n\nTap to restart",
    width / 2, height / 2 + 40
  );
}
*//*
function touchStarted() {
  // Start screen tap
  if (startScreen) {
    startScreen = false;

    // Start camera manually
    if (!cam.active) {
      cam.start(() => {
        // Wait for camera to be ready, then load FaceMesh
        let options = {
          maxFaces: 1,
          refineLandmarks: false,
          runtime: 'mediapipe',
          flipHorizontal: false
        };
        facemesh = ml5.faceMesh(options, () => {
          facemesh.detectStart(cam.videoElement, gotFaces);
        });
      });
    }
    return false;
  }

  if (gameOver) {
    resetGame();
    return false;
  }

  SHOW_VIDEO = !SHOW_VIDEO;
  return false;
}*/

function touchStarted() {
  if (startScreen) {
    startScreen = false;

    // Start the camera manually on tap (this triggers the permission prompt)
    cam.start(() => {
      // Once camera is active, create and start FaceMesh
      let options = {
        maxFaces: 1,
        refineLandmarks: false,
        runtime: 'mediapipe',
        flipHorizontal: false
      };
      facemesh = ml5.faceMesh(options, () => {
        facemesh.detectStart(cam.videoElement, gotFaces);
      });
    });

    return false;
  }

  if (gameOver) {
    resetGame();
    return false;
  }

  return false;
}
function wrapText(txt, x, y, maxWidth, lineHeight) {
  const words = txt.split(' ');
  let line = '';
  let ty = y;
  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + ' ';
    let testWidth = textWidth(testLine);
    if (testWidth > maxWidth && i > 0) {
      text(line, x, ty);
      line = words[i] + ' ';
      ty += lineHeight * 1.2;
    } else {
      line = testLine;
    }
  }
  text(line, x, ty);
}

function resetGame() {
  gameOver = false;
  endreason = 0;
  waterLevel = 100;
  sunLevel = 50;
  score = 0;

  // remove existing objects
  objects.removeAll();
}

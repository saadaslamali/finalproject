// ==============================================
// NEELUM IN THE BIG CITY
// Follow the adventures of Neelum the Money Plant as he attempts to survive the 
// mean streets of Toronto. 
// ==============================================

let neelum;
let objects;
let bg;
let neelum_default_ani;

let SHOW_VIDEO = true;
let TRACKED_KEYPOINT_INDEX = 1;

let cam;
let facemesh;
let faces = [];
let cursor;

let faceReady = false; // new: wait until face detected once

// Add this new variable
let isTouching = false;


// Bars / state
let waterLevel = 100;
let sunLevel = 50;
let gameOver = false;
let endreason = 0;

// Score
let score = 0;
let highScore;

// scaling
const WATER_GAIN_PER_PX = 0.7;
const SUN_GAIN_PER_PX = 0.6;
const WATER_DECAY = 0.075;
const SUN_DECAY = 0.07;

let WATER_SPAWN_RATE = 0.25;  // 25% chance
let SUN_SPAWN_RATE = 0.65;    // 65% chance
let SMOG_SPAWN_RATE = 0.10;   // 10% chance

let lastSpawn = 0;
const spawnInterval = 750; // milliseconds


function preload() {
  bg = loadImage('background5.png');
  water = loadImage('watericon3.png');
  sun = loadImage('sunicon2.png');
  smog = loadImage('smogicon2.png');
  neelum_default_ani = loadAnimation(imageSequence("neelum/neelum-",7));
  neelum_grow_ani = loadAnimation(imageSequence("neelum-grow/neelum-",11));

}

function setup() {
  createCanvas(windowWidth, windowHeight);
  world.gravity.y = 0;

  neelum = new Sprite();
  neelum.image = 'neelum2.png';
neelum.image.scale = min(width, height) * 0.00008;
  neelum.collider = "kinematic";
  neelum.addAni('sun', neelum_default_ani);
  neelum.addAni('water', neelum_grow_ani);

  neelum.ani.stop();
neelum.diameter = min(width, height) * 0.05;
  objects = new Group();
  objects.collider = "dynamic";
  highScore = getItem('neelumHighScore') || 0;

  lockGestures();

  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap();

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
}

function imageSequence(prefix, numberOfFrames, ext=".png"){
let sequence = [];
for (let i=0; i<numberOfFrames; i++){
  sequence[i] = prefix + i + ext;
}
return sequence;
}

function gotFaces(results) {
  faces = results;
  // Mark faceReady once we have at least one frame of detection
  if (results && results.length > 0) faceReady = true;
}


function draw() {
  background(0);
  push();
  tint(255, 200);
  image(bg, 0, 0, width, height);
  pop();

  if (!faceReady) {
    drawLoading();
    return; // wait until first face detected
  }

  if (gameOver) {
    drawEndScreen(endreason);
    return;
  }

  score += deltaTime / 1000.0;

  if (faces.length > 0 && !isTouching) {
    let face = faces[0];
    if (face.keypoints && face.keypoints.length > 0) {
      let trackedKeypoint = face.keypoints[TRACKED_KEYPOINT_INDEX];
      if (trackedKeypoint) {
        cursor = cam.mapKeypoint(trackedKeypoint);
        neelum.moveTowards(cursor.x, cursor.y, 0.05);
      }
    }
  }


  if (millis() - lastSpawn > spawnInterval) {
    spawnObject();
    lastSpawn = millis();
  }
  neelum.overlap(objects, handleCollision);

  waterLevel -= WATER_DECAY;
  sunLevel -= SUN_DECAY;

  if (waterLevel <= 0) endGame(1);
  if (sunLevel <= 0) endGame(2);

  drawBars();
  drawHUD();
}



function drawLoading() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("Loading face tracking...", width / 2, height / 2);
}

function spawnObject() {
  let side = floor(random(4));
  let o = new objects.Sprite();

  let r = random();
  if (r < 0.25) {
    o.type = "blue";
    o.image = water;
    o.image.scale = 0.08;
  } else if (r < 0.9) {
    o.type = "yellow";
    o.image = sun;
    o.image.scale = 0.08;
  } else {
    o.type = "red";
    o.image = smog;
    o.image.scale = 0.08;
  }

  const s = random(10, 30);
  o.width = o.height = s;

  const sp = random(3, 6);
  if (side === 0) {
    o.x = random(width); o.y = -20; o.vel.y = sp;
  } else if (side === 1) {
    o.x = random(width); o.y = height + 20; o.vel.y = -sp;
  } else if (side === 2) {
    o.x = -20; o.y = random(height); o.vel.x = sp;
  } else {
    o.x = width + 20; o.y = random(height); o.vel.x = -sp;
  }
}

function handleCollision(p, o) {
  const t = o.type;
  const sizePx = o.width;
  o.remove();

  if (t === "blue") {
    waterLevel = constrain(waterLevel + sizePx * WATER_GAIN_PER_PX, 0, 200);
    neelum.changeAni('water'); 
    neelum.ani.play();
    neelum.ani.looping = false;
    neelum.ani.onComplete = () => {
    neelum.ani.stop();
  neelum.ani.frame = 0;
    };
  } else if (t === "yellow") {
    sunLevel = constrain(sunLevel + sizePx * SUN_GAIN_PER_PX, 0, 200);
        neelum.changeAni('sun');

    neelum.ani.play();
    neelum.ani.looping = false; 
    neelum.ani.onComplete = () => {
    neelum.ani.stop();
    neelum.ani.frame = 0; 
    };
    if (sunLevel > 100) endGame(4);
  } else if (t === "red") {
    endGame(3);
  }
}

function drawBars() {
  noStroke();
  fill(50);
  rect(width / 6, height - 60, width / 3, 20, 5);
  rect(width / 2, height - 60, width / 3, 20, 5);

  fill("blue");
  rect(width / 6, height - 60,
       map(constrain(waterLevel, 0, 100), 0, 100, 0, width / 3), 20, 5);

  fill("yellow");
  rect(width / 2, height - 60,
       map(constrain(sunLevel, 0, 100), 0, 100, 0, width / 3), 20, 5);

  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("WATER", width / 6 + width / 6, height - 65);
  text("SUN", width / 2 + width / 6, height - 65);
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
  if (score > highScore) {
    highScore = score;
    storeItem('neelumHighScore', highScore);
  }
  objects.forEach(o => { o.vel.x = 0; o.vel.y = 0; });
}

function drawEndScreen(code) {
  background(0, 180);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.05);

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

function touchStarted() {
  if (gameOver) {
    resetGame();
    return false;
  }
  
  isTouching = true;
  neelum.collider = "dynamic";
  
  return false;
}

function touchEnded() {
  isTouching = false;
  neelum.collider = "kinematic";
  neelum.vel.x = 0;
  neelum.vel.y = 0;
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
  objects.removeAll();
}

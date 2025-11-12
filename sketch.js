// ==============================================
// FACEMESH - FACE TRACKING AS UI INTERACTION (PRELOAD VERSION)
// ==============================================
// This example shows how to use face tracking as a new way to interact
// with objects on screen. Move your nose to control the red dot!
//
// This version demonstrates using preload() to load the ML5 model
// before setup() runs, combined with p5-phone's PhoneCamera methods.
//
// INTERACTION CONCEPT:
// Traditional UI: Touch/click to select objects
// Face Tracking UI: Move your face to hover/select objects
//
// Uses PhoneCamera class from p5-phone for automatic coordinate mapping.
// Works with any ML5 model (FaceMesh, HandPose, BodyPose, etc.)
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let neelum;
let objects; 

let SHOW_VIDEO = true;              // Show/hide video feed (toggle with touch)
let SHOW_ALL_KEYPOINTS = true;      // Show all 468 face keypoints (set to false to hide)

// Customize which face point to track:
// 1 = nose tip (default)
// 10 = top of face
// 152 = chin
// 234 = left eye
// 454 = right eye
// 13 = lips
let TRACKED_KEYPOINT_INDEX = 1;     // Which face point to use for interaction

let CURSOR_SIZE = 30;               // Size of the tracking cursor (nose dot)
let CURSOR_COLOR = [255, 50, 50];   // Color of cursor (red)
let KEYPOINT_SIZE = 3;              // Size of all face keypoints (if shown)

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                            // PhoneCamera instance
let facemesh;                       // ML5 FaceMesh model
let faces = [];                     // Detected faces (updated automatically)
let cursor;                         // Tracked keypoint position (mapped to screen coordinates)

let waterLevel = 100;
let sunLevel = 50;
let gameOver = false;
let win = false;

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  world.gravity.y = 0;
  
    neelum = new Sprite();
  neelum.image = 'neelum.png';
  neelum.image.scale = 0.1;
    neelum.color = "black";
  neelum.collider = "kinematic"; // controlled manually
  lockGestures();  // Prevent phone gestures (zoom, refresh)

    objects = new Group();
  objects.width = 40;
  objects.height = 40;
  objects.collider = "dynamic";
  objects.color = "green";
  
  // Create camera: front camera, mirrored, fit to canvas height
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Enable camera (handles initialization automatically)
  enableCameraTap();
  
  // Wait for camera to initialize, then create model and start detection
  cam.onReady(() => {
    // Configure ML5 FaceMesh AFTER camera is ready
    // This ensures the model gets correct video dimensions on iOS
    let options = {
      maxFaces: 1,           // Only detect 1 face (faster)
      refineLandmarks: false,// Skip detailed landmarks (faster)
      runtime: 'mediapipe',  // Use MediaPipe runtime (same as HandPose)
      flipHorizontal: false  // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create FaceMesh model and start detection when ready
    facemesh = ml5.faceMesh(options, () => {
      facemesh.detectStart(cam.videoElement, gotFaces);
    });
  });
}

// ==============================================
// GOT FACES - Callback for face detection results
// ==============================================
function gotFaces(results) {
  faces = results;
}

// ==============================================
// DRAW - Runs continuously (60 times per second)
// ==============================================
function draw() {
  
  background(0);  // Dark gray background

  
  if (gameOver || win) {
    drawEndScreen();
    return;
  }
  
  // // Draw the camera feed (toggle with touch)
  // if (SHOW_VIDEO) {
  //   image(cam, 0, 0);  // PhoneCamera handles positioning and mirroring!
  // }
  
  // Draw face tracking
  if (faces.length > 0) {
    drawFaceTracking();
  }
  	

    if (frameCount % 45 === 0) spawnObject();

  // Handle collisions
  neelum.overlap(objects, handleCollision);

    waterLevel -= 0.1;
  sunLevel -= 0.05;



  if (waterLevel <= 0) endGame("Neelum dried up :(");
  if (sunLevel <= 0) endGame("Neelum died of vitamin d deficiency :(");
  drawBars();


  // Draw instructions and status
  // drawUI();
}
function spawnObject() {
  let side = floor(random(4));
  let o = new objects.Sprite();

  // Weighted color choice (no green anymore)
  let r = random();
  if (r < 0.45) {
    o.type = "blue";
    o.color = "blue";
  } else if (r < 0.9) {
    o.type = "yellow";
    o.color = "yellow";
  } else {
    o.type = "red";
    o.color = "red";
  }

  o.width = o.height = 40;

  // Spawn from a random side
  if (side === 0) {
    o.x = random(width);
    o.y = -20;
    o.vel.y = random(3, 6);
  } else if (side === 1) {
    o.x = random(width);
    o.y = height + 20;
    o.vel.y = random(-6, -3);
  } else if (side === 2) {
    o.x = -20;
    o.y = random(height);
    o.vel.x = random(3, 6);
  } else if (side === 3) {
    o.x = width + 20;
    o.y = random(height);
    o.vel.x = random(-6, -3);
  }
}

function handleCollision(p, o) {
  let t = o.type;
  o.remove();

  if (t === "blue") {
    waterLevel = constrain(waterLevel + 15, 0, 100);
  } else if (t === "yellow") {
    sunLevel = constrain(sunLevel + 10, 0, 120);
    if (sunLevel > 100) endGame("too_much_sun");
  } else if (t === "red") {
    endGame("fire");
  }
}
// ==============================================
// DRAW FACE TRACKING - Use face position as UI input
// ==============================================
function drawFaceTracking() {
  let face = faces[0];  // Get the first detected face
  
  if (!face.keypoints || face.keypoints.length === 0) return;
  
  // ==============================================
  // MAIN INTERACTION: Get tracked keypoint position
  // ==============================================
  // This is the face point you can use to control UI elements!
  // Change TRACKED_KEYPOINT_INDEX at top of file to track different points
  
  let trackedKeypoint = face.keypoints[TRACKED_KEYPOINT_INDEX];
  if (!trackedKeypoint) return;
  
  // Map to screen coordinates - ONE LINE!
  // cam.mapKeypoint() handles all scaling and mirroring automatically
  cursor = cam.mapKeypoint(trackedKeypoint);
  
  // ==============================================
  // USE THE CURSOR POSITION FOR INTERACTION
  // ==============================================
  // Now you have cursor.x and cursor.y to use however you want!
  // Examples:
  // - Move objects: object.x = cursor.x, object.y = cursor.y
  // - Check collision: if (dist(cursor.x, cursor.y, target.x, target.y) < 50) {...}
  // - Control parameters: brightness = map(cursor.y, 0, height, 0, 255)
  // - Draw effects: ellipse(cursor.x, cursor.y, 50, 50)
    neelum.moveTowards(cursor.x, cursor.y,.1);

//   // Draw cursor at tracked position
//   push();
//   fill(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2]);
//   noStroke();
//   ellipse(cursor.x, cursor.y, CURSOR_SIZE, CURSOR_SIZE);
  
//   // Optional: Show crosshair for precise positioning
//   stroke(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2], 150);
//   strokeWeight(2);
//   line(cursor.x - 15, cursor.y, cursor.x + 15, cursor.y);
//   line(cursor.x, cursor.y - 15, cursor.x, cursor.y + 15);
//   pop();
  
//   // Optional: Display coordinates (useful for debugging)
//   push();
//   fill(255);
//   stroke(0);
//   strokeWeight(3);
//   textAlign(CENTER, TOP);
//   textSize(14);
//   text('x: ' + cursor.x.toFixed(0) + ', y: ' + cursor.y.toFixed(0) + 
//        ', z: ' + (cursor.z || 0).toFixed(0), 
//        cursor.x, cursor.y + CURSOR_SIZE/2 + 10);
//   pop();
  
//   // ==============================================
//   // OPTIONAL: Draw all face keypoints
//   // ==============================================
//   if (SHOW_ALL_KEYPOINTS) {
//     // Map entire array at once with cam.mapKeypoints()
//     let allPoints = cam.mapKeypoints(face.keypoints);
    
//     push();
//     fill(0, 255, 0, 100);  // Green, semi-transparent
//     noStroke();
//     for (let point of allPoints) {
//       ellipse(point.x, point.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
//     }
//     pop();
//   }
}



// ==============================================
// TOUCH EVENTS - Toggle video display
// ==============================================
function drawBars() {
  // Background panels
  noStroke();
  fill(50);
  rect(width / 6, height - 60, width / 3, 20, 5);
  rect(width / 2, height - 60, width / 3, 20, 5);

  // Water bar
  fill("blue");
  rect(width / 6, height - 60, map(waterLevel, 0, 100, 0, width / 3), 20, 5);

  // Sun bar
  fill("yellow");
  rect(width / 2, height - 60, map(sunLevel, 0, 100, 0, width / 3), 20, 5);

  // Labels
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("WATER", width / 6 + width / 6, height - 65);
  text("SUN", width / 2 + width / 6, height - 65);
}

function endGame(reason) {
  gameOver = true;
  console.log("Neelum died:", reason);
}

function drawEndScreen() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  if (win) {
    text("Neelum Thrived 🌱", width / 2, height / 2);
  } else {
    text("Neelum Died 💀", width / 2, height / 2);
  }
  textSize(18);
  text("Tap to restart", width / 2, height / 2 + 40);
}

function touchStarted() {
  if (gameOver || win) {
    resetGame();
  } else {
    SHOW_VIDEO = !SHOW_VIDEO;
  }
  return false;
}

function resetGame() {
  gameOver = false;
  win = false;
  waterLevel = 100;
  sunLevel = 50;
  objects.removeAll();
}
// Also works with mouse click for testing on desktop
function mousePressed() {
  SHOW_VIDEO = !SHOW_VIDEO;
  return false;
}


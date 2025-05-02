let capture;
let mic;
let faceapi;
let detections = [];
let particles = [];

let ghostStrength = 0;
let avgBrightness = 127;

function setup() {
  createCanvas(windowWidth, windowHeight); // Adjust canvas to full screen
  pixelDensity(1);

  capture = createCapture(VIDEO);
  capture.size(160, 120); // Keep low resolution for performance
  capture.hide();

  mic = new p5.AudioIn();
  mic.start();

  const options = {
    withLandmarks: true,
    withExpressions: false,
    withDescriptors: false
  };
  faceapi = ml5.faceApi(capture, options, () => {
    console.log("faceApi ready");
    faceapi.detect(gotResults);
  });

  // Create a particle for every 3rd pixel (reducing particle density)
  for (let y = 0; y < capture.height; y += 3) {  // Increase step size (e.g., 3)
    for (let x = 0; x < capture.width; x += 3) {  // Increase step size (e.g., 3)
      particles.push(new GhostPixel(x, y));
    }
  }
}

function gotResults(err, result) {
  if (err) {
    console.error(err);
    return;
  }
  detections = result;
  faceapi.detect(gotResults);
}

function draw() {
  background(0, 15); // dreamy trail

  capture.loadPixels();
  avgBrightness = getAverageBrightness();

  let vol = mic.getLevel();
  let eyesClosed = areEyesClosed();

  // Smooth transition for ghost visibility
  ghostStrength = lerp(ghostStrength, eyesClosed ? 1 : 0, 0.05);

  for (let p of particles) {
    p.update(vol);
    p.show(ghostStrength);
  }

  // Subtle caption
  fill(255, ghostStrength * 80);
  noStroke();
  textSize(16);
  textAlign(CENTER);
  text("🫥 Ghost only appears when you close your eyes", width / 2, height - 20);
}

function areEyesClosed() {
  if (detections.length === 0) return false;

  const leftEye = detections[0].parts.leftEye;
  const rightEye = detections[0].parts.rightEye;

  function openness(eye) {
    let top = eye[1];
    let bottom = eye[4];
    return dist(top._x, top._y, bottom._x, bottom._y);
  }

  const leftOpen = openness(leftEye);
  const rightOpen = openness(rightEye);

  // Be strict — even a slightly open eye disables ghost
  return leftOpen < 5 && rightOpen < 5;
}

function getAverageBrightness() {
  let total = 0;
  let count = 0;
  for (let i = 0; i < capture.pixels.length; i += 4) {
    let r = capture.pixels[i];
    let g = capture.pixels[i + 1];
    let b = capture.pixels[i + 2];
    total += (r + g + b) / 3;
    count++;
  }
  return total / count;
}

class GhostPixel {
  constructor(x, y) {
    this.vidX = x;
    this.vidY = y;
    this.baseX = map(x, 0, capture.width, 0, width);  // Scale relative to full screen width
    this.baseY = map(y, 0, capture.height, 0, height); // Scale relative to full screen height
    this.x = this.baseX;
    this.y = this.baseY;
    this.r = random(1.5, 2.5);
    this.alpha = 0;
  }

  update(vol) {
    const i = (this.vidX + this.vidY * capture.width) * 4;
    const r = capture.pixels[i];
    const g = capture.pixels[i + 1];
    const b = capture.pixels[i + 2];
    const brightness = (r + g + b) / 3;

    if (brightness < avgBrightness + 10) {
      this.alpha = lerp(this.alpha, 255, 0.1);
      this.x = lerp(this.x, this.baseX + random(-vol * 15, vol * 15), 0.15);
      this.y = lerp(this.y, this.baseY + random(-vol * 15, vol * 15), 0.15);
    } else {
      this.alpha = lerp(this.alpha, 0, 0.05);
    }
  }

  show(strength) {
    if (this.alpha > 5 && strength > 0.01) {
      noStroke();
      fill(255, this.alpha * strength);
      ellipse(this.x, this.y, this.r);
    }
  }
}

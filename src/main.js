import "./style.css";
import { Delaunay } from "d3-delaunay";
import { drawPoint, getCentroid, lerp, randomUnitVector2D } from "./utils.js";
import { MAX_POINT_RADIUS, MIN_POINT_RADIUS, NUM_POINTS } from "./constants.js";

let seedPoints = [];

let delaunay;
let voronoi;
let animationFrameId = null;

let imgCanvas = document.createElement("canvas");

const canvas = document.getElementById("canvas");
const colorToggle = document.getElementById("colorToggle");
const minRadiusSlider = document.getElementById("minRadius");
const maxRadiusSlider = document.getElementById("maxRadius");

const numPointsSlider = document.getElementById("numPointsSlider");

const imageUploadInput = document.getElementById("imageUpload");

const loader = document.getElementById("loader");
const controls = document.getElementById("controls");
const restartBtn = document.getElementById("restart-btn");

const ctx = canvas.getContext("2d");

let imgCtx;
let imageData;

function regenerateStipplePoints() {
  const numPoints = parseInt(numPointsSlider.value);
  if (isNaN(numPoints) || numPoints <= 0) {
    // fallback
    numPoints = 15000;
  }
  // np is nan sometimes
  // console.log("numPoints", numPoints);
  seedPoints = [];

  for (let i = 0; i < numPoints; i++) {
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;

    const imageSampleX = Math.floor(x);
    const imageSampleY = Math.floor(y);
    const index = (imageSampleY * canvas.width + imageSampleX) * 4;
    const r = imageData[index];
    const g = imageData[index + 1];
    const b = imageData[index + 2];
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const threshold = Math.random() * 255;

    if (threshold > brightness) {
      seedPoints.push([x, y]);
    } else {
      i--;
    }
  }
}

function loadImageAndStart(img) {
  console.log("original image size", img.width, img.height);

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  canvas.style.display = "block";
  controls.style.display = "flex";
  loader.style.display = "none";

  // resize large images
  let drawWidth = img.width;
  let drawHeight = img.height;
  if (img.width > 800) {
    console.log("resizing");
    const scale = 800 / img.width;
    drawWidth = 800;
    drawHeight = img.height * scale;
  }

  imgCanvas.width = drawWidth;
  imgCanvas.height = drawHeight;
  canvas.width = drawWidth;
  canvas.height = drawHeight;

  imgCtx = imgCanvas.getContext("2d");
  imgCtx.drawImage(img, 0, 0, drawWidth, drawHeight);

  imageData = imgCtx.getImageData(0, 0, canvas.width, canvas.height).data;

  regenerateStipplePoints();
  setup();
  draw();
}
function setup() {
  delaunay = Delaunay.from(seedPoints);
  voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const useColor = colorToggle.checked;
  const MIN_POINT_RADIUS = parseFloat(minRadiusSlider.value);
  const MAX_POINT_RADIUS = parseFloat(maxRadiusSlider.value);

  // draw seed points
  for (let idx = 0; idx < seedPoints.length; idx++) {
    const v = seedPoints[idx];

    const imageSampleX = Math.floor(v[0]);
    const imageSampleY = Math.floor(v[1]);

    const index = (imageSampleY * canvas.width + imageSampleX) * 4;
    const r = imageData[index];
    const g = imageData[index + 1];
    const b = imageData[index + 2];
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const t = brightness / 255;
    const inv = 1 - t;

    const radius =
      MIN_POINT_RADIUS + inv * (MAX_POINT_RADIUS - MIN_POINT_RADIUS);

    const color = useColor ? `rgb(${r}, ${g}, ${b})` : "black";
    ctx.globalAlpha = 0.9;
    drawPoint(ctx, v[0], v[1], color, radius);
  }

  let polygons = voronoi.cellPolygons();
  let cells = Array.from(polygons);

  // // draw voronoi diagram (polygons) around points

  // for (let poly of cells) {
  //   ctx.beginPath();
  //   ctx.moveTo(poly[0][0], poly[0][1]);
  //   for (let i = 1; i < poly.length; i++) {
  //     ctx.lineTo(poly[i][0], poly[i][1]);
  //   }
  //   ctx.closePath();
  //   ctx.stroke();
  // }

  // weighted

  let centroids = new Array(cells.length);

  for (let i = 0; i < centroids.length; i++) {
    centroids[i] = [0, 0];
  }

  // console.log("s", seedPoints.length);
  // console.log("c", centroids.length);
  let centroidWeights = new Array(cells.length).fill(0);
  let delaunayIndex = 0;
  for (let i = 0; i < canvas.width; i++) {
    for (let j = 0; j < canvas.height; j++) {
      const index = (j * canvas.width + i) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const val = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      let weight = 1 - val / 255;
      delaunayIndex = delaunay.find(i, j, delaunayIndex);

      centroids[delaunayIndex][0] += i * weight;
      centroids[delaunayIndex][1] += j * weight;
      centroidWeights[delaunayIndex] += weight;
    }
  }

  for (let i = 0; i < centroids.length; i++) {
    if (centroidWeights[i] > 0) {
      centroids[i][0] /= centroidWeights[i];
      centroids[i][1] /= centroidWeights[i];
    } else {
      centroids[i] = [...seedPoints[i]];
    }
  }

  for (let idx = 0; idx < seedPoints.length; idx++) {
    seedPoints[idx] = lerp(seedPoints[idx], centroids[idx], 0.1);
  }

  delaunay = Delaunay.from(seedPoints);
  voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);
  animationFrameId = requestAnimationFrame(draw);
}

// load in image then get voronoi
const img = new Image();
img.src = "/cat-square.jpg";

img.onload = async () => {
  await customElements.whenDefined("sl-range");
  await Promise.all([
    minRadiusSlider.updateComplete,
    maxRadiusSlider.updateComplete,
    numPointsSlider.updateComplete,
  ]);

  loadImageAndStart(img);
};

// event handlers

imageUploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  canvas.style.display = "none";
  controls.style.display = "none";
  loader.style.display = "inline-block";

  const reader = new FileReader();
  reader.onload = (event) => {
    const uploadedImg = new Image();
    uploadedImg.onload = () => {
      loadImageAndStart(uploadedImg);
    };
    uploadedImg.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

numPointsSlider.addEventListener("input", () => {
  regenerateStipplePoints();
  setup();
});

restartBtn.addEventListener("click", () => {
  regenerateStipplePoints();
  setup();
});

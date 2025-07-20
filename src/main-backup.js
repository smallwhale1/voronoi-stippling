import "./style.css";
import { Delaunay } from "d3-delaunay";
import { drawPoint, getCentroid, lerp, randomUnitVector2D } from "./utils.js";
import { MAX_POINT_RADIUS, MIN_POINT_RADIUS, NUM_POINTS } from "./constants.js";

// voronoi triangulation code
let seedPoints = [];
// let randomVelocities = [];

let delaunay;
let voronoi;

const canvas = document.getElementById("canvas");
// canvas.width = CANVAS_WIDTH;
// canvas.height = CANVAS_HEIGHT;

const ctx = canvas.getContext("2d");

const img = new Image();
img.src = "/notre-dame.jpeg";

let imgCtx;
let imageData;

// load in image then get voronoi
img.onload = () => {
  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = img.width;
  imgCanvas.height = img.height;
  canvas.width = img.width;
  canvas.height = img.height;
  imgCtx = imgCanvas.getContext("2d");
  imgCtx.drawImage(img, 0, 0);
  imageData = imgCtx.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let i = 0; i < NUM_POINTS; i++) {
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;

    const imageSampleX = Math.floor(x);
    const imageSampleY = Math.floor(y);

    const index = (imageSampleY * canvas.width + imageSampleX) * 4;
    const r = imageData[index];
    const g = imageData[index + 1];
    const b = imageData[index + 2];

    // brightness w luminance
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // console.log(brightness);

    const threshold = Math.random() * 255;

    if (threshold > brightness) {
      seedPoints.push([x, y]);
      // randomVelocities[i] = randomUnitVector2D();
    } else {
      i--;
    }
  }

  setup();
  draw();
};

function setup() {
  // for (let i = 0; i < NUM_POINTS; i++) {
  //   let x = Math.random() * CANVAS_WIDTH;
  //   let y = Math.random() * CANVAS_HEIGHT;

  //   seedPoints[i] = [x, y];

  //   randomVelocities[i] = randomUnitVector2D();
  // }

  delaunay = Delaunay.from(seedPoints);
  voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw seed points

  // // bucketed version
  // const NUM_BUCKETS = 3; // for example, 5 brightness buckets

  // for (let idx = 0; idx < seedPoints.length; idx++) {
  //   const v = seedPoints[idx];

  //   const imageSampleX = Math.floor(v[0]);
  //   const imageSampleY = Math.floor(v[1]);

  //   const index = (imageSampleY * canvas.width + imageSampleX) * 4;
  //   const r = imageData[index];
  //   const g = imageData[index + 1];
  //   const b = imageData[index + 2];
  //   const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0–255

  //   // Bucket brightness into discrete levels (0 to NUM_BUCKETS - 1)
  //   const bucket = Math.floor((brightness / 256) * NUM_BUCKETS);

  //   // Map bucket to radius
  //   const t = 1 - bucket / (NUM_BUCKETS - 1); // normalized bucket (0 to 1)
  //   const radius = MIN_POINT_RADIUS + t * (MAX_POINT_RADIUS - MIN_POINT_RADIUS);

  //   drawPoint(ctx, v[0], v[1], "black", radius);
  // }

  // non bucketed
  for (let idx = 0; idx < seedPoints.length; idx++) {
    const v = seedPoints[idx];

    const imageSampleX = Math.floor(v[0]);
    const imageSampleY = Math.floor(v[1]);

    const index = (imageSampleY * canvas.width + imageSampleX) * 4;
    const r = imageData[index];
    const g = imageData[index + 1];
    const b = imageData[index + 2];
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // normalized
    const t = brightness / 255;
    const inv = 1 - t;

    // interpolation
    const radius =
      MIN_POINT_RADIUS + inv * (MAX_POINT_RADIUS - MIN_POINT_RADIUS);

    const rgbString = `rgb(${r}, ${g}, ${b})`;
    ctx.globalAlpha = 0.9;
    drawPoint(ctx, v[0], v[1], rgbString, radius);
  }

  // const { triangles } = delaunay;
  // ctx.strokeStyle = "black";
  // ctx.lineWidth = 1;

  // for (let i = 0; i < triangles.length; i += 3) {
  //   let t0 = triangles[i];
  //   let t1 = triangles[i + 1];
  //   let t2 = triangles[i + 2];

  //   ctx.beginPath();
  //   ctx.moveTo(delaunay.points[t0 * 2], delaunay.points[t0 * 2 + 1]);
  //   ctx.lineTo(delaunay.points[t1 * 2], delaunay.points[t1 * 2 + 1]);
  //   ctx.lineTo(delaunay.points[t2 * 2], delaunay.points[t2 * 2 + 1]);
  //   ctx.closePath();

  //   ctx.stroke();
  // }

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

      // console.log(delaunayIndex);

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

  // // centroid cal no weight

  // let centroids = []

  // for (let poly of cells) {
  //   let centroid = getCentroid(poly);
  //   centroids.push(centroid);
  //   // console.log("centroid", centroid);
  //   // drawPoint(ctx, centroid[0], centroid[1], "blue");
  // }

  // console.log(cells.length);
  // console.log(seedPoints.length);

  for (let idx = 0; idx < seedPoints.length; idx++) {
    // console.log(centroids[idx]);
    seedPoints[idx] = lerp(seedPoints[idx], centroids[idx], 0.1);
  }

  delaunay = Delaunay.from(seedPoints);
  voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);
  requestAnimationFrame(draw);
}

// setup();
// draw();

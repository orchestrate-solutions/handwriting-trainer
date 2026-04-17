// Stroke similarity scoring — pure geometry, fully local, zero dependencies

// Distance from point (px,py) to nearest point on segment (ax,ay)-(bx,by)
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Minimum distance from a point to a polyline (array of [x,y])
function pointToPath(px, py, path) {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointToSegmentDist(px, py, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    if (d < min) min = d;
  }
  return min;
}

// Accuracy: how close user points stay to the template
// Returns 0–1 (1 = perfect)
export function accuracyScore(userPoints, templatePoints, maxDist = 8) {
  if (userPoints.length === 0) return 0;
  let totalDist = 0;
  for (const [ux, uy] of userPoints) {
    totalDist += Math.min(pointToPath(ux, uy, templatePoints), maxDist);
  }
  const avgDist = totalDist / userPoints.length;
  return Math.max(0, 1 - avgDist / maxDist);
}

// Coverage: how much of the template was traced
// Returns 0–1 (1 = every part of template was touched)
export function coverageScore(userPoints, templatePoints, threshold = 8) {
  if (templatePoints.length === 0) return 0;
  let covered = 0;
  for (const [tx, ty] of templatePoints) {
    let close = false;
    for (const [ux, uy] of userPoints) {
      if (Math.hypot(ux - tx, uy - ty) < threshold) {
        close = true;
        break;
      }
    }
    if (close) covered++;
  }
  return covered / templatePoints.length;
}

// Smoothness: how fluid the stroke is (low jitter = smooth)
// Returns 0–1 (1 = perfectly smooth)
export function smoothnessScore(userPoints) {
  if (userPoints.length < 3) return 1;
  const angles = [];
  for (let i = 1; i < userPoints.length - 1; i++) {
    const [ax, ay] = userPoints[i - 1];
    const [bx, by] = userPoints[i];
    const [cx, cy] = userPoints[i + 1];
    const a1 = Math.atan2(by - ay, bx - ax);
    const a2 = Math.atan2(cy - by, cx - bx);
    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    angles.push(diff);
  }
  const avgAngleChange = angles.reduce((s, a) => s + a, 0) / angles.length;
  // Normalize: 0 angle change = 1.0, PI change = 0.0
  return Math.max(0, 1 - avgAngleChange / (Math.PI * 0.3));
}

// Per-point distance to template (for color-coding strokes)
export function pointDistances(userPoints, templatePoints) {
  return userPoints.map(([ux, uy]) => pointToPath(ux, uy, templatePoints));
}

// Composite score
export function compositeScore(userPoints, templatePoints) {
  const acc = accuracyScore(userPoints, templatePoints);
  const cov = coverageScore(userPoints, templatePoints);
  const smooth = smoothnessScore(userPoints);
  // Weighted blend: accuracy 45%, coverage 40%, smoothness 15%
  const overall = acc * 0.45 + cov * 0.40 + smooth * 0.15;
  return { accuracy: acc, coverage: cov, smoothness: smooth, overall };
}

// Color for a given distance (for real-time stroke coloring)
export function distanceColor(dist, maxDist = 8) {
  const ratio = Math.min(dist / maxDist, 1);
  if (ratio < 0.35) return '#66bb6a'; // green — on track
  if (ratio < 0.65) return '#ffa726'; // orange — drifting
  return '#ef5350';                    // red — off path
}

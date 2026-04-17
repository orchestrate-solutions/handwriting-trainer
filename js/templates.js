// Letter template definitions
// Each letter: array of strokes, each stroke: array of [x, y] waypoints
// Coordinate space: 0–100 (scaled to canvas at runtime)
// Stroke direction follows natural writing order

export const TEMPLATES = {
  A: [
    [[15, 95], [50, 5]],
    [[50, 5], [85, 95]],
    [[30, 58], [70, 58]]
  ],
  B: [
    [[20, 5], [20, 95]],
    [[20, 5], [55, 5], [70, 12], [72, 25], [68, 38], [52, 45], [20, 45]],
    [[20, 45], [58, 45], [76, 55], [78, 70], [74, 85], [56, 95], [20, 95]]
  ],
  C: [
    [[75, 18], [60, 8], [45, 5], [30, 10], [20, 22], [15, 40], [15, 60], [20, 78], [30, 90], [45, 95], [60, 92], [75, 82]]
  ],
  D: [
    [[22, 5], [22, 95]],
    [[22, 5], [50, 5], [70, 15], [80, 35], [82, 50], [80, 65], [70, 85], [50, 95], [22, 95]]
  ],
  E: [
    [[70, 5], [20, 5], [20, 95], [70, 95]],
    [[20, 50], [60, 50]]
  ],
  F: [
    [[70, 5], [20, 5], [20, 95]],
    [[20, 50], [58, 50]]
  ],
  G: [
    [[75, 18], [60, 8], [45, 5], [30, 10], [20, 22], [15, 40], [15, 60], [20, 78], [30, 90], [45, 95], [60, 92], [75, 80], [75, 55], [55, 55]]
  ],
  H: [
    [[20, 5], [20, 95]],
    [[80, 5], [80, 95]],
    [[20, 50], [80, 50]]
  ],
  I: [
    [[35, 5], [65, 5]],
    [[50, 5], [50, 95]],
    [[35, 95], [65, 95]]
  ],
  J: [
    [[35, 5], [70, 5]],
    [[58, 5], [58, 75], [50, 88], [38, 95], [25, 90], [20, 78]]
  ],
  K: [
    [[22, 5], [22, 95]],
    [[75, 5], [22, 52]],
    [[38, 38], [78, 95]]
  ],
  L: [
    [[22, 5], [22, 95], [75, 95]]
  ],
  M: [
    [[15, 95], [15, 5], [50, 60], [85, 5], [85, 95]]
  ],
  N: [
    [[20, 95], [20, 5], [80, 95], [80, 5]]
  ],
  O: [
    [[50, 5], [32, 7], [18, 18], [12, 35], [12, 65], [18, 82], [32, 93], [50, 95], [68, 93], [82, 82], [88, 65], [88, 35], [82, 18], [68, 7], [50, 5]]
  ],
  P: [
    [[22, 95], [22, 5]],
    [[22, 5], [58, 5], [74, 12], [78, 25], [74, 40], [58, 48], [22, 50]]
  ],
  Q: [
    [[50, 5], [32, 7], [18, 18], [12, 35], [12, 65], [18, 82], [32, 93], [50, 95], [68, 93], [82, 82], [88, 65], [88, 35], [82, 18], [68, 7], [50, 5]],
    [[62, 75], [85, 98]]
  ],
  R: [
    [[22, 95], [22, 5]],
    [[22, 5], [58, 5], [74, 12], [78, 25], [74, 38], [58, 46], [22, 48]],
    [[52, 46], [80, 95]]
  ],
  S: [
    [[72, 18], [60, 8], [45, 5], [30, 10], [22, 20], [22, 30], [28, 42], [50, 50], [72, 58], [78, 70], [78, 80], [70, 90], [55, 95], [40, 92], [28, 82]]
  ],
  T: [
    [[10, 5], [90, 5]],
    [[50, 5], [50, 95]]
  ],
  U: [
    [[20, 5], [20, 70], [28, 85], [42, 95], [58, 95], [72, 85], [80, 70], [80, 5]]
  ],
  V: [
    [[15, 5], [50, 95], [85, 5]]
  ],
  W: [
    [[8, 5], [25, 95], [42, 40], [50, 60], [58, 40], [75, 95], [92, 5]]
  ],
  X: [
    [[18, 5], [82, 95]],
    [[82, 5], [18, 95]]
  ],
  Y: [
    [[15, 5], [50, 50]],
    [[85, 5], [50, 50]],
    [[50, 50], [50, 95]]
  ],
  Z: [
    [[18, 5], [82, 5], [18, 95], [82, 95]]
  ]
};

// Interpolate waypoints into dense point arrays for smooth rendering/comparison
export function densifyStroke(waypoints, density = 2) {
  const points = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [ax, ay] = waypoints[i];
    const [bx, by] = waypoints[i + 1];
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.round(dist / density));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      points.push([ax + t * (bx - ax), ay + t * (by - ay)]);
    }
  }
  return points;
}

// Get all template points (densified) for a letter
export function getTemplatePoints(letter) {
  const strokes = TEMPLATES[letter];
  if (!strokes) return [];
  const all = [];
  for (const stroke of strokes) {
    all.push(...densifyStroke(stroke));
  }
  return all;
}

// Get strokes as dense arrays
export function getTemplateStrokes(letter) {
  const strokes = TEMPLATES[letter];
  if (!strokes) return [];
  return strokes.map(s => densifyStroke(s));
}

export const LETTER_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

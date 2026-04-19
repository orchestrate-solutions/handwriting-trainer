// js/difficulty.js — Difficulty level definitions
// guideOpacity: how visible the template ghost is (lower = harder to see)
// guideStrokeWidth: stroke-based guide line width (px at 400px canvas, scaled)
// maxDist: tolerance window for scoring in template-space units (0–100 scale)

export const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
    guideStrokeWidth: 6,
    maxDist: 12,
  },
  {
    id: 'medium',
    label: 'Medium',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
    guideStrokeWidth: 3,
    maxDist: 8,
  },
  {
    id: 'hard',
    label: 'Hard',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
    guideStrokeWidth: 1.5,
    maxDist: 5,
  },
  {
    id: 'professional',
    label: 'Pro',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
    guideStrokeWidth: 0.75,
    maxDist: 3,
  },
];

export const DEFAULT_DIFFICULTY = DIFFICULTIES[1]; // medium

// js/difficulty.js — Difficulty level definitions
// guideOpacity: how visible the template ghost is (lower = harder to see)
// maxDist: tolerance window for scoring in template-space units (0–100 scale)
//   Easy   → 12 units — very forgiving, almost anywhere on the letter counts
//   Medium → 8  units — current baseline
//   Hard   → 5  units — must stay close to the template
//   Pro    → 3  units — near-pixel-perfect tracing required

export const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
    maxDist: 12,
  },
  {
    id: 'medium',
    label: 'Medium',
    guideOpacity: 0.22,
    glowOpacity: 0.10,
    glowBlur: 0.08,
    maxDist: 8,
  },
  {
    id: 'hard',
    label: 'Hard',
    guideOpacity: 0.08,
    glowOpacity: 0.04,
    glowBlur: 0.06,
    maxDist: 5,
  },
  {
    id: 'professional',
    label: 'Pro',
    guideOpacity: 0.02,
    glowOpacity: 0.01,
    glowBlur: 0.03,
    maxDist: 3,
  },
];

export const DEFAULT_DIFFICULTY = DIFFICULTIES[1]; // medium

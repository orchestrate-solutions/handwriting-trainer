// js/difficulty.js — Difficulty level definitions
// Each level controls how visible the template guide is.
// Lower opacity = harder (less guide to trace over).

export const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    guideOpacity: 0.40,
    glowOpacity: 0.20,
    glowBlur: 0.12,
  },
  {
    id: 'medium',
    label: 'Medium',
    guideOpacity: 0.22,
    glowOpacity: 0.10,
    glowBlur: 0.08,
  },
  {
    id: 'hard',
    label: 'Hard',
    guideOpacity: 0.08,
    glowOpacity: 0.04,
    glowBlur: 0.06,
  },
  {
    id: 'professional',
    label: 'Pro',
    guideOpacity: 0.02,
    glowOpacity: 0.01,
    glowBlur: 0.03,
  },
];

export const DEFAULT_DIFFICULTY = DIFFICULTIES[1]; // medium

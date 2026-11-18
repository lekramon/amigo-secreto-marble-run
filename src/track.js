export const TRACK_START_Z = -4750;
export const TRACK_FINISH_Z = 450;
export const TRACK_LENGTH = TRACK_FINISH_Z - TRACK_START_Z;
export const TRACK_BOOST_ZONES = [
  [0.195, 0.235],
  [0.435, 0.475],
  [0.725, 0.765],
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(first, second, amount) {
  return first + (second - first) * amount;
}

export function applyTrackBoosts(progress) {
  const t = clamp01(progress);
  let offset = 0;

  TRACK_BOOST_ZONES.forEach(([start, end]) => {
    if (t < start || t > end) return;
    offset += Math.sin(((t - start) / (end - start)) * Math.PI) * 0.011;
  });

  return clamp01(t + offset);
}

export function trackSurfaceY(progress) {
  const t = clamp01(progress);

  if (t <= 0.1) return -190;
  if (t <= 0.38) return mix(-190, 105, smoothstep((t - 0.1) / 0.28));
  if (t <= 0.54) return 105 - Math.sin(((t - 0.38) / 0.16) * Math.PI) * 90;
  if (t <= 0.7) return 105 + Math.sin(((t - 0.54) / 0.16) * Math.PI) * 55;
  if (t <= 0.84) return 105 - Math.sin(((t - 0.7) / 0.14) * Math.PI) * 28;
  return mix(105, 95, smoothstep((t - 0.84) / 0.16));
}

export function trackCenterX(progress) {
  const t = clamp01(progress);
  const envelope = Math.sin(t * Math.PI) ** 1.35;
  return Math.sin((t - 0.22) * Math.PI * 3.4) * envelope * 185;
}

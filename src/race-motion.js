function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndexes(length, seed) {
  const indexes = Array.from({ length }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [indexes[index], indexes[target]] = [indexes[target], indexes[index]];
  }
  return indexes;
}

function gaussian(value, center, width) {
  const distance = (value - center) / width;
  return Math.exp(-0.5 * distance * distance);
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function buildProgressSamples(seed) {
  const random = seededRandom(seed);
  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;
  const firstSurge = 0.16 + random() * 0.28;
  const secondSurge = 0.5 + random() * 0.3;
  const firstStrength = 0.55 + random() * 0.75;
  const secondStrength = 0.5 + random() * 0.85;
  const sampleCount = 240;
  const cumulative = [0];

  for (let index = 1; index <= sampleCount; index += 1) {
    const t = (index - 0.5) / sampleCount;
    const changingPace =
      Math.sin(t * Math.PI * 3.2 + phaseA) * 0.34
      + Math.sin(t * Math.PI * 8.4 + phaseB) * 0.2;
    const surges =
      gaussian(t, firstSurge, 0.055) * firstStrength
      + gaussian(t, secondSurge, 0.07) * secondStrength;
    const speed = Math.max(0.16, 0.68 + changingPace + surges);
    cumulative.push(cumulative[cumulative.length - 1] + speed);
  }

  const total = cumulative[cumulative.length - 1];
  return cumulative.map((value) => value / total);
}

export function createRaceDynamics(participants, finalOrder, seed) {
  const finishIndex = new Map(finalOrder.map(({ id }, index) => [id, index]));
  const finishLanes = shuffledIndexes(participants.length, `${seed}:finish-lanes`);
  const dynamics = new Map();

  participants.forEach((participant, startIndex) => {
    const rank = finishIndex.get(participant.id);
    const lateralRandom = seededRandom(`${seed}:${participant.id}:lateral`);
    dynamics.set(participant.id, {
      id: participant.id,
      finishIndex: rank,
      finishLaneIndex: finishLanes[startIndex],
      duration: 15500 + rank * 260,
      samples: buildProgressSamples(`${seed}:${participant.id}:pace`),
      lateralOffsets: [
        0,
        lateralRandom() * 0.9 - 0.45,
        lateralRandom() * 0.9 - 0.45,
        lateralRandom() * 0.9 - 0.45,
        lateralRandom() * 0.9 - 0.45,
        0,
      ],
    });
  });

  return dynamics;
}

export function sampleRaceProgress(profile, rawProgress) {
  const raw = Math.max(0, Math.min(1, rawProgress));
  if (raw === 0 || raw === 1) return raw;
  const scaled = raw * (profile.samples.length - 1);
  const lower = Math.floor(scaled);
  const amount = scaled - lower;
  return profile.samples[lower] + (profile.samples[lower + 1] - profile.samples[lower]) * amount;
}

export function orderLiveRace(racers) {
  return [...racers].sort((first, second) => {
    const progressDifference = second.progress - first.progress;
    if (Math.abs(progressDifference) > 0.000001) return progressDifference;
    if (first.progress >= 0.999999 && second.progress >= 0.999999) {
      return first.finishIndex - second.finishIndex;
    }
    return (first.startIndex ?? first.finishIndex) - (second.startIndex ?? second.finishIndex);
  });
}

export function sampleRaceLateral(profile, progress, startX, finishX, laneGap) {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return startX;
  if (t === 1) return finishX;

  const laneChange = smoothstep((t - 0.04) / 0.92);
  const base = startX + (finishX - startX) * laneChange;
  const scaled = t * (profile.lateralOffsets.length - 1);
  const lower = Math.min(profile.lateralOffsets.length - 2, Math.floor(scaled));
  const amount = smoothstep(scaled - lower);
  const offset = profile.lateralOffsets[lower]
    + (profile.lateralOffsets[lower + 1] - profile.lateralOffsets[lower]) * amount;
  return base + offset * laneGap;
}

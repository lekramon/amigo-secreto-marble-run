import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTrackBoosts,
  TRACK_FINISH_Z,
  TRACK_START_Z,
  trackCenterX,
  trackSurfaceY,
} from '../src/track.js';

test('boosters avançam temporariamente a bolinha sem alterar início e chegada', () => {
  assert.equal(applyTrackBoosts(0), 0);
  assert.ok(applyTrackBoosts(0.215) > 0.224);
  assert.equal(applyTrackBoosts(0.3), 0.3);
  assert.equal(applyTrackBoosts(1), 1);
});

test('curva dos boosters permanece crescente e preserva a classificação', () => {
  const samples = Array.from({ length: 1001 }, (_, index) => applyTrackBoosts(index / 1000));
  for (let index = 1; index < samples.length; index += 1) {
    assert.ok(samples[index] >= samples[index - 1], `retrocesso no ponto ${index}`);
  }
});

test('percurso tem mais de sete quilômetros virtuais', () => {
  assert.ok(TRACK_FINISH_Z - TRACK_START_Z >= 7000);
});

test('percurso começa elevado e possui uma descida acentuada', () => {
  const start = trackSurfaceY(0.05);
  const bottom = trackSurfaceY(0.38);
  assert.ok(bottom - start >= 500, `desnível insuficiente: ${bottom - start}`);
});

test('percurso alterna subida, vale e estabiliza antes da chegada', () => {
  const afterDescent = trackSurfaceY(0.38);
  const hill = trackSurfaceY(0.5);
  const valley = trackSurfaceY(0.66);
  const finish = trackSurfaceY(1);

  assert.ok(hill < afterDescent - 55);
  assert.ok(valley > hill + 100);
  assert.ok(Math.abs(finish - afterDescent) < 35);
});

test('percurso possui curvas para os dois lados', () => {
  const samples = Array.from({ length: 41 }, (_, index) => trackCenterX(index / 40));
  assert.ok(Math.max(...samples) > 100);
  assert.ok(Math.min(...samples) < -100);
  assert.ok(Math.abs(trackCenterX(0)) < 1);
  assert.ok(Math.abs(trackCenterX(1)) < 1);
});

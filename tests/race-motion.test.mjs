import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRaceDynamics,
  orderLiveRace,
  sampleRaceLateral,
  sampleRaceProgress,
} from '../src/race-motion.js';

const participants = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
const finalOrder = ['c', 'a', 'f', 'd', 'b', 'e'].map((id) => ({ id }));

test('faixa de chegada do vencedor varia entre corridas', () => {
  const winnerLanes = new Set();
  for (let seed = 1; seed <= 24; seed += 1) {
    winnerLanes.add(createRaceDynamics(participants, finalOrder, seed).get('c').finishLaneIndex);
  }
  assert.ok(winnerLanes.size >= 4, `vencedor limitado às faixas ${[...winnerLanes]}`);
});

test('faixas finais são únicas e independentes da classificação', () => {
  const dynamics = createRaceDynamics(participants, finalOrder, 93821);
  const lanes = participants.map(({ id }) => dynamics.get(id).finishLaneIndex);
  assert.deepEqual([...lanes].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  assert.notEqual(dynamics.get('c').finishLaneIndex, 0);
});

test('movimento de cada bolinha avança sem retroceder', () => {
  const dynamics = createRaceDynamics(participants, finalOrder, 7123);
  dynamics.forEach((profile) => {
    let previous = 0;
    for (let index = 0; index <= 1000; index += 1) {
      const progress = sampleRaceProgress(profile, index / 1000);
      assert.ok(progress >= previous, `${profile.id} retrocedeu no ponto ${index}`);
      previous = progress;
    }
    assert.equal(sampleRaceProgress(profile, 0), 0);
    assert.equal(sampleRaceProgress(profile, 1), 1);
  });
});

test('trajetórias laterais variam sem prender o vencedor a um lado', () => {
  const dynamics = createRaceDynamics(participants, finalOrder, 93821);
  const winner = dynamics.get('c');
  const rival = dynamics.get('a');

  assert.equal(sampleRaceLateral(winner, 0, -200, 120, 80), -200);
  assert.equal(sampleRaceLateral(winner, 1, -200, 120, 80), 120);
  assert.notEqual(
    sampleRaceLateral(winner, 0.42, -200, 120, 80),
    sampleRaceLateral(rival, 0.42, -200, 120, 80),
  );
});

test('liderança intermediária não fica sempre com o futuro vencedor', () => {
  let winnerWasBehind = 0;
  const middleLeaders = new Set();

  for (let seed = 1; seed <= 24; seed += 1) {
    const dynamics = createRaceDynamics(participants, finalOrder, seed);
    const elapsed = 7800;
    const positions = participants.map(({ id }) => {
      const profile = dynamics.get(id);
      return {
        id,
        progress: sampleRaceProgress(profile, elapsed / profile.duration),
      };
    }).sort((first, second) => second.progress - first.progress);

    middleLeaders.add(positions[0].id);
    if (positions[0].id !== 'c') winnerWasBehind += 1;
  }

  assert.ok(middleLeaders.size >= 3);
  assert.ok(winnerWasBehind >= 8, `vencedor ficou atrás em apenas ${winnerWasBehind} corridas`);
});

test('classificação ao vivo segue a posição e desempata a chegada final', () => {
  const racers = [
    { id: 'a', progress: 0.42, finishIndex: 1 },
    { id: 'b', progress: 0.61, finishIndex: 2 },
    { id: 'c', progress: 0.53, finishIndex: 0 },
  ];
  assert.deepEqual(orderLiveRace(racers).map(({ id }) => id), ['b', 'c', 'a']);

  racers.forEach((racer) => { racer.progress = 1; });
  assert.deepEqual(orderLiveRace(racers).map(({ id }) => id), ['c', 'a', 'b']);

  const grid = [
    { id: 'a', progress: 0, startIndex: 2, finishIndex: 0 },
    { id: 'b', progress: 0, startIndex: 0, finishIndex: 2 },
    { id: 'c', progress: 0, startIndex: 1, finishIndex: 1 },
  ];
  assert.deepEqual(orderLiveRace(grid).map(({ id }) => id), ['b', 'c', 'a']);
});

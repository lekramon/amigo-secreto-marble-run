import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceAudio } from '../src/audio.js';

test('áudio opcional falha de forma segura quando AudioContext não pode ser criado', async () => {
  const audio = new RaceAudio(() => {
    throw new Error('AudioContext bloqueado');
  });

  assert.equal(await audio.unlock(), false);
  assert.equal(audio.enabled, false);
  assert.equal(audio.context, null);
});

test('áudio opcional não bloqueia a corrida quando resume rejeita', async () => {
  const context = {
    state: 'suspended',
    destination: {},
    createGain() {
      return { gain: { value: 0 }, connect() {} };
    },
    async resume() {
      throw new Error('gesto recusado');
    },
  };
  const audio = new RaceAudio(() => context);

  assert.equal(await audio.unlock(), false);
  assert.equal(audio.enabled, false);
  assert.equal(audio.context, null);
});

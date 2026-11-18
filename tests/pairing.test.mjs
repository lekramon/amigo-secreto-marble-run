import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeededOrder,
  pairOuterIn,
  validateParticipants,
} from '../src/pairing.js';

const people = [
  { id: 'a', name: 'Ana', color: '#ff5d8f' },
  { id: 'b', name: 'Bia', color: '#38bdf8' },
  { id: 'c', name: 'Caio', color: '#facc15' },
  { id: 'd', name: 'Davi', color: '#4ade80' },
];

test('pareia primeiro com último e avança para o centro', () => {
  assert.deepEqual(pairOuterIn(people), [
    [people[0], people[3]],
    [people[1], people[2]],
  ]);
});

test('rejeita quantidade ímpar para não deixar ninguém sem par', () => {
  assert.throws(() => pairOuterIn(people.slice(0, 3)), /quantidade par/i);
});

test('ordem sorteada é determinística para a mesma semente', () => {
  const first = createSeededOrder(people, 20261224).map((person) => person.id);
  const second = createSeededOrder(people, 20261224).map((person) => person.id);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, people.map((person) => person.id));
});

test('valida nomes e cores únicas', () => {
  assert.equal(validateParticipants(people).valid, true);
  assert.equal(validateParticipants([...people, { id: 'e', name: '', color: '#ffffff' }]).valid, false);
  assert.equal(validateParticipants([...people.slice(0, 3), { id: 'x', name: 'Eva', color: '#ff5d8f' }]).valid, false);
});

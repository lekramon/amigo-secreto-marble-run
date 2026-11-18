import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  appendArrival,
  createSeededOrder,
  orderFinishers,
  pairOuterIn,
  validateParticipants,
} from '../src/pairing.js';
import { BRAZIL_STATES, findState } from '../src/states.js';
import { COUNTRIES, findCountry } from '../src/countries.js';
import { MARBLE_COLORS } from '../src/colors.js';

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

test('valida nomes e identificadores únicos', () => {
  assert.equal(validateParticipants(people).valid, true);
  assert.equal(validateParticipants([...people, { id: 'e', name: '', color: '#ffffff' }]).valid, false);
  assert.equal(validateParticipants([...people.slice(0, 3), { id: 'a', name: 'Eva', color: '#ff5d8f' }]).valid, false);
  assert.equal(validateParticipants([...people.slice(0, 3), { id: 'x', name: 'Eva', color: '#ff5d8f' }]).valid, true);
});

test('catálogo contém os 26 estados e o Distrito Federal com cores únicas', () => {
  assert.equal(BRAZIL_STATES.length, 27);
  assert.equal(new Set(BRAZIL_STATES.map((state) => state.code)).size, 27);
  assert.equal(new Set(BRAZIL_STATES.map((state) => state.color)).size, 27);
});

test('localiza estado pela sigla', () => {
  assert.deepEqual(findState('SP'), {
    code: 'SP',
    name: 'São Paulo',
    color: '#f43f5e',
    region: 'Sudeste',
    flag: './assets/flags/sp.svg',
  });
  assert.equal(findState('XX'), undefined);
});

test('cada estado aponta para uma bandeira SVG local existente', () => {
  for (const state of BRAZIL_STATES) {
    assert.equal(state.flag, `./assets/flags/${state.code.toLowerCase()}.svg`);
    assert.equal(
      existsSync(new URL(`../assets/flags/${state.code.toLowerCase()}.svg`, import.meta.url)),
      true,
      `bandeira ausente: ${state.code}`,
    );
  }
});

test('classificação registra cada chegada apenas uma vez', () => {
  const first = { id: 'SP', name: 'São Paulo' };
  const second = { id: 'RJ', name: 'Rio de Janeiro' };
  const arrivals = appendArrival(appendArrival([], first), second);

  assert.deepEqual(arrivals, [first, second]);
  assert.equal(appendArrival(arrivals, first), arrivals);
});

test('classificação ordena chegadas simultâneas pela posição final', () => {
  const finishers = [
    { id: 'RJ', finishIndex: 2 },
    { id: 'SP', finishIndex: 0 },
    { id: 'BR', finishIndex: 1 },
  ];

  assert.deepEqual(orderFinishers(finishers).map(({ id }) => id), ['SP', 'BR', 'RJ']);
  assert.deepEqual(finishers.map(({ id }) => id), ['RJ', 'SP', 'BR']);
});

test('catálogo de países tem bandeiras locais e nomes em português', () => {
  assert.ok(COUNTRIES.length >= 240);
  assert.equal(findCountry('BR').name, 'Brasil');
  assert.equal(findCountry('BR').flag, './assets/countries/br.svg');

  for (const country of COUNTRIES) {
    assert.equal(
      existsSync(new URL(`../assets/countries/${country.code.toLowerCase()}.svg`, import.meta.url)),
      true,
      `bandeira de país ausente: ${country.code}`,
    );
  }
});

test('catálogo de cores oferece bolinhas distintas', () => {
  assert.ok(MARBLE_COLORS.length >= 16);
  assert.equal(new Set(MARBLE_COLORS.map((color) => color.id)).size, MARBLE_COLORS.length);
  assert.equal(new Set(MARBLE_COLORS.map((color) => color.color)).size, MARBLE_COLORS.length);
  assert.ok(MARBLE_COLORS.every((color) => color.type === 'color' && color.flag === null));
});

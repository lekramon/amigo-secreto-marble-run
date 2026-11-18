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

export function createSeededOrder(participants, seed) {
  const order = [...participants];
  const random = seededRandom(seed);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }

  return order;
}

export function pairOuterIn(participants) {
  if (participants.length < 2 || participants.length % 2 !== 0) {
    throw new Error('O marble run precisa de uma quantidade par de participantes.');
  }

  const pairs = [];
  for (let left = 0, right = participants.length - 1; left < right; left += 1, right -= 1) {
    pairs.push([participants[left], participants[right]]);
  }
  return pairs;
}

export function validateParticipants(participants) {
  if (participants.length < 2) {
    return { valid: false, message: 'Adicione pelo menos duas pessoas.' };
  }

  if (participants.length % 2 !== 0) {
    return { valid: false, message: 'Adicione uma quantidade par de pessoas.' };
  }

  const names = participants.map(({ name }) => name.trim().toLocaleLowerCase('pt-BR'));
  if (names.some((name) => !name)) {
    return { valid: false, message: 'Todo mundo precisa informar um nome.' };
  }

  if (new Set(names).size !== names.length) {
    return { valid: false, message: 'Use nomes diferentes para cada participante.' };
  }

  const colors = participants.map(({ color }) => color.toLocaleLowerCase());
  if (new Set(colors).size !== colors.length) {
    return { valid: false, message: 'Cada pessoa precisa escolher uma cor diferente.' };
  }

  return { valid: true, message: '' };
}

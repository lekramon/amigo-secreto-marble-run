import { createSeededOrder, pairOuterIn, validateParticipants } from './pairing.js';
import { BRAZIL_STATES } from './states.js';

const DEMO_CODES = ['SP', 'RJ', 'MG', 'BA', 'PR', 'RS'];
const REGIONS = ['Todos', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const MAX_STATES = 12;

const state = {
  participants: [],
  region: 'Todos',
  seed: null,
  order: [],
  pairs: [],
  sketch: null,
  raceDone: false,
};

const elements = {
  setupView: document.querySelector('#setup-view'),
  gameView: document.querySelector('#game-view'),
  resultsView: document.querySelector('#results-view'),
  stateGrid: document.querySelector('#state-grid'),
  regionFilters: document.querySelector('#region-filters'),
  formMessage: document.querySelector('#form-message'),
  participantList: document.querySelector('#participant-list'),
  participantCount: document.querySelector('#participant-count'),
  startButton: document.querySelector('#start-button'),
  demoButton: document.querySelector('#demo-button'),
  raceStatus: document.querySelector('#race-status'),
  skipButton: document.querySelector('#skip-button'),
  pairGrid: document.querySelector('#pair-grid'),
  revealButton: document.querySelector('#reveal-button'),
  copyButton: document.querySelector('#copy-button'),
  restartButton: document.querySelector('#restart-button'),
};

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function createSeed() {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  return values[0] || Date.now();
}

function participantFromState(brazilState) {
  return {
    id: brazilState.code,
    code: brazilState.code,
    name: brazilState.name,
    color: brazilState.color,
    region: brazilState.region,
  };
}

function setMessage(message = '') {
  elements.formMessage.textContent = message;
}

function isSelected(code) {
  return state.participants.some((participant) => participant.code === code);
}

function renderRegionFilters() {
  elements.regionFilters.innerHTML = REGIONS.map((region) => `
    <button class="region-chip${state.region === region ? ' active' : ''}" type="button" data-region="${region}" aria-pressed="${state.region === region}">${region}</button>
  `).join('');

  elements.regionFilters.querySelectorAll('[data-region]').forEach((button) => {
    button.addEventListener('click', () => {
      state.region = button.dataset.region;
      renderRegionFilters();
      renderStateGrid();
    });
  });
}

function renderStateGrid() {
  const visibleStates = state.region === 'Todos'
    ? BRAZIL_STATES
    : BRAZIL_STATES.filter((brazilState) => brazilState.region === state.region);

  elements.stateGrid.innerHTML = visibleStates.map((brazilState) => {
    const selected = isSelected(brazilState.code);
    const disabled = !selected && state.participants.length >= MAX_STATES;
    return `
      <button class="state-option${selected ? ' selected' : ''}" type="button" data-state="${brazilState.code}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
        <span class="state-marble" style="--color:${brazilState.color}">${brazilState.code}</span>
        <span><strong>${brazilState.code}</strong><small>${escapeHtml(brazilState.name)}</small></span>
        <i>${selected ? '✓' : '+'}</i>
      </button>`;
  }).join('');

  elements.stateGrid.querySelectorAll('[data-state]').forEach((button) => {
    button.addEventListener('click', () => toggleState(button.dataset.state));
  });
}

function renderParticipants() {
  elements.participantCount.textContent = `${state.participants.length} / ${MAX_STATES}`;
  const validation = validateParticipants(state.participants);
  elements.startButton.disabled = !validation.valid;

  if (!state.participants.length) {
    elements.participantList.innerHTML = `
      <div class="empty-state">
        <span class="empty-orbit"><i></i></span>
        <p>Os estados selecionados aparecem aqui.</p>
      </div>`;
  } else {
    elements.participantList.innerHTML = state.participants.map((participant, index) => `
      <div class="participant">
        <span class="marble-mini" style="--color:${participant.color}">${participant.code}</span>
        <strong>${escapeHtml(participant.name)}</strong>
        <small>L${String(index + 1).padStart(2, '0')}</small>
        <button class="remove-button" type="button" data-remove="${participant.code}" aria-label="Remover ${escapeHtml(participant.name)}">×</button>
      </div>`).join('');

    elements.participantList.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => toggleState(button.dataset.remove));
    });
  }
}

function render() {
  renderRegionFilters();
  renderStateGrid();
  renderParticipants();
}

function toggleState(code) {
  if (isSelected(code)) {
    state.participants = state.participants.filter((participant) => participant.code !== code);
    setMessage('');
    render();
    return;
  }

  if (state.participants.length >= MAX_STATES) {
    setMessage('A pista comporta até 12 estados por corrida.');
    return;
  }

  const brazilState = BRAZIL_STATES.find((candidate) => candidate.code === code);
  if (!brazilState) return;
  state.participants.push(participantFromState(brazilState));
  setMessage(state.participants.length % 2 ? 'Selecione mais um estado para completar o par.' : 'Pista pronta para a largada.');
  render();
}

function waitForP5(maxWait = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (globalThis.p5) return resolve(globalThis.p5);
      if (Date.now() - started > maxWait) return reject(new Error('p5.js não carregou.'));
      setTimeout(check, 50);
    };
    check();
  });
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function startSketch(P5) {
  P5.disableFriendlyErrors = true;
  const container = document.querySelector('#canvas-container');
  const finishIndex = new Map(state.order.map((participant, index) => [participant.id, index]));
  const total = state.participants.length;

  state.sketch?.remove();

  state.sketch = new P5((p) => {
    const START_Z = -2300;
    const FINISH_Z = 330;
    const TRACK_LENGTH = 3050;
    const laneGap = Math.min(92, Math.max(52, 720 / total));
    const trackWidth = laneGap * total + 100;
    const marbleRadius = Math.min(35, Math.max(24, laneGap * 0.34));
    const marbles = state.participants.map((participant, startIndex) => ({
      ...participant,
      startIndex,
      finishIndex: finishIndex.get(participant.id),
      duration: 6500 + finishIndex.get(participant.id) * 240,
      phase: (startIndex + 1) * 1.731,
      z: START_Z,
      x: 0,
      progress: 0,
      label: null,
    }));
    let startedAt;
    let completed = false;
    let lastStatus = '';

    function dimensions() {
      return {
        width: Math.max(320, container.clientWidth),
        height: Math.max(520, container.clientHeight),
      };
    }

    function laneX(index) {
      return (index - (total - 1) / 2) * laneGap;
    }

    function finishRace() {
      if (completed) return;
      completed = true;
      state.raceDone = true;
      elements.raceStatus.textContent = 'Bandeirada! Formando os pares…';
      setTimeout(showResults, 1100);
    }

    function makeLabel(participant) {
      const graphic = p.createGraphics(160, 80);
      graphic.pixelDensity(1);
      graphic.clear();
      graphic.noStroke();
      graphic.fill(5, 10, 20, 225);
      graphic.rect(8, 8, 144, 64, 22);
      graphic.stroke(255, 255, 255, 65);
      graphic.strokeWeight(2);
      graphic.noFill();
      graphic.rect(8, 8, 144, 64, 22);
      graphic.noStroke();
      graphic.fill(255);
      graphic.textAlign(graphic.CENTER, graphic.CENTER);
      graphic.textStyle(graphic.BOLD);
      graphic.textSize(34);
      graphic.text(participant.code, 80, 42);
      return graphic;
    }

    p.setup = () => {
      const size = dimensions();
      p.pixelDensity(1);
      p.createCanvas(size.width, size.height, p.WEBGL).parent(container);
      p.frameRate(60);
      p.randomSeed(state.seed);
      p.noiseSeed(state.seed);
      p.perspective(p.PI / 3.2, size.width / size.height, 10, 7000);
      marbles.forEach((marble) => { marble.label = makeLabel(marble); });
      startedAt = p.millis();
      globalThis.__marbleRunReady = true;
    };

    p.draw = () => {
      const elapsed = p.millis() - startedAt;
      p.background(6, 10, 22);

      let finished = 0;
      marbles.forEach((marble) => {
        const raw = Math.max(0, Math.min(1, elapsed / marble.duration));
        marble.progress = smoothstep(raw);
        marble.z = p.lerp(START_Z, FINISH_Z, marble.progress);
        const baseX = p.lerp(laneX(marble.startIndex), laneX(marble.finishIndex), marble.progress);
        const weave = Math.sin(marble.progress * Math.PI * 7 + marble.phase) * laneGap * 0.16 * Math.sin(marble.progress * Math.PI);
        marble.x = baseX + weave;
        if (raw >= 1) finished += 1;
      });

      const leaderZ = Math.max(...marbles.map((marble) => marble.z));
      const cameraZ = Math.min(FINISH_Z + 930, leaderZ + 920);
      p.camera(0, -500, cameraZ, 0, 55, cameraZ - 920, 0, 1, 0);

      p.ambientLight(48, 58, 78);
      p.directionalLight(255, 242, 214, -0.4, 0.8, -0.55);
      p.directionalLight(74, 130, 255, 0.65, 0.2, 0.5);
      p.pointLight(180, 225, 255, 0, -250, leaderZ + 150);

      drawCircuit();
      marbles.slice().sort((a, b) => a.z - b.z).forEach(drawMarble);

      if (p.frameCount % 12 === 0) {
        const status = finished
          ? `${finished} de ${total} estados cruzaram a linha`
          : `Corrida 3D · ${total} estados na pista`;
        if (status !== lastStatus) {
          elements.raceStatus.textContent = status;
          lastStatus = status;
        }
      }

      if (finished === total || state.raceDone) finishRace();
    };

    p.windowResized = () => {
      const size = dimensions();
      p.resizeCanvas(size.width, size.height);
      p.perspective(p.PI / 3.2, size.width / size.height, 10, 7000);
    };

    function drawCircuit() {
      p.push();
      p.noStroke();
      p.ambientMaterial(19, 26, 39);
      p.translate(0, 118, (START_Z + FINISH_Z) / 2);
      p.box(trackWidth, 28, TRACK_LENGTH);
      p.pop();

      p.push();
      p.noStroke();
      p.ambientMaterial(23, 71, 52);
      p.translate(-(trackWidth / 2 + 170), 132, (START_Z + FINISH_Z) / 2);
      p.box(300, 18, TRACK_LENGTH);
      p.translate(trackWidth + 340, 0, 0);
      p.box(300, 18, TRACK_LENGTH);
      p.pop();

      for (let lane = 1; lane < total; lane += 1) {
        const x = laneX(lane) - laneGap / 2;
        for (let z = START_Z + 35; z < FINISH_Z; z += 155) {
          p.push();
          p.noStroke();
          p.emissiveMaterial(226, 232, 240);
          p.translate(x, 101, z);
          p.box(3, 3, 76);
          p.pop();
        }
      }

      drawKerb(-trackWidth / 2 - 8);
      drawKerb(trackWidth / 2 + 8);
      drawFinishLine();
      drawStartingGrid();
      drawGrandstands();
      drawTrackLights();
    }

    function drawKerb(x) {
      for (let z = START_Z; z < FINISH_Z + 70; z += 92) {
        const red = Math.floor((z - START_Z) / 92) % 2 === 0;
        p.push();
        p.noStroke();
        p.ambientMaterial(red ? 220 : 238, red ? 40 : 238, red ? 52 : 238);
        p.translate(x, 101, z + 46);
        p.box(22, 10, 92);
        p.pop();
      }

      p.push();
      p.noStroke();
      p.metalness(35);
      p.specularMaterial(112, 126, 148);
      p.translate(x + Math.sign(x) * 22, 42, (START_Z + FINISH_Z) / 2);
      p.box(7, 7, TRACK_LENGTH);
      p.translate(0, 55, 0);
      p.box(8, 8, TRACK_LENGTH);
      p.pop();
    }

    function drawFinishLine() {
      const tiles = 12;
      const tileWidth = trackWidth / tiles;
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < tiles; column += 1) {
          const light = (row + column) % 2 === 0;
          p.push();
          p.noStroke();
          p.emissiveMaterial(light ? 245 : 18, light ? 245 : 21, light ? 245 : 31);
          p.translate(-trackWidth / 2 + tileWidth / 2 + column * tileWidth, 99, FINISH_Z - 22 + row * 22);
          p.box(tileWidth + 1, 4, 23);
          p.pop();
        }
      }
    }

    function drawStartingGrid() {
      for (let lane = 0; lane < total; lane += 1) {
        p.push();
        p.noStroke();
        p.emissiveMaterial(218, 226, 238);
        p.translate(laneX(lane), 99, START_Z + 65);
        p.box(laneGap * 0.62, 4, 12);
        p.pop();
      }
    }

    function drawGrandstands() {
      for (const side of [-1, 1]) {
        for (let z = -40; z < FINISH_Z + 500; z += 145) {
          p.push();
          p.noStroke();
          p.ambientMaterial(24, 34, 55);
          p.translate(side * (trackWidth / 2 + 195), 54, z);
          p.box(230, 105, 118);
          p.ambientMaterial(53, 72, 104);
          p.translate(-side * 28, -70, 0);
          p.box(174, 42, 108);
          p.pop();
        }
      }
    }

    function drawTrackLights() {
      for (const side of [-1, 1]) {
        for (let z = START_Z + 260; z < FINISH_Z + 300; z += 430) {
          p.push();
          p.noStroke();
          p.ambientMaterial(75, 85, 105);
          p.translate(side * (trackWidth / 2 + 82), 0, z);
          p.box(8, 205, 8);
          p.emissiveMaterial(190, 230, 255);
          p.translate(-side * 15, -108, 0);
          p.box(42, 12, 18);
          p.pop();
        }
      }
    }

    function drawMarble(marble) {
      const bounce = Math.abs(Math.sin(marble.progress * Math.PI * 22 + marble.phase)) * 6;
      const spin = marble.progress * Math.PI * 28;

      p.push();
      p.noStroke();
      p.ambientMaterial(0, 0, 0, 90);
      p.translate(marble.x + 5, 101, marble.z + 8);
      p.rotateX(p.HALF_PI);
      p.ellipse(0, 0, marbleRadius * 1.55, marbleRadius * 0.72);
      p.pop();

      p.push();
      p.translate(marble.x, 78 - marbleRadius - bounce, marble.z);
      p.rotateX(spin);
      p.rotateZ(spin * 0.38 + marble.phase);
      p.noStroke();
      p.specularMaterial(marble.color);
      p.shininess(95);
      p.sphere(marbleRadius, 18, 12);
      p.pop();

      p.push();
      p.translate(marble.x, 31 - marbleRadius - bounce, marble.z + marbleRadius + 8);
      p.texture(marble.label);
      p.noStroke();
      p.plane(64, 32);
      p.pop();
    }
  });
}

function beginRace() {
  const validation = validateParticipants(state.participants);
  if (!validation.valid) return setMessage(validation.message);

  state.seed = createSeed();
  state.order = createSeededOrder(state.participants, state.seed);
  state.pairs = pairOuterIn(state.order);
  state.raceDone = false;
  elements.setupView.classList.add('hidden');
  elements.resultsView.classList.add('hidden');
  elements.gameView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  waitForP5()
    .then(startSketch)
    .catch(() => {
      elements.raceStatus.textContent = 'Animação indisponível; resultado calculado com segurança.';
      setTimeout(showResults, 800);
    });
}

function pairCard(pair, index) {
  const [first, last] = pair;
  return `
    <article class="pair-card" tabindex="0" role="button" aria-label="Revelar par ${index + 1}">
      <div class="pair-card-inner">
        <div class="pair-face pair-front"><span>TOQUE PARA REVELAR · PAR ${String(index + 1).padStart(2, '0')}</span></div>
        <div class="pair-face pair-back">
          <div class="pair-person"><div class="big-marble" style="--color:${first.color}">${first.code}</div><strong>${escapeHtml(first.name)}</strong></div>
          <span class="link-symbol">↔</span>
          <div class="pair-person"><div class="big-marble" style="--color:${last.color}">${last.code}</div><strong>${escapeHtml(last.name)}</strong></div>
        </div>
      </div>
    </article>`;
}

function showResults() {
  state.raceDone = true;
  state.sketch?.noLoop?.();
  elements.gameView.classList.add('hidden');
  elements.resultsView.classList.remove('hidden');
  elements.pairGrid.innerHTML = state.pairs.map(pairCard).join('');
  elements.revealButton.textContent = 'Revelar todos';
  elements.pairGrid.querySelectorAll('.pair-card').forEach((card) => {
    const reveal = () => card.classList.toggle('revealed');
    card.addEventListener('click', reveal);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reveal();
      }
    });
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function copyResults() {
  const text = [
    '🎁 Pares do Marble Match Brasil',
    '',
    ...state.pairs.map(([first, last], index) => `${index + 1}. ${first.name} (${first.code}) ↔ ${last.name} (${last.code})`),
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    elements.copyButton.textContent = 'Copiado!';
    setTimeout(() => { elements.copyButton.textContent = 'Copiar resultado'; }, 1600);
  } catch {
    elements.copyButton.textContent = 'Não foi possível copiar';
  }
}

function resetGame() {
  state.sketch?.remove();
  state.sketch = null;
  state.order = [];
  state.pairs = [];
  state.raceDone = false;
  elements.resultsView.classList.add('hidden');
  elements.gameView.classList.add('hidden');
  elements.setupView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

elements.demoButton.addEventListener('click', () => {
  state.participants = BRAZIL_STATES
    .filter((brazilState) => DEMO_CODES.includes(brazilState.code))
    .map(participantFromState);
  setMessage('Exemplo pronto com seis estados.');
  render();
});

elements.startButton.addEventListener('click', beginRace);
elements.skipButton.addEventListener('click', showResults);
elements.revealButton.addEventListener('click', () => {
  const cards = [...elements.pairGrid.querySelectorAll('.pair-card')];
  const shouldReveal = cards.some((card) => !card.classList.contains('revealed'));
  cards.forEach((card) => card.classList.toggle('revealed', shouldReveal));
  elements.revealButton.textContent = shouldReveal ? 'Ocultar todos' : 'Revelar todos';
});
elements.copyButton.addEventListener('click', copyResults);
elements.restartButton.addEventListener('click', resetGame);

render();

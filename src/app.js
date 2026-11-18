import {
  appendArrival,
  createSeededOrder,
  orderFinishers,
  pairOuterIn,
  validateParticipants,
} from './pairing.js';
import { RaceAudio } from './audio.js';
import { BRAZIL_STATES } from './states.js';
import { COUNTRIES } from './countries.js';
import { MARBLE_COLORS } from './colors.js';

const REGIONS = ['Todos', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const MAX_MARBLES = 12;
const MODE_CONFIG = {
  states: { label: 'estado', placeholder: 'Buscar estado…' },
  countries: { label: 'país', placeholder: 'Buscar país…' },
  colors: { label: 'cor', placeholder: 'Buscar cor…' },
};

const raceAudio = new RaceAudio();

const state = {
  participants: [],
  mode: 'states',
  region: 'Todos',
  query: '',
  seed: null,
  order: [],
  pairs: [],
  arrivals: [],
  sketch: null,
  raceDone: false,
};

const elements = {
  setupView: document.querySelector('#setup-view'),
  gameView: document.querySelector('#game-view'),
  resultsView: document.querySelector('#results-view'),
  stateGrid: document.querySelector('#state-grid'),
  regionFilters: document.querySelector('#region-filters'),
  searchInput: document.querySelector('#item-search'),
  modeTabs: [...document.querySelectorAll('[data-mode]')],
  formMessage: document.querySelector('#form-message'),
  participantList: document.querySelector('#participant-list'),
  participantCount: document.querySelector('#participant-count'),
  startButton: document.querySelector('#start-button'),
  demoButton: document.querySelector('#demo-button'),
  raceStatus: document.querySelector('#race-status'),
  skipButton: document.querySelector('#skip-button'),
  arrivalList: document.querySelector('#arrival-list'),
  arrivalProgress: document.querySelector('#arrival-progress'),
  finalOrderList: document.querySelector('#final-order-list'),
  pairGrid: document.querySelector('#pair-grid'),
  revealButton: document.querySelector('#reveal-button'),
  copyButton: document.querySelector('#copy-button'),
  restartButton: document.querySelector('#restart-button'),
  soundToggle: document.querySelector('#sound-toggle'),
};

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function normalizeText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function createSeed() {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  return values[0] || Date.now();
}

function normalizeState(brazilState) {
  return {
    ...brazilState,
    id: `state-${brazilState.code}`,
    group: brazilState.region,
    type: 'state',
  };
}

function catalogForMode() {
  if (state.mode === 'countries') return COUNTRIES;
  if (state.mode === 'colors') return MARBLE_COLORS;
  return BRAZIL_STATES.map(normalizeState);
}

function visualMarkup(item, imageClass = 'state-flag') {
  if (item.flag) {
    return `<img class="${imageClass}" src="${item.flag}" alt="Bandeira de ${escapeHtml(item.name)}">`;
  }
  return `<span class="color-orb ${imageClass}" style="--color:${item.color}" aria-label="Cor ${escapeHtml(item.name)}">${item.code}</span>`;
}

function setMessage(message = '') {
  elements.formMessage.textContent = message;
}

function isSelected(id) {
  return state.participants.some((participant) => participant.id === id);
}

function renderModeTabs() {
  elements.modeTabs.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  elements.searchInput.placeholder = MODE_CONFIG[state.mode].placeholder;
}

function renderRegionFilters() {
  const showRegions = state.mode === 'states';
  elements.regionFilters.classList.toggle('hidden', !showRegions);
  if (!showRegions) {
    elements.regionFilters.innerHTML = '';
    return;
  }

  elements.regionFilters.innerHTML = REGIONS.map((region) => `
    <button class="region-chip${state.region === region ? ' active' : ''}" type="button" data-region="${region}" aria-pressed="${state.region === region}">${region}</button>
  `).join('');

  elements.regionFilters.querySelectorAll('[data-region]').forEach((button) => {
    button.addEventListener('click', () => {
      state.region = button.dataset.region;
      renderRegionFilters();
      renderItemGrid();
    });
  });
}

function filteredCatalog() {
  const query = normalizeText(state.query.trim());
  return catalogForMode().filter((item) => {
    if (state.mode === 'states' && state.region !== 'Todos' && item.region !== state.region) return false;
    if (!query) return true;
    return normalizeText(`${item.name} ${item.code}`).includes(query);
  });
}

function renderItemGrid() {
  const items = filteredCatalog();
  elements.stateGrid.innerHTML = items.map((item) => {
    const selected = isSelected(item.id);
    const disabled = !selected && state.participants.length >= MAX_MARBLES;
    return `
      <button class="state-option${selected ? ' selected' : ''}" type="button" data-item="${item.id}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
        <span class="state-flag-shell">${visualMarkup(item)}</span>
        <span><strong>${item.code}</strong><small>${escapeHtml(item.name)}</small></span>
        <i>${selected ? '✓' : '+'}</i>
      </button>`;
  }).join('') || '<p class="no-items">Nenhuma bolinha encontrada.</p>';

  elements.stateGrid.querySelectorAll('[data-item]').forEach((button) => {
    button.addEventListener('click', () => toggleItem(button.dataset.item));
  });
}

function renderParticipants() {
  elements.participantCount.textContent = `${state.participants.length} / ${MAX_MARBLES}`;
  const validation = validateParticipants(state.participants);
  elements.startButton.disabled = !validation.valid;

  if (!state.participants.length) {
    elements.participantList.innerHTML = `
      <div class="empty-state">
        <span class="empty-orbit"><i></i></span>
        <p>As bolinhas selecionadas aparecem aqui.</p>
      </div>`;
  } else {
    elements.participantList.innerHTML = state.participants.map((participant, index) => `
      <div class="participant">
        <span class="mini-flag-shell">${visualMarkup(participant, 'mini-flag')}</span>
        <strong>${escapeHtml(participant.name)}</strong>
        <small>L${String(index + 1).padStart(2, '0')}</small>
        <button class="remove-button" type="button" data-remove="${participant.id}" aria-label="Remover ${escapeHtml(participant.name)}">×</button>
      </div>`).join('');

    elements.participantList.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => toggleItem(button.dataset.remove));
    });
  }
}

function render() {
  renderModeTabs();
  renderRegionFilters();
  renderItemGrid();
  renderParticipants();
}

function findCatalogItem(id) {
  return [...BRAZIL_STATES.map(normalizeState), ...COUNTRIES, ...MARBLE_COLORS]
    .find((item) => item.id === id);
}

function toggleItem(id) {
  if (isSelected(id)) {
    state.participants = state.participants.filter((participant) => participant.id !== id);
    setMessage('');
    render();
    return;
  }

  if (state.participants.length >= MAX_MARBLES) {
    setMessage('A pista comporta até 12 bolinhas por corrida.');
    return;
  }

  const item = findCatalogItem(id);
  if (!item) return;
  state.participants.push({ ...item });
  setMessage(state.participants.length % 2 ? 'Selecione mais uma bolinha para completar o par.' : 'Pista pronta para a largada.');
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

function ordinal(position) {
  return `${position}º`;
}

function renderArrivalBoard() {
  elements.arrivalProgress.textContent = `${state.arrivals.length}/${state.participants.length}`;
  elements.arrivalList.innerHTML = state.arrivals.map((participant, index) => `
    <li class="arrival-entry${index < 3 ? ` podium p${index + 1}` : ''}">
      <b>${ordinal(index + 1)}</b>
      <span class="arrival-flag">${visualMarkup(participant, 'mini-flag')}</span>
      <span><strong>${participant.code}</strong><small>${escapeHtml(participant.name)}</small></span>
    </li>
  `).join('');
}

function recordArrival(participant) {
  const previousLength = state.arrivals.length;
  state.arrivals = appendArrival(state.arrivals, participant);
  if (state.arrivals.length === previousLength) return;
  renderArrivalBoard();
  raceAudio.arrival(state.arrivals.length);
}

function renderFinalOrder() {
  const order = state.arrivals.length === state.order.length ? state.arrivals : state.order;
  elements.finalOrderList.innerHTML = order.map((participant, index) => `
    <li class="final-order-item${index < 3 ? ` podium p${index + 1}` : ''}">
      <b>${ordinal(index + 1)}</b>
      <span class="final-flag">${visualMarkup(participant, 'mini-flag')}</span>
      <span><strong>${participant.code}</strong><small>${escapeHtml(participant.name)}</small></span>
    </li>
  `).join('');
}

function startSketch(P5) {
  P5.disableFriendlyErrors = true;
  const container = document.querySelector('#canvas-container');
  const finishIndex = new Map(state.order.map((participant, index) => [participant.id, index]));
  const total = state.participants.length;

  state.sketch?.remove();

  state.sketch = new P5((p) => {
    const START_Z = -2450;
    const FINISH_Z = 370;
    const TRACK_LENGTH = 3300;
    const COUNTDOWN_MS = 1320;
    const laneGap = Math.min(92, Math.max(52, 720 / total));
    const trackWidth = laneGap * total + 110;
    const marbleRadius = Math.min(37, Math.max(25, laneGap * 0.35));
    const marbles = state.participants.map((participant, startIndex) => ({
      ...participant,
      startIndex,
      finishIndex: finishIndex.get(participant.id),
      duration: 6900 + finishIndex.get(participant.id) * 300,
      phase: (startIndex + 1) * 1.731,
      z: START_Z,
      x: 0,
      progress: 0,
      arrived: false,
      flagImage: null,
      textureImage: null,
      label: null,
    }));
    let startedAt;
    let completed = false;
    let rollingStarted = false;
    let lastStatus = '';
    let raceSign;

    function dimensions() {
      return {
        width: Math.max(320, container.clientWidth),
        height: Math.max(560, container.clientHeight),
      };
    }

    function laneX(index) {
      return (index - (total - 1) / 2) * laneGap;
    }

    function finishRace() {
      if (completed) return;
      completed = true;
      state.raceDone = true;
      raceAudio.finishFanfare();
      elements.raceStatus.textContent = 'Bandeirada! Classificação confirmada.';
      setTimeout(showResults, 1400);
    }

    function makeColorTexture(participant) {
      const graphic = p.createGraphics(128, 128);
      graphic.pixelDensity(1);
      graphic.background(participant.color);
      graphic.noStroke();
      graphic.fill(255, 255, 255, 55);
      graphic.ellipse(38, 32, 44, 32);
      graphic.fill(0, 0, 0, 36);
      graphic.rect(0, 86, 128, 42);
      graphic.fill(255);
      graphic.textAlign(graphic.CENTER, graphic.CENTER);
      graphic.textStyle(graphic.BOLD);
      graphic.textSize(34);
      graphic.text(participant.code, 64, 103);
      return graphic;
    }

    function makeLabel(participant) {
      const graphic = p.createGraphics(180, 78);
      graphic.pixelDensity(1);
      graphic.clear();
      graphic.noStroke();
      graphic.fill(5, 10, 20, 232);
      graphic.rect(5, 6, 170, 66, 21);
      graphic.stroke(255, 255, 255, 65);
      graphic.strokeWeight(2);
      graphic.noFill();
      graphic.rect(5, 6, 170, 66, 21);
      graphic.noStroke();
      if (participant.flagImage) {
        graphic.image(participant.flagImage, 15, 14, 66, 50);
      } else {
        graphic.fill(participant.color);
        graphic.circle(48, 39, 48);
      }
      graphic.fill(255);
      graphic.textAlign(graphic.CENTER, graphic.CENTER);
      graphic.textStyle(graphic.BOLD);
      graphic.textSize(30);
      graphic.text(participant.code, 126, 41);
      return graphic;
    }

    function makeRaceSign() {
      const graphic = p.createGraphics(460, 105);
      graphic.pixelDensity(1);
      graphic.background(10, 14, 28);
      graphic.noStroke();
      for (let index = 0; index < 16; index += 1) {
        graphic.fill(index % 2 ? '#22d3ee' : '#c8f560');
        graphic.rect(index * 30, 0, 30, 8);
        graphic.rect(index * 30, 97, 30, 8);
      }
      graphic.fill(245);
      graphic.textAlign(graphic.CENTER, graphic.CENTER);
      graphic.textStyle(graphic.BOLD);
      graphic.textSize(39);
      graphic.text('WORLD MARBLE GP', 230, 54);
      return graphic;
    }

    p.preload = () => {
      marbles.forEach((marble) => {
        if (marble.flag) marble.flagImage = p.loadImage(marble.flag);
      });
    };

    p.setup = () => {
      const size = dimensions();
      p.pixelDensity(1);
      p.createCanvas(size.width, size.height, p.WEBGL).parent(container);
      p.frameRate(60);
      p.randomSeed(state.seed);
      p.noiseSeed(state.seed);
      p.perspective(p.PI / 3.15, size.width / size.height, 10, 7500);
      marbles.forEach((marble) => {
        marble.textureImage = marble.flagImage || makeColorTexture(marble);
        marble.label = makeLabel(marble);
      });
      raceSign = makeRaceSign();
      startedAt = p.millis();
      globalThis.__marbleRunReady = true;
    };

    p.draw = () => {
      const elapsed = p.millis() - startedAt;
      const raceElapsed = Math.max(0, elapsed - COUNTDOWN_MS);
      p.background(5, 9, 22);

      if (elapsed >= COUNTDOWN_MS && !rollingStarted) {
        rollingStarted = true;
        raceAudio.startRolling();
      }

      const finishers = [];
      marbles.forEach((marble) => {
        const raw = Math.max(0, Math.min(1, raceElapsed / marble.duration));
        marble.progress = smoothstep(raw);
        marble.z = p.lerp(START_Z, FINISH_Z, marble.progress);
        const baseX = p.lerp(laneX(marble.startIndex), laneX(marble.finishIndex), marble.progress);
        const weave = Math.sin(marble.progress * Math.PI * 8 + marble.phase) * laneGap * 0.18 * Math.sin(marble.progress * Math.PI);
        marble.x = baseX + weave;
        if (raw >= 1 && !marble.arrived) {
          finishers.push(marble);
        }
      });

      orderFinishers(finishers).forEach((marble) => {
        marble.arrived = true;
        recordArrival(marble);
      });

      const leaderZ = Math.max(...marbles.map((marble) => marble.z));
      const cameraZ = Math.min(FINISH_Z + 960, leaderZ + 940);
      p.camera(0, -510, cameraZ, 0, 52, cameraZ - 940, 0, 1, 0);

      p.ambientLight(24, 30, 46);
      p.directionalLight(150, 142, 130, -0.35, 0.8, -0.55);
      p.directionalLight(38, 78, 145, 0.7, 0.15, 0.5);
      p.pointLight(82, 122, 160, 0, -260, leaderZ + 180);

      drawCircuit(elapsed);
      marbles.slice().sort((a, b) => a.z - b.z).forEach(drawMarble);

      if (p.frameCount % 12 === 0) {
        let status;
        if (elapsed < COUNTDOWN_MS) {
          status = `Luzes de largada · ${Math.max(1, 3 - Math.floor(elapsed / 420))}`;
        } else if (state.arrivals.length) {
          status = `${state.arrivals.length} de ${total} bolinhas classificadas`;
        } else {
          status = `World Marble GP · ${total} bolinhas acelerando`;
        }
        if (status !== lastStatus) {
          elements.raceStatus.textContent = status;
          lastStatus = status;
        }
      }

      if (state.arrivals.length === total || state.raceDone) finishRace();
    };

    p.windowResized = () => {
      const size = dimensions();
      p.resizeCanvas(size.width, size.height);
      p.perspective(p.PI / 3.15, size.width / size.height, 10, 7500);
    };

    function drawCircuit(elapsed) {
      drawTrackBase();
      drawColoredLanes();
      drawKerbsAndRails();
      drawFinishLine();
      drawStartingGrid();
      drawPitLane();
      drawGrandstands();
      drawTrackLights();
      drawGantry(START_Z + 125, false, elapsed);
      drawGantry(FINISH_Z + 100, true, elapsed);
    }

    function drawTrackBase() {
      p.push();
      p.noStroke();
      p.ambientMaterial(16, 23, 36);
      p.translate(0, 118, (START_Z + FINISH_Z) / 2);
      p.box(trackWidth, 30, TRACK_LENGTH);
      p.pop();

      for (const side of [-1, 1]) {
        p.push();
        p.noStroke();
        p.ambientMaterial(18, 72, 49);
        p.translate(side * (trackWidth / 2 + 190), 134, (START_Z + FINISH_Z) / 2);
        p.box(330, 18, TRACK_LENGTH);
        p.pop();
      }
    }

    function drawColoredLanes() {
      state.participants.forEach((participant, lane) => {
        const x = laneX(lane);
        p.push();
        p.noStroke();
        p.emissiveMaterial(participant.color);
        p.translate(x, 101, (START_Z + FINISH_Z) / 2);
        p.box(3, 3, TRACK_LENGTH - 80);
        p.pop();
      });

      for (let lane = 1; lane < total; lane += 1) {
        const x = laneX(lane) - laneGap / 2;
        for (let z = START_Z + 35; z < FINISH_Z; z += 155) {
          p.push();
          p.noStroke();
          p.emissiveMaterial(225, 232, 241);
          p.translate(x, 100, z);
          p.box(3, 3, 74);
          p.pop();
        }
      }
    }

    function drawKerbsAndRails() {
      for (const side of [-1, 1]) {
        const x = side * (trackWidth / 2 + 8);
        for (let z = START_Z; z < FINISH_Z + 90; z += 92) {
          const red = Math.floor((z - START_Z) / 92) % 2 === 0;
          p.push();
          p.noStroke();
          p.ambientMaterial(red ? 226 : 240, red ? 42 : 240, red ? 58 : 240);
          p.translate(x, 101, z + 46);
          p.box(23, 10, 92);
          p.pop();
        }

        p.push();
        p.noStroke();
        p.specularMaterial(112, 126, 148);
        p.translate(x + side * 24, 42, (START_Z + FINISH_Z) / 2);
        p.box(8, 8, TRACK_LENGTH);
        p.translate(0, 56, 0);
        p.box(9, 9, TRACK_LENGTH);
        p.pop();

        p.push();
        p.noStroke();
        p.emissiveMaterial(side < 0 ? '#22d3ee' : '#c8f560');
        p.translate(x + side * 26, 70, (START_Z + FINISH_Z) / 2);
        p.box(4, 4, TRACK_LENGTH);
        p.pop();
      }
    }

    function drawFinishLine() {
      const tiles = 14;
      const tileWidth = trackWidth / tiles;
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < tiles; column += 1) {
          const light = (row + column) % 2 === 0;
          p.push();
          p.noStroke();
          p.emissiveMaterial(light ? 245 : 14, light ? 245 : 18, light ? 245 : 28);
          p.translate(-trackWidth / 2 + tileWidth / 2 + column * tileWidth, 98, FINISH_Z - 28 + row * 19);
          p.box(tileWidth + 1, 4, 20);
          p.pop();
        }
      }
    }

    function drawStartingGrid() {
      for (let lane = 0; lane < total; lane += 1) {
        p.push();
        p.noStroke();
        p.emissiveMaterial(226, 232, 240);
        p.translate(laneX(lane), 99, START_Z + 65);
        p.box(laneGap * 0.64, 4, 12);
        p.translate(0, 0, -56);
        p.box(4, 4, 110);
        p.pop();
      }
    }

    function drawPitLane() {
      const pitX = trackWidth / 2 + 112;
      p.push();
      p.noStroke();
      p.ambientMaterial(26, 34, 48);
      p.translate(pitX, 116, -330);
      p.box(150, 20, 1350);
      p.emissiveMaterial('#38bdf8');
      p.translate(-55, -13, 0);
      p.box(4, 3, 1320);
      p.pop();

      for (let z = -900; z < 350; z += 175) {
        p.push();
        p.noStroke();
        p.ambientMaterial(33, 45, 65);
        p.translate(trackWidth / 2 + 255, 48, z);
        p.box(130, 135, 150);
        p.emissiveMaterial((Math.floor((z + 900) / 175) % 2) ? '#f97316' : '#22d3ee');
        p.translate(-67, -42, 0);
        p.box(5, 20, 120);
        p.pop();
      }
    }

    function drawGrandstands() {
      for (let z = -250; z < FINISH_Z + 560; z += 150) {
        p.push();
        p.noStroke();
        p.ambientMaterial(25, 36, 58);
        p.translate(-(trackWidth / 2 + 205), 58, z);
        p.box(235, 110, 122);
        p.ambientMaterial(56, 78, 112);
        p.translate(30, -72, 0);
        p.box(178, 42, 110);
        p.pop();
      }
    }

    function drawTrackLights() {
      for (const side of [-1, 1]) {
        for (let z = START_Z + 220; z < FINISH_Z + 350; z += 390) {
          p.push();
          p.noStroke();
          p.ambientMaterial(76, 86, 108);
          p.translate(side * (trackWidth / 2 + 86), 0, z);
          p.box(8, 205, 8);
          p.emissiveMaterial(side < 0 ? '#67e8f9' : '#d9f99d');
          p.translate(-side * 15, -108, 0);
          p.box(44, 12, 19);
          p.pop();
        }
      }
    }

    function drawGantry(z, finish, elapsed) {
      const width = trackWidth + 110;
      p.push();
      p.noStroke();
      p.specularMaterial(68, 79, 99);
      p.translate(-width / 2, -2, z);
      p.box(18, 235, 18);
      p.translate(width, 0, 0);
      p.box(18, 235, 18);
      p.translate(-width / 2, -116, 0);
      p.box(width + 20, 20, 22);
      p.pop();

      if (finish) {
        p.push();
        p.translate(0, -130, z + 12);
        p.texture(raceSign);
        p.noStroke();
        p.plane(Math.min(420, trackWidth * 0.75), 95);
        p.pop();
      } else {
        const phase = Math.floor(elapsed / 420);
        [-72, 0, 72].forEach((x, index) => {
          const active = phase <= index;
          const green = phase >= 3;
          p.push();
          p.noStroke();
          p.emissiveMaterial(green ? '#22c55e' : active ? '#ef4444' : '#3f1720');
          p.translate(x, -130, z + 15);
          p.sphere(18, 12, 8);
          p.pop();
        });
      }
    }

    function drawMarble(marble) {
      const bounce = Math.abs(Math.sin(marble.progress * Math.PI * 24 + marble.phase)) * 6;
      const spin = marble.progress * Math.PI * 30;

      p.push();
      p.noStroke();
      p.ambientMaterial(0, 0, 0, 90);
      p.translate(marble.x + 5, 101, marble.z + 8);
      p.rotateX(p.HALF_PI);
      p.ellipse(0, 0, marbleRadius * 1.6, marbleRadius * 0.74);
      p.pop();

      p.push();
      p.noFill();
      p.stroke(marble.color);
      p.strokeWeight(4);
      p.translate(marble.x, 100, marble.z);
      p.rotateX(p.HALF_PI);
      p.circle(0, 0, marbleRadius * 2.2);
      p.pop();

      p.push();
      p.translate(marble.x, 78 - marbleRadius - bounce, marble.z);
      p.rotateX(spin);
      p.rotateZ(spin * 0.38 + marble.phase);
      p.noStroke();
      p.texture(marble.textureImage);
      p.sphere(marbleRadius, 20, 14);
      p.pop();

      p.push();
      p.translate(marble.x, 29 - marbleRadius - bounce, marble.z + marbleRadius + 9);
      p.texture(marble.label);
      p.noStroke();
      p.plane(72, 31);
      p.pop();
    }
  });
}

async function beginRace() {
  const validation = validateParticipants(state.participants);
  if (!validation.valid) return setMessage(validation.message);

  state.seed = createSeed();
  state.order = createSeededOrder(state.participants, state.seed);
  state.pairs = pairOuterIn(state.order);
  state.arrivals = [];
  state.raceDone = false;
  renderArrivalBoard();
  elements.setupView.classList.add('hidden');
  elements.resultsView.classList.add('hidden');
  elements.gameView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const audioReady = await raceAudio.unlock();
  if (!audioReady) updateSoundButton();
  raceAudio.countdown();

  waitForP5()
    .then(startSketch)
    .catch(() => {
      elements.raceStatus.textContent = 'Animação indisponível; resultado calculado com segurança.';
      state.arrivals = [...state.order];
      renderArrivalBoard();
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
          <div class="pair-person"><div class="big-marble" style="--color:${first.color}">${visualMarkup(first, 'pair-flag')}</div><strong>${escapeHtml(first.name)}</strong></div>
          <span class="link-symbol">↔</span>
          <div class="pair-person"><div class="big-marble" style="--color:${last.color}">${visualMarkup(last, 'pair-flag')}</div><strong>${escapeHtml(last.name)}</strong></div>
        </div>
      </div>
    </article>`;
}

function showResults() {
  if (!state.arrivals.length) state.arrivals = [...state.order];
  state.raceDone = true;
  raceAudio.stopRolling();
  state.sketch?.noLoop?.();
  elements.gameView.classList.add('hidden');
  elements.resultsView.classList.remove('hidden');
  renderFinalOrder();
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
    '🏁 Ordem de chegada',
    ...state.order.map((participant, index) => `${index + 1}. ${participant.name} (${participant.code})`),
    '',
    '🎁 Pares do Marble Match',
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
  raceAudio.stopAll();
  state.sketch?.remove();
  state.sketch = null;
  state.order = [];
  state.pairs = [];
  state.arrivals = [];
  state.raceDone = false;
  elements.resultsView.classList.add('hidden');
  elements.gameView.classList.add('hidden');
  elements.setupView.classList.remove('hidden');
  renderArrivalBoard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSoundButton() {
  elements.soundToggle.classList.toggle('muted', !raceAudio.enabled);
  elements.soundToggle.setAttribute('aria-pressed', String(raceAudio.enabled));
  elements.soundToggle.setAttribute('aria-label', raceAudio.enabled ? 'Desativar sons' : 'Ativar sons');
  elements.soundToggle.innerHTML = raceAudio.enabled ? '🔊 <span>SOM</span>' : '🔇 <span>MUDO</span>';
}

function mixedDemo() {
  const stateItems = BRAZIL_STATES.filter(({ code }) => ['SP', 'RJ'].includes(code)).map(normalizeState);
  const countryItems = COUNTRIES.filter(({ code }) => ['BR', 'JP'].includes(code));
  const colorItems = MARBLE_COLORS.filter(({ id }) => ['color-violeta', 'color-ciano'].includes(id));
  return [...stateItems, ...countryItems, ...colorItems];
}

elements.modeTabs.forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    state.query = '';
    state.region = 'Todos';
    elements.searchInput.value = '';
    render();
  });
});
elements.searchInput.addEventListener('input', () => {
  state.query = elements.searchInput.value;
  renderItemGrid();
});
elements.demoButton.addEventListener('click', () => {
  state.participants = mixedDemo();
  setMessage('Exemplo misto pronto: estados, países e cores.');
  render();
});
elements.startButton.addEventListener('click', beginRace);
elements.skipButton.addEventListener('click', () => {
  state.arrivals = [...state.order];
  renderArrivalBoard();
  showResults();
});
elements.soundToggle.addEventListener('click', async () => {
  raceAudio.setEnabled(!raceAudio.enabled);
  if (raceAudio.enabled) await raceAudio.unlock();
  updateSoundButton();
});
elements.revealButton.addEventListener('click', () => {
  const cards = [...elements.pairGrid.querySelectorAll('.pair-card')];
  const shouldReveal = cards.some((card) => !card.classList.contains('revealed'));
  cards.forEach((card) => card.classList.toggle('revealed', shouldReveal));
  elements.revealButton.textContent = shouldReveal ? 'Ocultar todos' : 'Revelar todos';
});
elements.copyButton.addEventListener('click', copyResults);
elements.restartButton.addEventListener('click', resetGame);

updateSoundButton();
renderArrivalBoard();
render();

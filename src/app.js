import { createSeededOrder, pairOuterIn, validateParticipants } from './pairing.js';

const COLORS = [
  '#ff6b6b', '#ff9f43', '#feca57', '#c8f560',
  '#4ade80', '#2dd4bf', '#5fd9f5', '#60a5fa',
  '#8b7cf6', '#c084fc', '#f472b6', '#e9e5d6',
];

const DEMO_NAMES = ['Ana', 'Bia', 'Caio', 'Davi', 'Elisa', 'Fred'];
const state = {
  participants: [],
  selectedColor: COLORS[0],
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
  form: document.querySelector('#participant-form'),
  nameInput: document.querySelector('#participant-name'),
  colorGrid: document.querySelector('#color-grid'),
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

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createSeed() {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  return values[0] || Date.now();
}

function setMessage(message = '') {
  elements.formMessage.textContent = message;
}

function firstAvailableColor() {
  const used = new Set(state.participants.map(({ color }) => color));
  return COLORS.find((color) => !used.has(color)) ?? COLORS[0];
}

function renderColors() {
  const used = new Set(state.participants.map(({ color }) => color));
  if (used.has(state.selectedColor)) state.selectedColor = firstAvailableColor();

  elements.colorGrid.innerHTML = COLORS.map((color, index) => {
    const disabled = used.has(color);
    const selected = state.selectedColor === color && !disabled;
    return `<button
      class="color-button${selected ? ' selected' : ''}"
      style="--swatch:${color}"
      type="button"
      data-color="${color}"
      aria-label="Cor ${index + 1}"
      aria-pressed="${selected}"
      ${disabled ? 'disabled' : ''}
    ></button>`;
  }).join('');

  elements.colorGrid.querySelectorAll('[data-color]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedColor = button.dataset.color;
      renderColors();
    });
  });
}

function renderParticipants() {
  elements.participantCount.textContent = `${state.participants.length} / 12`;
  const validation = validateParticipants(state.participants);
  elements.startButton.disabled = !validation.valid;

  if (!state.participants.length) {
    elements.participantList.innerHTML = `
      <div class="empty-state">
        <span class="empty-orbit"><i></i></span>
        <p>As bolinhas aparecem aqui.</p>
      </div>`;
  } else {
    elements.participantList.innerHTML = state.participants.map((person, index) => `
      <div class="participant">
        <span class="marble-mini" style="--color:${person.color}"></span>
        <strong>${escapeHtml(person.name)}</strong>
        <small>#${String(index + 1).padStart(2, '0')}</small>
        <button class="remove-button" type="button" data-remove="${person.id}" aria-label="Remover ${escapeHtml(person.name)}">×</button>
      </div>`).join('');

    elements.participantList.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        state.participants = state.participants.filter(({ id }) => id !== button.dataset.remove);
        state.selectedColor = firstAvailableColor();
        render();
      });
    });
  }

  renderColors();
}

function render() {
  renderParticipants();
}

function addParticipant(name, color = state.selectedColor) {
  const cleanName = name.trim();
  if (!cleanName) return setMessage('Digite um nome antes de soltar a bolinha.');
  if (state.participants.length >= 12) return setMessage('A pista comporta até 12 participantes.');
  if (state.participants.some((person) => person.name.toLocaleLowerCase('pt-BR') === cleanName.toLocaleLowerCase('pt-BR'))) {
    return setMessage('Esse nome já entrou na pista.');
  }
  if (state.participants.some((person) => person.color === color)) {
    return setMessage('Essa cor já tem dono. Escolha outra.');
  }

  state.participants.push({ id: createId(), name: cleanName, color });
  state.selectedColor = firstAvailableColor();
  elements.nameInput.value = '';
  elements.nameInput.focus();
  setMessage('');
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

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;
}

function startSketch(P5) {
  P5.disableFriendlyErrors = true;
  const container = document.querySelector('#canvas-container');
  const finishIndex = new Map(state.order.map((person, index) => [person.id, index]));
  const total = state.participants.length;

  if (state.sketch) state.sketch.remove();

  state.sketch = new P5((p) => {
    const marbles = state.participants.map((person, startIndex) => ({
      ...person,
      startIndex,
      finishIndex: finishIndex.get(person.id),
      delay: startIndex * 170,
      duration: 4200 + finishIndex.get(person.id) * 150,
      phase: (startIndex + 1) * 1.73,
    }));
    let startedAt;
    let completed = false;

    function dimensions() {
      return {
        width: Math.max(320, container.clientWidth),
        height: Math.max(520, container.clientHeight),
      };
    }

    function finishRace() {
      if (completed) return;
      completed = true;
      state.raceDone = true;
      elements.raceStatus.textContent = 'Ordem definida. Formando pares…';
      setTimeout(showResults, 800);
    }

    p.setup = () => {
      const size = dimensions();
      p.pixelDensity(1);
      p.createCanvas(size.width, size.height).parent(container);
      p.frameRate(60);
      startedAt = p.millis();
      globalThis.__marbleRunReady = true;
    };

    p.draw = () => {
      const elapsed = p.millis() - startedAt;
      p.clear();
      drawTrack(p);

      let finished = 0;
      marbles.forEach((marble) => {
        const rawProgress = Math.max(0, Math.min(1, (elapsed - marble.delay) / marble.duration));
        if (rawProgress >= 1) finished += 1;
        drawMarble(p, marble, rawProgress, total);
      });

      const racing = Math.min(total, Math.max(0, Math.ceil((elapsed + 100) / 170)));
      elements.raceStatus.textContent = finished
        ? `${finished} de ${total} bolinhas chegaram`
        : `Liberando ${racing} de ${total} bolinhas`;

      if (finished === total || state.raceDone) finishRace();
    };

    p.windowResized = () => {
      const size = dimensions();
      p.resizeCanvas(size.width, size.height);
    };

    function drawTrack(ctx) {
      const w = ctx.width;
      const h = ctx.height;
      const rows = Math.max(7, Math.floor(h / 78));
      ctx.noStroke();

      for (let row = 0; row < rows; row += 1) {
        const y = 100 + row * ((h - 225) / Math.max(1, rows - 1));
        const columns = 8;
        for (let column = 0; column < columns; column += 1) {
          const offset = row % 2 ? w / columns / 2 : 0;
          const x = 40 + offset + column * ((w - 80) / columns);
          if (x > w - 25) continue;
          ctx.fill(255, 255, 255, 22);
          ctx.circle(x, y, 10);
          ctx.fill(255, 255, 255, 6);
          ctx.circle(x, y, 23);
        }
      }

      ctx.stroke(255, 255, 255, 28);
      ctx.strokeWeight(1);
      ctx.noFill();
      for (let lane = 0; lane < total; lane += 1) {
        const x = finishX(ctx, lane, total);
        ctx.line(x, h - 90, x, h - 35);
        ctx.arc(x, h - 28, Math.max(30, w / total - 9), 28, ctx.PI, ctx.TWO_PI);
      }

      ctx.stroke(200, 245, 96, 32);
      ctx.line(w * .14, 68, w * .86, 68);
      ctx.line(w * .12, h - 90, w * .88, h - 90);
    }

    function drawMarble(ctx, marble, rawProgress, count) {
      const progress = easeInOutCubic(rawProgress);
      const start = startX(ctx, marble.startIndex, count);
      const finish = finishX(ctx, marble.finishIndex, count);
      const startY = 53;
      const finishY = ctx.height - 58;
      const wave = Math.sin(progress * Math.PI * 9 + marble.phase) * (1 - progress) * Math.min(42, ctx.width / 18);
      const curve = Math.sin(progress * Math.PI) * (finish - start) * .18;
      const x = start + (finish - start) * progress + wave + curve;
      const y = startY + (finishY - startY) * progress;
      const diameter = Math.max(24, Math.min(38, ctx.width / (count + 7)));

      ctx.noStroke();
      ctx.fill(0, 0, 0, 55);
      ctx.ellipse(x + 4, y + 7, diameter * .9, diameter * .55);
      ctx.fill(marble.color);
      ctx.circle(x, y, diameter);
      ctx.fill(255, 255, 255, 115);
      ctx.circle(x - diameter * .18, y - diameter * .2, diameter * .18);
      ctx.fill(10, 13, 23, 170);
      ctx.textAlign(ctx.CENTER, ctx.CENTER);
      ctx.textStyle(ctx.BOLD);
      ctx.textSize(Math.max(9, diameter * .31));
      ctx.text(marble.name.slice(0, 2).toUpperCase(), x, y + 1);
    }

    function startX(ctx, index, count) {
      return count === 1 ? ctx.width / 2 : ctx.width * .14 + index * (ctx.width * .72 / (count - 1));
    }

    function finishX(ctx, index, count) {
      return count === 1 ? ctx.width / 2 : ctx.width * .13 + index * (ctx.width * .74 / (count - 1));
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
          <div class="pair-person"><div class="big-marble" style="--color:${first.color}"></div><strong>${escapeHtml(first.name)}</strong></div>
          <span class="link-symbol">↔</span>
          <div class="pair-person"><div class="big-marble" style="--color:${last.color}"></div><strong>${escapeHtml(last.name)}</strong></div>
        </div>
      </div>
    </article>`;
}

function showResults() {
  state.raceDone = true;
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
    '🎁 Pares do Marble Match',
    '',
    ...state.pairs.map(([first, last], index) => `${index + 1}. ${first.name} ↔ ${last.name}`),
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

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  addParticipant(elements.nameInput.value);
});

elements.demoButton.addEventListener('click', () => {
  state.participants = DEMO_NAMES.map((name, index) => ({ id: createId(), name, color: COLORS[index] }));
  state.selectedColor = firstAvailableColor();
  setMessage('Exemplo pronto. Você pode remover ou trocar os nomes.');
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

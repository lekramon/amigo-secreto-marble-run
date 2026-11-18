# Marble Match — Amigo Secreto

Um marble run animado para formar pares de amigo secreto. Cada participante escolhe um nome e uma cor; as bolinhas percorrem a pista em uma ordem sorteada e os pares são montados das extremidades para o centro:

- 1º colocado ↔ último colocado
- 2º colocado ↔ penúltimo colocado
- e assim por diante

## Recursos

- 2 a 12 participantes, sempre em quantidade par
- nomes e cores únicos
- ordem de chegada pseudoaleatória e reproduzível por semente
- animação responsiva em p5.js
- resultados escondidos em cartões individuais
- botão para copiar o resultado
- funcionamento 100% local no navegador, sem backend ou coleta de nomes

## Executar localmente

```bash
npm test
npm run serve
```

Acesse `http://localhost:4173`.

## Estrutura

- `index.html` — interface
- `styles.css` — design responsivo
- `src/app.js` — estado, interação e animação
- `src/pairing.js` — sorteio, validação e pareamento
- `tests/pairing.test.mjs` — testes da lógica central

## Licença

MIT

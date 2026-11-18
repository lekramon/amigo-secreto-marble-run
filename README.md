# Marble Match Brasil — Amigo Secreto

Um marble run 3D para formar pares de amigo secreto. Cada participante escolhe um estado brasileiro; as bolinhas percorrem uma pista de corrida e os pares são montados das extremidades para o centro:

- 1º colocado ↔ último colocado
- 2º colocado ↔ penúltimo colocado
- e assim por diante

## Recursos

- catálogo com os 26 estados e o Distrito Federal
- seleção de 2 a 12 estados, sempre em quantidade par
- cor exclusiva e sigla visível para cada estado
- filtros por região brasileira
- autódromo 3D em WebGL com pista, boxes, arquibancadas, iluminação e câmera dinâmica
- ordem de chegada pseudoaleatória e reproduzível por semente
- resultados escondidos em cartões individuais
- botão para copiar o resultado
- funcionamento 100% local no navegador, sem backend ou coleta de dados

## Executar localmente

```bash
npm test
npm run serve
```

Acesse `http://localhost:4173`.

## Estrutura

- `index.html` — interface
- `styles.css` — design responsivo
- `src/app.js` — seleção, interação e corrida 3D
- `src/states.js` — catálogo e cores dos estados brasileiros
- `src/pairing.js` — sorteio, validação e pareamento
- `tests/pairing.test.mjs` — testes da lógica central e do catálogo

## Licença

MIT

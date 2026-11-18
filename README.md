# Marble Match — Amigo Secreto

Um marble run 3D para formar pares de amigo secreto. Cada participante escolhe uma bolinha de estado brasileiro, país ou cor; a ordem de chegada define os pares das extremidades para o centro:

- 1º colocado ↔ último colocado
- 2º colocado ↔ penúltimo colocado
- e assim por diante

## Recursos

- 27 bandeiras dos estados brasileiros
- mais de 250 bandeiras de países e territórios
- 18 bolinhas de cores
- mistura de categorias na mesma corrida
- busca por nome ou sigla e filtros por região brasileira
- seleção de 2 a 12 bolinhas, sempre em quantidade par
- bandeiras aplicadas às bolinhas 3D e aos elementos da interface
- autódromo WebGL com boxes, pit lane, arquibancadas, grid, pórticos, luzes e faixas coloridas
- sons sintetizados de contagem regressiva, corrida, chegadas e bandeirada
- controle para ativar ou silenciar o áudio
- classificação atualizada conforme cada bolinha cruza a chegada
- ordem final e pares escondidos em cartões individuais
- funcionamento local no navegador, sem backend ou coleta de dados

## Executar localmente

```bash
npm test
npm run serve
```

Acesse `http://localhost:4173`.

## Estrutura

- `index.html` — interface
- `styles.css` — design responsivo
- `src/app.js` — seleção, áudio, classificação e corrida 3D
- `src/states.js` — catálogo dos estados brasileiros
- `src/countries.js` — catálogo de países e territórios
- `src/colors.js` — catálogo de cores
- `src/pairing.js` — sorteio, validação, classificação e pareamento
- `assets/flags/` — bandeiras estaduais em SVG
- `assets/countries/` — bandeiras nacionais em SVG
- `tests/pairing.test.mjs` — testes da lógica e dos catálogos

## Créditos de assets

Consulte [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

## Licença

MIT

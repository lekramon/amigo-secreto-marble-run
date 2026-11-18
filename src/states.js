export const BRAZIL_STATES = Object.freeze([
  { code: 'AC', name: 'Acre', color: '#22c55e', region: 'Norte' },
  { code: 'AL', name: 'Alagoas', color: '#ef4444', region: 'Nordeste' },
  { code: 'AP', name: 'Amapá', color: '#16a34a', region: 'Norte' },
  { code: 'AM', name: 'Amazonas', color: '#2563eb', region: 'Norte' },
  { code: 'BA', name: 'Bahia', color: '#fbbf24', region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', color: '#14b8a6', region: 'Nordeste' },
  { code: 'DF', name: 'Distrito Federal', color: '#a3e635', region: 'Centro-Oeste' },
  { code: 'ES', name: 'Espírito Santo', color: '#38bdf8', region: 'Sudeste' },
  { code: 'GO', name: 'Goiás', color: '#84cc16', region: 'Centro-Oeste' },
  { code: 'MA', name: 'Maranhão', color: '#dc2626', region: 'Nordeste' },
  { code: 'MT', name: 'Mato Grosso', color: '#0ea5e9', region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', color: '#06b6d4', region: 'Centro-Oeste' },
  { code: 'MG', name: 'Minas Gerais', color: '#f8fafc', region: 'Sudeste' },
  { code: 'PA', name: 'Pará', color: '#e11d48', region: 'Norte' },
  { code: 'PB', name: 'Paraíba', color: '#18181b', region: 'Nordeste' },
  { code: 'PR', name: 'Paraná', color: '#1d4ed8', region: 'Sul' },
  { code: 'PE', name: 'Pernambuco', color: '#fb923c', region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', color: '#f97316', region: 'Nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', color: '#7dd3fc', region: 'Sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', color: '#15803d', region: 'Nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', color: '#facc15', region: 'Sul' },
  { code: 'RO', name: 'Rondônia', color: '#3b82f6', region: 'Norte' },
  { code: 'RR', name: 'Roraima', color: '#10b981', region: 'Norte' },
  { code: 'SC', name: 'Santa Catarina', color: '#be123c', region: 'Sul' },
  { code: 'SP', name: 'São Paulo', color: '#f43f5e', region: 'Sudeste' },
  { code: 'SE', name: 'Sergipe', color: '#eab308', region: 'Nordeste' },
  { code: 'TO', name: 'Tocantins', color: '#60a5fa', region: 'Norte' },
]);

export function findState(code) {
  return BRAZIL_STATES.find((state) => state.code === code);
}

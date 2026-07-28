import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workflowsDir = resolve(root, 'workflows');
const expected = new Map([
  ['04-portal-visual.sanitized.json', { nodes: 4, active: false }],
  ['05-portal-acoes.sanitized.json', { nodes: 58, active: false }],
  ['06-portal-arquivos.sanitized.json', { nodes: 4, active: false }],
]);
const blocked = [
  { label: 'referência de credencial', pattern: /"credentials"\s*:/i },
  { label: 'e-mail', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'token bearer', pattern: /bearer\s+[A-Za-z0-9._~+\-/]{12,}/i },
  { label: 'domínio temporário de túnel', pattern: /\.ngrok(?:-free)?\.dev/i },
];

const files = readdirSync(workflowsDir).filter((file) => file.endsWith('.json')).sort();
if (files.join('|') !== [...expected.keys()].join('|')) {
  throw new Error(`Exports inesperados. Esperados: ${[...expected.keys()].join(', ')}.`);
}

for (const file of files) {
  const raw = readFileSync(resolve(workflowsDir, file), 'utf8');
  const workflow = JSON.parse(raw);
  const rule = expected.get(file);

  if (workflow.active !== rule.active) throw new Error(`${file}: o export público precisa permanecer inativo.`);
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length !== rule.nodes) {
    throw new Error(`${file}: esperado ${rule.nodes} nós; encontrado ${workflow.nodes?.length ?? 0}.`);
  }
  if (workflow.id || workflow.versionId || workflow.pinData || workflow.staticData) {
    throw new Error(`${file}: metadado de instância ou execução não foi removido.`);
  }
  for (const { label, pattern } of blocked) {
    if (pattern.test(raw)) throw new Error(`${file}: ${label} não pode entrar no portfólio.`);
  }
}

console.log(`Snapshot sanitizado validado: ${files.length} workflows, ${expected.get('05-portal-acoes.sanitized.json').nodes} nós no orquestrador.`);

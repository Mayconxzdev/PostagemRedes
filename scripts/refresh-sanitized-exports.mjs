/**
 * Ferramenta local de manutenção, não usada no CI.
 *
 * Uso (somente após exportar os workflows de uma instância controlada):
 *   node scripts/refresh-sanitized-exports.mjs C:\caminho\para\exports
 *
 * Ela transforma os três exports ativos em snapshots de portfólio inativos,
 * sem referências de credenciais, IDs da instância ou dados de execução.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputDir = process.argv[2];
if (!inputDir) throw new Error('Informe a pasta que contém os três exports atuais do n8n.');

const mapping = [
  ['portal-visual.current.json', '04-portal-visual.sanitized.json'],
  ['portal-acoes.current.json', '05-portal-acoes.sanitized.json'],
  ['portal-arquivos.current.json', '06-portal-arquivos.sanitized.json'],
];

const sensitiveTopLevel = new Set(['id', 'versionId', 'active', 'pinData', 'staticData', 'shared', 'tags', 'meta', 'createdAt', 'updatedAt']);

function cleanWorkflow(source) {
  const input = Array.isArray(source) ? source[0] : source;
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!sensitiveTopLevel.has(key)) output[key] = value;
  }
  output.active = false;
  output.nodes = (input.nodes || []).map((node) => {
    const { credentials, id, webhookId, ...safeNode } = node;
    return safeNode;
  });
  delete output.settings?.executionOrder;
  return output;
}

for (const [sourceName, targetName] of mapping) {
  const source = JSON.parse(readFileSync(resolve(inputDir, sourceName), 'utf8'));
  const safe = cleanWorkflow(source);
  writeFileSync(resolve(root, 'workflows', targetName), `${JSON.stringify(safe, null, 2)}\n`, 'utf8');
  console.log(`Atualizado: workflows/${targetName}`);
}

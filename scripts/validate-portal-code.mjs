import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workflow = JSON.parse(readFileSync(resolve(root, 'workflows', '05-portal-acoes.sanitized.json'), 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const codeNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code');

if (codeNodes.length === 0) {
  throw new Error('O export do Portal: Ações não contém nós Code.');
}

for (const node of codeNodes) {
  new AsyncFunction(node.parameters?.jsCode || '');
}

console.log(`Código assíncrono validado em ${codeNodes.length} nó(s) do Portal: Ações.`);

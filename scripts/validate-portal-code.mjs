import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workflow = JSON.parse(readFileSync(resolve(root, 'workflows', '05-portal-acoes.sanitized.json'), 'utf8'));
const code = workflow.nodes.find((node) => node.name === 'Processar')?.parameters?.jsCode;

if (!code) {
  throw new Error('O export do Portal: Ações não contém o nó Processar.');
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
new AsyncFunction(code);
console.log('Código assíncrono do Portal: Ações validado.');

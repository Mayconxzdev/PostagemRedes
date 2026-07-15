import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'portal', 'portal-template.html');
const destination = path.join(root, 'docs', 'demo', 'index.html');
// Mantém a demo reproduzível: uma geração local não pode criar ruído de diff só por mudar horários.
const demoNow = new Date('2026-07-15T12:00:00.000Z');

const audit = (action, comment, minutesAgo) => ({
  action,
  operator: 'Equipe de Conteúdo',
  comment,
  at: new Date(demoNow.getTime() - minutesAgo * 60_000).toISOString(),
});

const contents = [
  {
    id: 'guia-ambientes-criticos',
    title: 'Guia visual para ambientes críticos',
    caption: 'Como transformar um requisito técnico em uma decisão de ventilação mais clara.\n\nVeja os critérios que ajudam equipes de engenharia a avaliar vazão, manutenção e contexto de operação.\n\n#Engenharia #Operação #Manutenção',
    slides: ['01-ambientes.svg', '02-fluxo.svg', '03-checklist.svg', '04-resultados.svg'],
    assetVersion: 1,
    status: 'pendente',
    networks: ['instagram', 'linkedin'],
    scheduleAt: '',
    updatedAt: new Date(demoNow.getTime() - 20 * 60_000).toISOString(),
    audit: [audit('pendente', 'Rascunho criado para revisão técnica.', 20)],
  },
  {
    id: 'checklist-inspecao',
    title: 'Checklist antes da inspeção técnica',
    caption: 'Uma inspeção produtiva começa antes da visita. Organize os pontos de observação, registre evidências e alinhe a próxima ação com a operação.',
    slides: ['03-checklist.svg', '02-fluxo.svg', '04-resultados.svg'],
    assetVersion: 1,
    status: 'aprovado',
    networks: ['facebook', 'linkedin', 'x'],
    scheduleAt: '',
    updatedAt: new Date(demoNow.getTime() - 90 * 60_000).toISOString(),
    audit: [audit('pendente', 'Material preparado pela equipe.', 180), audit('aprovado', 'Aprovado para a próxima janela de publicação.', 90)],
  },
  {
    id: 'eficiencia-operacional',
    title: 'Eficiência começa na especificação',
    caption: 'Equipamento, ambiente e rotina precisam ser avaliados juntos. Uma especificação bem feita reduz retrabalho e melhora a previsibilidade operacional.',
    slides: ['04-resultados.svg', '01-ambientes.svg', '02-fluxo.svg'],
    assetVersion: 1,
    status: 'agendado',
    networks: ['instagram', 'facebook'],
    scheduleAt: new Date(demoNow.getTime() + 24 * 60 * 60_000).toISOString(),
    updatedAt: new Date(demoNow.getTime() - 4 * 60 * 60_000).toISOString(),
    audit: [audit('aprovado', 'Conteúdo aprovado após revisão de legenda.', 300), audit('agendado', 'Agendado para o próximo ciclo editorial.', 240)],
  },
  {
    id: 'rotina-manutencao',
    title: 'Manutenção preventiva sem improviso',
    caption: 'Sinais pequenos merecem atenção antes de se tornarem uma parada não planejada. Use uma rotina simples para priorizar o que precisa de ação.',
    slides: ['02-fluxo.svg', '03-checklist.svg', '01-ambientes.svg'],
    assetVersion: 1,
    status: 'rejeitado',
    networks: [],
    scheduleAt: '',
    updatedAt: new Date(demoNow.getTime() - 26 * 60 * 60_000).toISOString(),
    audit: [audit('rejeitado', 'Revisar chamada do primeiro slide antes de publicar.', 1560)],
  },
];

const template = fs.readFileSync(templatePath, 'utf8');
const start = template.indexOf('    const CONTENTS=');
const end = template.indexOf('    const STATUS=', start);
if (start < 0 || end < 0) throw new Error('Não foi possível localizar o ponto de dados do template do portal.');

const safeData = JSON.stringify(contents).replace(/</g, '\\u003c');
const replacement = `    // Demo estática e anonimizada para o portfólio. Não chama o n8n nem usa dados corporativos.\n    const CONTENTS=${safeData};\n    const asset=(_id,file)=>\`../assets/demo-slides/\${encodeURIComponent(file)}\`;\n    const api='#';\n`;
const generated = `${template.slice(0, start)}${replacement}${template.slice(end)}`.replace(
  '</title>',
  '</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27%23ed3340%27/%3E%3Ctext x=%2716%27 y=%2722%27 text-anchor=%27middle%27 font-family=%27Arial%27 font-size=%2718%27 font-weight=%27700%27 fill=%27white%27%3EP%3C/text%3E%3C/svg%3E">',
);

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, generated, 'utf8');
console.log(`Demo de portfólio gerada: ${path.relative(root, destination)}`);

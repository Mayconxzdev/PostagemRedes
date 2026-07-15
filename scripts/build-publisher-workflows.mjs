import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '..', 'workflows');

function node(name, type, typeVersion, parameters, position, extra = {}) {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, type, typeVersion, parameters, position, ...extra };
}

function note(name, content, position, width = 420, height = 220) {
  return node(name, 'n8n-nodes-base.stickyNote', 1, {
    content,
    height,
    width,
    color: 6,
  }, position);
}

function workflow(name, nodes, connections) {
  return {
    name,
    active: false,
    settings: { executionOrder: 'v1', availableInMCP: false },
    versionId: null,
    meta: null,
    pinData: {},
    nodes,
    connections,
  };
}

function http(name, method, url, position, options = {}) {
  return node(name, 'n8n-nodes-base.httpRequest', 4.4, {
    method,
    url,
    authentication: 'genericCredentialType',
    genericAuthType: 'oAuth2Api',
    sendHeaders: true,
    headerParameters: { parameters: [] },
    options: { timeout: 30000, ...options },
  }, position);
}

const commonSample = `// Dados de amostra para revisão do canvas. O publicador real recebe somente itens\n// aprovados/agendados da fila do portal. Não há IDs de conta nem segredos neste export.\nreturn [{ json: {\n  contentId: 'conteudo-exemplo',\n  title: 'Publicação aprovada',\n  caption: 'Legenda aprovada para adaptação por rede.',\n  slides: ['01.png', '02.png'],\n  networks: ['instagram', 'facebook', 'linkedin', 'x'],\n  status: 'aprovado',\n  idempotencyKey: 'content:conteudo-exemplo:network:example',\n} }];`;

const queue = workflow('Postagem Redes — 07 — Fila e roteador (CONFIGURAR)', [
  note('Leia antes de ativar', `## Fila de publicação — desenho atualizado\n\nEste workflow substitui o agendamento de planilha/Google Drive como fonte de publicação.\n\n**Só consome:** itens com status \`aprovado\` ou \`agendado\` no horário devido.\n\n**Antes de ativar:** importe e configure os workflows 08, 09, 10 e 11; valide uma rede por vez; mantenha o legado inativo.`, [-620, -280], 470, 260),
  node('Teste manual', 'n8n-nodes-base.manualTrigger', 1, {}, [-600, 40]),
  node('Agendamento a cada 5 minutos', 'n8n-nodes-base.scheduleTrigger', 1.3, {
    rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] },
  }, [-600, 150]),
  node('Ler fila aprovada e agendada', 'n8n-nodes-base.code', 2, {
    jsCode: `const fs = require('fs');\nconst statePath = '/files/postagem-redes/state.json';\nconst now = new Date();\nlet state = { records: {} };\ntry { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* biblioteca ainda vazia */ }\nconst records = Object.entries(state.records || {}).map(([contentId, value]) => ({ contentId, ...value }));\nreturn records\n  .filter(item => item.status === 'aprovado' || (item.status === 'agendado' && item.scheduleAt && new Date(item.scheduleAt) <= now))\n  .filter(item => Array.isArray(item.networks) && item.networks.length)\n  .map(item => ({ json: { ...item, idempotencyKey: \`\${item.contentId}:\${item.updatedAt || 'novo'}\` } }));`,
  }, [-320, 90]),
  node('Loop por conteúdo', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} }, [-70, 90]),
  node('Separar uma execução por rede', 'n8n-nodes-base.code', 2, {
    jsCode: `const item = $json;\nreturn (item.networks || []).map(network => ({ json: { ...item, network, idempotencyKey: \`\${item.idempotencyKey}:\${network}\` } }));`,
  }, [160, 90]),
  node('Roteador por rede', 'n8n-nodes-base.switch', 3.4, {
    mode: 'rules',
    rules: { values: [
      { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.network }}', rightValue: 'instagram', operator: { type: 'string', operation: 'equals' } }] }, renameOutput: true, outputKey: 'Meta / Instagram' },
      { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.network }}', rightValue: 'facebook', operator: { type: 'string', operation: 'equals' } }] }, renameOutput: true, outputKey: 'Meta / Facebook' },
      { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.network }}', rightValue: 'linkedin', operator: { type: 'string', operation: 'equals' } }] }, renameOutput: true, outputKey: 'LinkedIn' },
      { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.network }}', rightValue: 'x', operator: { type: 'string', operation: 'equals' } }] }, renameOutput: true, outputKey: 'X / thread' },
    ] },
    options: { fallbackOutput: 'none', ignoreCase: false },
  }, [400, 90]),
  node('Registrar início com idempotência', 'n8n-nodes-base.code', 2, {
    jsCode: `// Ponto único para, na fase de ativação, gravar publishing/published/failed no ledger.\n// Nunca marque como publicado antes de receber o ID remoto da plataforma.\nreturn items;`,
  }, [670, 90]),
  note('Acessos que serão ligados', `## Checklist\n\n- **Meta**: OAuth2 da aplicação, ID da Página, ID da conta profissional do Instagram e URL pública HTTPS para as mídias.\n- **LinkedIn**: Community Management OAuth2 e URN da empresa.\n- **X**: OAuth2 com permissão de leitura/escrita e acesso à mídia.\n- **Alerta**: SMTP dedicado para falhas.\n\nOs nós abaixo são apenas o roteamento. Os publicadores ficam separados para evitar uma falha em uma rede bloquear as outras.`, [560, -280], 510, 260),
], {
  'Teste manual': { main: [[{ node: 'Ler fila aprovada e agendada', type: 'main', index: 0 }]] },
  'Agendamento a cada 5 minutos': { main: [[{ node: 'Ler fila aprovada e agendada', type: 'main', index: 0 }]] },
  'Ler fila aprovada e agendada': { main: [[{ node: 'Loop por conteúdo', type: 'main', index: 0 }]] },
  'Loop por conteúdo': { main: [[{ node: 'Separar uma execução por rede', type: 'main', index: 0 }]] },
  'Separar uma execução por rede': { main: [[{ node: 'Roteador por rede', type: 'main', index: 0 }]] },
  'Roteador por rede': { main: [[{ node: 'Registrar início com idempotência', type: 'main', index: 0 }], [{ node: 'Registrar início com idempotência', type: 'main', index: 0 }], [{ node: 'Registrar início com idempotência', type: 'main', index: 0 }], [{ node: 'Registrar início com idempotência', type: 'main', index: 0 }]] },
});

const meta = workflow('Postagem Redes — 08 — Meta Instagram e Facebook (CONFIGURAR)', [
  note('Pré-requisitos Meta', `## Antes de executar\n\n1. Criar aplicativo Meta e adicionar os produtos necessários.\n2. Vincular conta profissional do Instagram à Página do Facebook.\n3. Criar OAuth2 de menor privilégio no n8n.\n4. Informar os IDs da Página e da conta profissional **diretamente no n8n**, sem Git.\n5. Hospedar cada imagem em URL pública **HTTPS**: a Meta não consegue baixar mídia em \`192.168.x.x\`.\n\nO fluxo está inativo e não possui conta, token ou URL corporativa.`, [-650, -290], 520, 300),
  node('Teste manual', 'n8n-nodes-base.manualTrigger', 1, {}, [-600, 70]),
  node('Preparar item de teste', 'n8n-nodes-base.code', 2, { jsCode: commonSample }, [-400, 70]),
  node('Pré-validar configuração Meta', 'n8n-nodes-base.code', 2, {
    jsCode: `// Configure estes valores como variáveis do n8n ou dados do item antes de ativar:\n// metaPageId, instagramBusinessAccountId, publicMediaBaseUrl e metaApiVersion.\n// A validação deliberadamente falha se faltar dado: isso evita post acidental.\nconst required = ['metaPageId', 'instagramBusinessAccountId', 'publicMediaBaseUrl'];\nconst missing = required.filter(key => !$json[key]);\nreturn [{ json: { ...$json, readyForMeta: missing.length === 0, missing } }];`,
  }, [-160, 70]),
  node('Meta configurada?', 'n8n-nodes-base.if', 2.3, {
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.readyForMeta }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }] }, options: {},
  }, [70, 70]),
  node('Parar sem publicar', 'n8n-nodes-base.stopAndError', 1, {
    errorMessage: '=Meta ainda não está configurada. Campos ausentes: {{ $json.missing.join(", ") }}',
  }, [290, 180]),
  node('Criar containers Instagram', 'n8n-nodes-base.httpRequest', 4.4, {
    method: 'POST',
    url: '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.instagramBusinessAccountId }}/media',
    authentication: 'genericCredentialType', genericAuthType: 'oAuth2Api', sendBody: true, specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ image_url: `${$json.publicMediaBaseUrl}/${$json.contentId}/01.png`, is_carousel_item: true }) }}',
    options: { timeout: 30000 },
  }, [300, 0]),
  node('Aguardar processamento da mídia', 'n8n-nodes-base.wait', 1.1, {
    amount: 20, unit: 'seconds', options: {},
  }, [560, 0]),
  http('Consultar status dos containers', 'GET', '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.id }}?fields=status_code', [790, 0]),
  node('Criar carrossel Instagram', 'n8n-nodes-base.httpRequest', 4.4, {
    method: 'POST',
    url: '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.instagramBusinessAccountId }}/media',
    authentication: 'genericCredentialType', genericAuthType: 'oAuth2Api', sendBody: true, specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ media_type: "CAROUSEL", children: $json.containerIds, caption: $json.caption }) }}',
    options: { timeout: 30000 },
  }, [1040, 0]),
  node('Publicar carrossel Instagram', 'n8n-nodes-base.httpRequest', 4.4, {
    method: 'POST',
    url: '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.instagramBusinessAccountId }}/media_publish',
    authentication: 'genericCredentialType', genericAuthType: 'oAuth2Api', sendBody: true, specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ creation_id: $json.id }) }}',
    options: { timeout: 30000 },
  }, [1280, 0]),
  node('Preparar fotos Facebook', 'n8n-nodes-base.code', 2, {
    jsCode: `// Para Facebook, envie cada slide como foto não publicada e mantenha os IDs retornados.\n// Em seguida use /{page-id}/feed com attached_media. Não reaproveite o container do Instagram.\nreturn items;`,
  }, [300, 330]),
  http('Enviar foto não publicada Facebook', 'POST', '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.metaPageId }}/photos', [570, 330]),
  http('Criar post de carrossel Facebook', 'POST', '=https://graph.facebook.com/{{ $json.metaApiVersion || "v23.0" }}/{{ $json.metaPageId }}/feed', [840, 330]),
  note('Por que HTTP Request?', `## Decisão de arquitetura\n\nNão há um nó nativo do n8n que cubra corretamente todo o fluxo atual de carrossel Meta. Estes nós HTTP Request são intencionais: deixam os endpoints, timeout e tratamento de retorno visíveis e auditáveis.\n\nConecte o OAuth2 no editor e preencha os corpos usando os IDs retornados de cada etapa. Faça primeiro um post de teste privado em uma Página de teste.`, [1030, 260], 480, 250),
], {
  'Teste manual': { main: [[{ node: 'Preparar item de teste', type: 'main', index: 0 }]] },
  'Preparar item de teste': { main: [[{ node: 'Pré-validar configuração Meta', type: 'main', index: 0 }]] },
  'Pré-validar configuração Meta': { main: [[{ node: 'Meta configurada?', type: 'main', index: 0 }]] },
  'Meta configurada?': { main: [[{ node: 'Criar containers Instagram', type: 'main', index: 0 }], [{ node: 'Parar sem publicar', type: 'main', index: 0 }]] },
  'Criar containers Instagram': { main: [[{ node: 'Aguardar processamento da mídia', type: 'main', index: 0 }]] },
  'Aguardar processamento da mídia': { main: [[{ node: 'Consultar status dos containers', type: 'main', index: 0 }]] },
  'Consultar status dos containers': { main: [[{ node: 'Criar carrossel Instagram', type: 'main', index: 0 }]] },
  'Criar carrossel Instagram': { main: [[{ node: 'Publicar carrossel Instagram', type: 'main', index: 0 }]] },
  'Preparar fotos Facebook': { main: [[{ node: 'Enviar foto não publicada Facebook', type: 'main', index: 0 }]] },
  'Enviar foto não publicada Facebook': { main: [[{ node: 'Criar post de carrossel Facebook', type: 'main', index: 0 }]] },
});

const linkedin = workflow('Postagem Redes — 09 — LinkedIn Empresa (CONFIGURAR)', [
  note('Pré-requisitos LinkedIn', `## Publicação na Página da empresa\n\n- Aplicação LinkedIn aprovada para Community Management.\n- OAuth2 Community Management conectado no n8n.\n- URN/ID da organização com permissão de postagem.\n- Versão da API e cabeçalhos LinkedIn mantidos atualizados.\n\nO nó nativo LinkedIn desta instância é ótimo para texto ou uma imagem. Para um carrossel real, o caminho principal abaixo usa a Posts API com multiimagem.`, [-640, -280], 560, 280),
  node('Teste manual', 'n8n-nodes-base.manualTrigger', 1, {}, [-580, 60]),
  node('Preparar item de teste', 'n8n-nodes-base.code', 2, { jsCode: commonSample }, [-380, 60]),
  node('Pré-validar LinkedIn', 'n8n-nodes-base.code', 2, {
    jsCode: `const required = ['linkedInOrganizationUrn', 'publicMediaBaseUrl'];\nconst missing = required.filter(key => !$json[key]);\nreturn [{ json: { ...$json, readyForLinkedIn: missing.length === 0, missing } }];`,
  }, [-140, 60]),
  node('LinkedIn configurado?', 'n8n-nodes-base.if', 2.3, {
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.readyForLinkedIn }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }] }, options: {},
  }, [90, 60]),
  node('Parar sem publicar', 'n8n-nodes-base.stopAndError', 1, { errorMessage: '=LinkedIn não configurado. Campos ausentes: {{ $json.missing.join(", ") }}' }, [320, 170]),
  http('Inicializar uploads de imagens', 'POST', '=https://api.linkedin.com/rest/images?action=initializeUpload', [330, -10], { response: { response: { neverError: false } } }),
  http('Enviar binário da imagem', 'PUT', '={{ $json.uploadUrl }}', [570, -10]),
  node('Criar post multiimagem LinkedIn', 'n8n-nodes-base.httpRequest', 4.4, {
    method: 'POST', url: '=https://api.linkedin.com/rest/posts', authentication: 'genericCredentialType', genericAuthType: 'oAuth2Api',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'LinkedIn-Version', value: '={{ $json.linkedInVersion || "202607" }}' },
      { name: 'X-Restli-Protocol-Version', value: '2.0.0' },
    ] },
    sendBody: true, specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ author: $json.linkedInOrganizationUrn, commentary: $json.caption, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, content: { multiImage: { images: $json.linkedInImageUrns } }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }) }}',
    options: { timeout: 30000 },
  }, [810, -10]),
  node('Alternativa nativa: uma imagem', 'n8n-nodes-base.linkedIn', 1, {
    resource: 'post', operation: 'create', postAs: 'organization', organization: '={{ $json.linkedInOrganizationUrn }}', text: '={{ $json.caption }}', shareMediaCategory: 'IMAGE', binaryPropertyName: 'data', additionalFields: {},
  }, [600, 300], { disabled: true }),
  note('Alternativa nativa desativada', `## Nó LinkedIn nativo\n\nEle foi mantido no canvas, mas está **desativado** de propósito: serve para teste de texto/uma imagem e para deixar claro qual acesso OAuth2 a instância reconhece.\n\nPara carrossel, use a sequência de upload + Posts API acima. Assim não reduzimos silenciosamente um carrossel a uma única imagem.`, [910, 220], 470, 235),
], {
  'Teste manual': { main: [[{ node: 'Preparar item de teste', type: 'main', index: 0 }]] },
  'Preparar item de teste': { main: [[{ node: 'Pré-validar LinkedIn', type: 'main', index: 0 }]] },
  'Pré-validar LinkedIn': { main: [[{ node: 'LinkedIn configurado?', type: 'main', index: 0 }]] },
  'LinkedIn configurado?': { main: [[{ node: 'Inicializar uploads de imagens', type: 'main', index: 0 }], [{ node: 'Parar sem publicar', type: 'main', index: 0 }]] },
  'Inicializar uploads de imagens': { main: [[{ node: 'Enviar binário da imagem', type: 'main', index: 0 }]] },
  'Enviar binário da imagem': { main: [[{ node: 'Criar post multiimagem LinkedIn', type: 'main', index: 0 }]] },
});

const x = workflow('Postagem Redes — 10 — X thread (CONFIGURAR)', [
  note('Pré-requisitos X', `## Thread adaptada para X\n\n- Projeto e aplicação com OAuth2 de leitura/escrita.\n- Acesso à API de mídia incluído no plano da conta.\n- Credencial OAuth2 criada no n8n após rotação dos segredos.\n\nO nó nativo X cria o post e as respostas. A mídia fica em HTTP Request porque o nó atual do n8n não anexa mídia no fluxo v2.\n\nNão cole tokens no canvas, Git ou chat.`, [-640, -280], 550, 280),
  node('Teste manual', 'n8n-nodes-base.manualTrigger', 1, {}, [-570, 70]),
  node('Preparar item de teste', 'n8n-nodes-base.code', 2, { jsCode: commonSample }, [-370, 70]),
  node('Adaptar legenda em thread', 'n8n-nodes-base.code', 2, {
    jsCode: `const max = 260;\nconst words = String($json.caption || '').split(/\\s+/);\nconst chunks = []; let current = '';\nfor (const word of words) {\n  const candidate = current ? \`\${current} \${word}\` : word;\n  if (candidate.length > max && current) { chunks.push(current); current = word; } else current = candidate;\n}\nif (current) chunks.push(current);\nreturn chunks.map((text, index) => ({ json: { ...$json, text: \`\${text} (\${index + 1}/\${chunks.length})\`, sequence: index + 1, isFirst: index === 0 } }));`,
  }, [-130, 70]),
  node('Loop por post da thread', 'n8n-nodes-base.splitInBatches', 3, { batchSize: 1, options: {} }, [130, 70]),
  http('Upload de mídia X', 'POST', '=https://api.x.com/2/media/upload', [390, 0]),
  node('É o primeiro post?', 'n8n-nodes-base.if', 2.3, {
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.isFirst }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }] }, options: {},
  }, [620, 70]),
  node('Criar post inicial X', 'n8n-nodes-base.twitter', 2, {
    resource: 'tweet', operation: 'create', text: '={{ $json.text }}', additionalFields: {},
  }, [870, -20]),
  node('Responder na thread X', 'n8n-nodes-base.twitter', 2, {
    resource: 'tweet', operation: 'create', text: '={{ $json.text }}', additionalFields: { inReplyToStatusId: { mode: 'id', value: '={{ $json.previousTweetId }}' } },
  }, [870, 150]),
  node('Guardar ID para próxima resposta', 'n8n-nodes-base.code', 2, {
    jsCode: `// Guarde o ID retornado pela API como previousTweetId e também no ledger do portal.\n// Esse registro é a proteção contra duplicar thread após timeout.\nreturn items;`,
  }, [1120, 70]),
  note('Uso correto dos nós', `## Papel de cada etapa\n\n- **Code**: adapta texto e numera a thread.\n- **Loop Over Items**: garante ordem e uma postagem por vez.\n- **HTTP Request**: upload de mídia v2.\n- **X (Formerly Twitter)**: cria o post inicial e as respostas encadeadas.\n- **Ledger**: salva todos os IDs retornados; retry deve retomar apenas o item que falhou.`, [1060, -250], 510, 260),
], {
  'Teste manual': { main: [[{ node: 'Preparar item de teste', type: 'main', index: 0 }]] },
  'Preparar item de teste': { main: [[{ node: 'Adaptar legenda em thread', type: 'main', index: 0 }]] },
  'Adaptar legenda em thread': { main: [[{ node: 'Loop por post da thread', type: 'main', index: 0 }]] },
  'Loop por post da thread': { main: [[{ node: 'Upload de mídia X', type: 'main', index: 0 }]] },
  'Upload de mídia X': { main: [[{ node: 'É o primeiro post?', type: 'main', index: 0 }]] },
  'É o primeiro post?': { main: [[{ node: 'Criar post inicial X', type: 'main', index: 0 }], [{ node: 'Responder na thread X', type: 'main', index: 0 }]] },
  'Criar post inicial X': { main: [[{ node: 'Guardar ID para próxima resposta', type: 'main', index: 0 }]] },
  'Responder na thread X': { main: [[{ node: 'Guardar ID para próxima resposta', type: 'main', index: 0 }]] },
});

const monitoring = workflow('Postagem Redes — 11 — Monitoramento e alerta (CONFIGURAR)', [
  note('Observabilidade antes da produção', `## Alerta seguro\n\nEste workflow recebe falhas dos publicadores, remove campos sensíveis e manda um aviso operacional.\n\nConecte uma credencial SMTP dedicada no editor. Configure cada workflow publicador para usar este workflow como Error Workflow depois do teste manual.\n\nNão inclua token, cabeçalho Authorization, corpo bruto de API ou dados pessoais no alerta.`, [-560, -260], 510, 250),
  node('Erro de outro workflow', 'n8n-nodes-base.errorTrigger', 1, {}, [-500, 40]),
  node('Teste manual', 'n8n-nodes-base.manualTrigger', 1, {}, [-500, 160]),
  node('Sanitizar ocorrência', 'n8n-nodes-base.code', 2, {
    jsCode: `const source = $json.execution || $json;\nconst message = String(source.error?.message || source.error?.description || 'Falha sem detalhe.').replace(/(authorization|bearer|token|secret|client_secret)\\s*[:=]\\s*[^\\s,]+/gi, '$1=[redigido]');\nreturn [{ json: { workflow: source.workflow?.name || 'Publicador', executionId: source.id || '', message, occurredAt: new Date().toISOString() } }];`,
  }, [-250, 90]),
  node('Enviar alerta SMTP', 'n8n-nodes-base.emailSend', 2.1, {
    fromEmail: '', toEmail: '', subject: '=[Postagem Redes] Falha em {{ $json.workflow }}', emailFormat: 'text', text: '=Workflow: {{ $json.workflow }}\nExecução: {{ $json.executionId }}\nData: {{ $json.occurredAt }}\nResumo: {{ $json.message }}', options: {},
  }, [30, 90]),
  node('Registrar alerta no ledger', 'n8n-nodes-base.code', 2, {
    jsCode: `// Futuro: persistir uma entrada de falha no state.json ou PostgreSQL, sem segredos.\nreturn items;`,
  }, [300, 90]),
  note('Critério de ativação', `## Só ative depois de\n\n1. Testar uma publicação manual de cada rede.\n2. Confirmar que o alerta chega sem expor segredo.\n3. Registrar ID e permalink de retorno no ledger.\n4. Definir limite de tentativas e regra de retomar sem duplicar publicação.`, [240, -200], 420, 205),
], {
  'Erro de outro workflow': { main: [[{ node: 'Sanitizar ocorrência', type: 'main', index: 0 }]] },
  'Teste manual': { main: [[{ node: 'Sanitizar ocorrência', type: 'main', index: 0 }]] },
  'Sanitizar ocorrência': { main: [[{ node: 'Enviar alerta SMTP', type: 'main', index: 0 }]] },
  'Enviar alerta SMTP': { main: [[{ node: 'Registrar alerta no ledger', type: 'main', index: 0 }]] },
});

const files = [
  ['07-fila-e-roteador.sanitized.json', queue],
  ['08-meta-instagram-facebook.sanitized.json', meta],
  ['09-linkedin-empresa.sanitized.json', linkedin],
  ['10-x-thread.sanitized.json', x],
  ['11-monitoramento-alerta.sanitized.json', monitoring],
];

fs.mkdirSync(output, { recursive: true });
for (const [file, value] of files) {
  fs.writeFileSync(path.join(output, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
console.log(`Workflows gerados: ${files.length}`);

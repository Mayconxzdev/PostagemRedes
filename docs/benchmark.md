# Benchmark de arquitetura — Postagem Redes

Pesquisa realizada em 15 de julho de 2026, usando templates públicos atuais do n8n e a documentação da instalação n8n 2.27.3.

## Padrões que se repetem

| Padrão | Evidência nos templates | Decisão neste projeto |
|---|---|---|
| Fonte única de verdade por conteúdo | Planilhas costumam guardar rede, status e data por postagem. | A biblioteca visual e `state.json` são a fonte operacional; a Data Table nativa espelha o ledger, sem exigir Google Sheets. |
| Variantes por rede | Templates de IA criam textos diferentes para LinkedIn, X e Instagram. | O portal salva `instagram`, `facebook`, `linkedin` e thread `x` como rascunhos revisáveis. |
| Aprovação humana | Os templates maduros não deixam IA publicar sem revisão. | A IA nunca altera a legenda aprovada; uma pessoa deve salvar/aprovar/agendar no portal. |
| Agendamento e status por rede | Fluxos de produção atualizam “posted/failed” após cada destino. | A fila reserva uma entrega por rede, guarda `dispatchId`, ID remoto, permalink, erro e retry. |
| Mídia tratada por API | Meta, LinkedIn e X exigem etapas próprias de upload/publicação. | Carrossel Meta e multi-imagem LinkedIn usam as APIs oficiais no HTTP Request; OpenAI e X usam nós nativos atuais. |

## Onde o projeto é mais forte

- Não depende de Google Sheets como tela de trabalho: o chefe visualiza slides, reorganiza, edita texto, sobe conteúdo rápido e aprova no navegador.
- Mantém as quatro redes definidas para a empresa, em vez de um template genérico com “uma imagem/um texto”.
- Faz publicação de carrossel de verdade: containers no Instagram, fotos não publicadas no Facebook, URNs de imagem no LinkedIn e mídia + sequência no X.
- Mantém proteção operacional explícita: trava global, flags por provedor/rede, URLs assinadas para mídia externa, reserva idempotente, retry limitado e histórico interno.
- Usa nós atuais da própria instância e deixa HTTP Request somente onde o n8n não possui uma operação nativa completa.

## O que foi deliberadamente evitado

Agregadores de postagem simplificam a configuração, mas cobram outro serviço, centralizam credenciais fora do ambiente e podem esconder diferenças entre API de Página, carrossel e mídia. O projeto mantém integrações diretas para controle, auditabilidade e apresentação técnica no portfólio. Um agregador pode ser adicionado depois como alternativa, nunca como dependência obrigatória.

## Referências consultadas

- [Automated social media content creation with OpenAI, LinkedIn & Twitter approval](https://n8n.io/workflows/6486-automated-social-media-content-creation-with-openai-linkedin-and-twitter-approval/)
- [Automate social media content creation & publishing with AI & human approval flow](https://n8n.io/workflows/8700-automate-social-media-content-creation-and-publishing-with-ai-and-human-approval-flow/)
- [Post scheduled social content from Google Sheets to Instagram, Facebook, and LinkedIn](https://n8n.io/workflows/16348-post-scheduled-social-content-from-google-sheets-to-instagram-facebook-and-linkedin/)
- [Data tables — n8n Docs](https://docs.n8n.io/data/data-tables/)
- [Error handling — n8n Docs](https://docs.n8n.io/flow-logic/error-handling/)

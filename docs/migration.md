# Notas de migração para n8n 2.27+

## Evolução aplicada

A versão legada concentrava seleção em Google Drive/Sheets, geração e publicação no mesmo orquestrador. A evolução introduz uma camada de aprovação visual independente:

- três workflows adicionais para portal, ação e entrega restrita de arquivos;
- biblioteca local persistente que aceita carrosséis e `Texto.txt`;
- formulário de postagem rápida para conteúdo urgente que ainda não está na biblioteca;
- estados `pendente`, `aprovado`, `agendado`, `rejeitado` e `incompleto`;
- ledger de decisão com operador, horário, comentário e redes;
- aprovação sempre passa pela trava global antes de qualquer conector de rede.

Na revisão de 15/07/2026, a instância local em uso estava em n8n 2.27.3 e expunha 896 tipos de nós. O ambiente foi reduzido a cinco workflows publicados e realmente utilizados: dois do Mala Direta e os três workflows do Portal de Postagem. Os canvases que não eram produção foram arquivados de forma reversível após a auditoria. O workflow `05 · Portal: Ações` passou a concentrar o publicador completo, usando versões atuais dos nós instalados:

- `Schedule Trigger` 1.3 e `Loop Over Items (Split in Batches)` 3 para fila controlada;
- `Switch` 3.4 e `If` 2.3 para roteamento e pré-validação;
- `OpenAI` 2.3, `Google Gemini` 1.2 e `Ollama` 1 para a cadeia de IA com fallback;
- `Data Table` 1.1 para um ledger interno consultável;
- `HTTP Request` 4.4 para endpoints oficiais que o n8n não abstrai por completo;
- `X (Formerly Twitter)` 2 para post inicial e respostas encadeadas;
- `Read/Write Files from Disk` 1.1 para upload binário do LinkedIn e X;
- `LinkedIn` multi-imagem e carrosséis Meta via HTTP Request, pois o nó nativo não cobre essas operações completas.

Nenhuma publicação social foi executada nesta etapa. A atualização deixa o canvas moderno, auditável e pronto para conectar acessos, sem alterar o comportamento do portal nem do Mala Direta enquanto `SOCIAL_PUBLISH_ENABLED=false`.

## Compatibilidade com workflows legados

Os workflows legados de orquestração, alerta de erros e retry permanecem arquivados e inativos. Não foram apagados porque documentam a arquitetura anterior: geração assistida por IA, armazenamento externo, tratamento de falhas e retentativas. Consulte o inventário em [workflow-audit.md](workflow-audit.md) antes de reutilizar qualquer trecho deles.

O portal não exige Google Drive ou Google Sheets para a operação diária. Quando necessário, o orquestrador legado pode ser evoluído para criar rascunhos diretamente na fila visual, em vez de publicar ao concluir a geração.

## Itens que exigem configuração manual

- Importar/publicar os workflows do portal na instância n8n correta.
- Garantir volume persistente e permissão restrita de leitura/escrita em `/files/postagem-redes`.
- Criar atalho apontando para a rota do portal no servidor local.
- Definir a lista de computadores/VLAN autorizados a acessar o portal sem login.
- Configurar OAuth/credenciais de Meta, LinkedIn e X quando iniciar a fase de publicação.
- Definir backup, retenção e eventual migração da reserva de fila para PostgreSQL quando a concorrência exigir.

## Próxima evolução recomendada

1. Conectar uma rede de teste por vez nas rotas nomeadas do `05 · Portal: Ações` e registrar IDs/permalinks no Ledger.
2. Validar retry e retorno de permalink de cada rede antes de habilitar a trava global de publicação.
3. Migrar a reserva de fila para banco quando a quantidade de campanhas ou usuários justificar.
4. Adicionar autenticação/HTTPS antes de abrir o portal fora da LAN.

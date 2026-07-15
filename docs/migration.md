# Notas de migração para n8n 2.27+

## Evolução aplicada

A versão legada concentrava seleção em Google Drive/Sheets, geração e publicação no mesmo orquestrador. A evolução introduz uma camada de aprovação visual independente:

- três workflows adicionais para portal, ação e entrega restrita de arquivos;
- biblioteca local persistente que aceita carrosséis e `Texto.txt`;
- formulário de postagem rápida para conteúdo urgente que ainda não está na biblioteca;
- estados `pendente`, `aprovado`, `agendado`, `rejeitado` e `incompleto`;
- ledger de decisão com operador, horário, comentário e redes;
- nenhum conector de rede é chamado por aprovação nesta etapa.

Na revisão de 15/07/2026, a instância local em uso estava em n8n 2.27.3 e expunha 896 tipos de nós. O ambiente foi reduzido a cinco workflows publicados e realmente utilizados: dois do Mala Direta e os três webhooks do Portal de Postagem. Os oito canvases que não eram produção foram arquivados de forma reversível após a auditoria. Os cinco exports de publicação/monitoramento (`07` a `11`) permanecem no Git como rascunhos de homologação, todos usando versões atuais dos nós instalados:

- `Schedule Trigger` 1.3 e `Loop Over Items (Split in Batches)` 3 para fila controlada;
- `Switch` 3.4 e `If` 2.3 para roteamento e pré-validação;
- `HTTP Request` 4.4 para endpoints oficiais que o n8n não abstrai por completo;
- `X (Formerly Twitter)` 2 para post inicial e respostas encadeadas;
- `LinkedIn` 1 como alternativa nativa de uma imagem, com Posts API multiimagem em HTTP Request;
- `Send Email` 2.1 e `Error Trigger` para monitoramento.

Nenhum publicador social foi ativado nessa etapa. A atualização é estrutural: deixa o canvas moderno, auditável e pronto para conectar acessos sem mudar o comportamento do portal nem do Mala Direta.

## Compatibilidade com workflows legados

Os workflows de orquestração, alerta de erros e retry permanecem isolados e inativos no export de portfólio. Não foram apagados porque documentam uma arquitetura complementar: geração assistida por IA, armazenamento externo, tratamento de falhas e retentativas. Consulte o inventário em [workflow-audit.md](workflow-audit.md) antes de reutilizar qualquer trecho deles.

O portal não exige Google Drive ou Google Sheets para a operação diária. Quando necessário, o orquestrador legado pode ser evoluído para criar rascunhos diretamente na fila visual, em vez de publicar ao concluir a geração.

## Itens que exigem configuração manual

- Importar/publicar os workflows do portal na instância n8n correta.
- Garantir volume persistente e permissão restrita de leitura/escrita em `/files/postagem-redes`.
- Criar atalho apontando para a rota do portal no servidor local.
- Definir a lista de computadores/VLAN autorizados a acessar o portal sem login.
- Configurar OAuth/credenciais de Meta, LinkedIn e X quando iniciar a fase de publicação.
- Definir backup, retenção e eventual migração da fila para PostgreSQL/Data Table.

## Próxima evolução recomendada

1. Conectar uma rede de teste por vez nos workflows `08` a `10` e registrar IDs/permalinks no ledger.
2. Completar a etapa de idempotência persistente e retorno de permalink em cada publicador antes de ativar o `07`.
3. Migrar o estado para banco quando a quantidade de campanhas ou usuários justificar.
4. Adicionar autenticação/HTTPS antes de abrir o portal fora da LAN.

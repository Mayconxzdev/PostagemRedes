# Notas de migração para n8n 2.27+

## Evolução aplicada

A versão legada concentrava seleção em Google Drive/Sheets, geração e publicação no mesmo orquestrador. A evolução introduz uma camada de aprovação visual independente:

- três workflows adicionais para portal, ação e entrega restrita de arquivos;
- biblioteca local persistente que aceita carrosséis e `Texto.txt`;
- formulário de postagem rápida para conteúdo urgente que ainda não está na biblioteca;
- estados `pendente`, `aprovado`, `agendado`, `rejeitado` e `incompleto`;
- ledger de decisão com operador, horário, comentário e redes;
- nenhum conector de rede é chamado por aprovação nesta etapa.

## Compatibilidade com workflows legados

Os workflows de orquestração, alerta de erros e retry permanecem isolados e inativos no export de portfólio. Não foram apagados porque documentam uma arquitetura complementar: geração assistida por IA, armazenamento externo, tratamento de falhas e retentativas.

O portal não exige Google Drive ou Google Sheets para a operação diária. Quando necessário, o orquestrador legado pode ser evoluído para criar rascunhos diretamente na fila visual, em vez de publicar ao concluir a geração.

## Itens que exigem configuração manual

- Importar/publicar os workflows do portal na instância n8n correta.
- Garantir volume persistente e permissão restrita de leitura/escrita em `/files/postagem-redes`.
- Criar atalho apontando para a rota do portal no servidor local.
- Definir a lista de computadores/VLAN autorizados a acessar o portal sem login.
- Configurar OAuth/credenciais de Meta, LinkedIn e X quando iniciar a fase de publicação.
- Definir backup, retenção e eventual migração da fila para PostgreSQL/Data Table.

## Próxima evolução recomendada

1. Implementar um workflow agendador que consome somente `agendado` na hora correta.
2. Implementar publicadores por plataforma, cada um com idempotência, observabilidade e retorno de permalink.
3. Adaptar X como uma thread, não como cópia integral da legenda de carrossel.
4. Migrar o estado para banco quando a quantidade de campanhas ou usuários justificar.
5. Adicionar autenticação/HTTPS antes de abrir o portal fora da LAN.

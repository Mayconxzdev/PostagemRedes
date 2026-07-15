# Auditoria dos workflows legados

## Resultado da revisão

A revisão foi feita contra a instância local em n8n 2.27.3. O orquestrador legado (`03-orquestrador-conteudo`) possui 63 nós, está inativo e mistura geração de conteúdo, Google Drive/Sheets, publicação, alertas e retentativas no mesmo canvas. Ele é útil como histórico, mas não deve ser reativado como publicador da fila visual.

Os workflows `07` a `11` foram criados para substituir o que ainda tem papel operacional, com responsabilidades menores e nós atuais. Eles também estão inativos.

### Inventário operacional validado — 15/07/2026

A lista da instância foi confrontada com status de publicação, histórico de execuções e conexões de cada canvas antes da limpeza. Permaneceram visíveis como produção somente cinco workflows:

| Workflow publicado | Papel validado | Evidência operacional |
|---|---|---|
| `Mala Direta Vesper — Principal (Atalho)` | Portal, fila, agendamento, exportação e envio de campanha. | 147 nós; execuções de sucesso recentes; webhook e agendamentos ativos. |
| `Mala Direta Vesper — Tratamento de Erros (Ativo)` | Recebe e registra falhas do workflow principal. | `Error Trigger` associado ao workflow principal. |
| `Postagem Redes — Portal Visual` | Entrega a biblioteca visual. | Webhook GET publicado, com execuções de sucesso recentes. |
| `Postagem Redes — Portal: Arquivos` | Entrega mídias autorizadas ao portal. | Webhook publicado, com execuções de sucesso recentes. |
| `Postagem Redes — Portal: Ações` | Persiste decisão, ordem de slides e uploads. | Webhook publicado; cadeia Webhook → Code → Respond sem conexões quebradas. |

Os oito workflows restantes foram **arquivados, não apagados**: os cinco rascunhos `07`–`11` ainda dependem de OAuth/IDs reais e os três legados não participam do portal atual. Arquivar limpa a visão padrão do n8n e mantém uma recuperação possível caso seja necessário consultar o histórico. Os exports sanitizados continuam no Git apenas como documentação e base de homologação.

## Mapa de substituição

| Bloco legado | Situação | Destino atualizado | Motivo |
|---|---|---|---|
| Google Sheets/Drive como fila principal | Opcional, não é mais a operação diária | Portal + `07 — Fila e roteador` | O portal já recebe biblioteca e postagem rápida sem planilha. |
| `Split in Batches` antigo | Substituído | `Loop Over Items` v3 | Processa uma publicação por vez, preservando ordem e controle de retry. |
| `Switch`/`If` antigos | Substituídos | `Switch` 3.4 e `If` 2.3 | Roteamento explícito por rede e bloqueio por pré-requisito. |
| “Vagões” HTTP de Instagram | Não reutilizar | `08 — Meta` | Os endpoints atuais ficam nomeados e separados por containers, polling e publicação. |
| `Postagem instagram` (`NoOp`) | Remover do caminho produtivo | `08 — Meta` | O nó não publicava; apenas mascarava a ausência de integração. |
| Facebook HTTP único | Refeito | `08 — Meta` | Carrossel de Página exige fotos/IDs e post final, não uma chamada genérica. |
| Twitter legado/OAuth 1 | Substituído | `10 — X thread` | A instância tem X v2/OAuth2 para posts e respostas; mídia é tratada por HTTP Request. |
| LinkedIn de pessoas específicas | Substituído | `09 — LinkedIn Empresa` | O objetivo definido é Página da empresa, não perfis pessoais. |
| Google Drive/Sheets de histórico | Legado opcional | Ledger atual; banco futuro | Evita duplicar a fonte de verdade da fila. |
| `Gravar no Disco`, `Ler do Disco`, `Code (Goleiro)` desconectados | Não usar | Portal/ledger atual | Estavam fora do caminho executável do legado. |
| `Verificação da imagem` e `[Sheets] Registrar Uso1` desconectados | Não usar | Validação no portal + ledger | Não participavam do fluxo real. |
| IA Gemini/OpenAI/Ollama com fallback | Opcional | Workflow de rascunho separado, se necessário | Geração assistida não deve publicar sem revisão humana. |
| E-mails de sucesso/falha | Refeito | `11 — Monitoramento e alerta` | Trata erro sem expor token e centraliza o aviso. |

## Nós intencionalmente mantidos

Nem tudo que usa Code ou HTTP Request é “legado”. Para este projeto, esses nós têm papel objetivo:

- **Code**: leitura controlada da biblioteca/ledger local, normalização de conteúdo, adaptação de thread e sanitização de erro. O acesso é limitado ao volume `/files`.
- **HTTP Request 4.4**: partes das APIs sociais que não têm um nó nativo completo, principalmente carrosséis Meta, multiimagem LinkedIn e mídia X.
- **LinkedIn nativo**: mantido como alternativa de teste para texto/uma imagem, mas desativado no canvas para não reduzir silenciosamente um carrossel.
- **X nativo v2**: usado para criação do post e respostas; o upload de mídia não é coberto pelo nó atual e por isso fica separado.

## O que não deve ser feito

- Não ative o orquestrador `03` para publicar a fila do portal.
- Não conecte os publicadores novos diretamente a uma conta real antes do teste de uma conta/canal de teste.
- Não cole tokens em nós Code, parâmetros, exports, GitHub ou chat.
- Não atualize a versão global do n8n junto com esta migração: a mesma instância atende o Mala Direta e a atualização deve ocorrer em uma manutenção isolada, com backup e teste.

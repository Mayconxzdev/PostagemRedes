# Consolidação dos workflows

## Decisão de portfólio

Em 15/07/2026, a instância local foi revisada em n8n 2.27.3. A revisão separou duas coisas que não devem ser confundidas em uma apresentação profissional:

1. **a operação atual**, mantida por três workflows ativos de Postagem Redes; e
2. **histórico de migração**, formado por rascunhos antigos de planilha, Drive, alertas e publicadores separados.

Os rascunhos históricos não fazem parte deste repositório público. Eles tinham valor de diagnóstico, mas adicionavam código e referências antigas que não representam a arquitetura que está em uso. Manter somente os exports sustentados torna a revisão mais objetiva e evita a leitura equivocada de que vários caminhos concorrentes precisam ser ativados.

## Inventário operacional validado

| Workflow ativo | Papel validado | Escopo |
|---|---|---|
| `Postagem Redes — Portal Visual` | Entrega biblioteca, filtros, editor e upload rápido. | Sem publicação externa. |
| `Postagem Redes — Portal: Ações` | Persiste decisões, IA assistiva, fila, retry, ledger e rotas sociais. | Publicação bloqueada até homologação por variável. |
| `Postagem Redes — Portal: Arquivos` | Entrega mídias autorizadas ao portal. | Valida item/nome; URL assinada no modo público. |

Os dois workflows de Mala Direta permanecem fora deste repositório e não foram modificados por essa consolidação.

## Responsabilidades incorporadas

| Necessidade da automação anterior | Solução atual | Por que é mais segura |
|---|---|---|
| Planilha/Drive como fila principal | Portal visual + estado local + Ledger nativo | A operação diária não depende de editar uma planilha. |
| Geração e publicação no mesmo caminho | Rascunho de IA separado da decisão | A IA não publica e não sobrescreve texto aprovado. |
| Retentativa genérica | Reserva por destino, `dispatchId` e até três tentativas | Evita repetir uma publicação confirmada em outra rede. |
| Um conector igual para todas as redes | Faixas específicas de Meta, LinkedIn e X | Respeita mídia, carrossel e thread de cada API. |
| Histórico disperso | `state.json` + Data Table `Postagem Redes - Ledger` | Mantém decisão e resultado consultáveis. |

## Nós usados de forma intencional

- **Code:** leitura controlada da biblioteca/ledger local, normalização, assinatura de URL e adaptação de thread. O acesso fica limitado ao volume `/files`.
- **Webhook e Respond to Webhook:** separam interface (`GET`), ações (`POST`) e mídia (`GET`) para reduzir exposição e acoplamento.
- **Data Table:** ledger interno de resultados por rede, sem exigir um banco externo para a escala atual.
- **Schedule Trigger + Loop Over Items:** selecionam e processam uma entrega por vez, preservando a reserva e a ordem de retry.
- **OpenAI, Google Gemini e Ollama:** cadeia de IA desligada por padrão; o resultado é somente uma sugestão revisável.
- **HTTP Request:** usado onde o nó nativo ainda não cobre o contrato completo de carrossel/multiimagem/mídia. Isso é mais explícito do que reduzir silenciosamente o conteúdo a uma imagem.
- **X v2:** criação de post e respostas; o fluxo de mídia fica separado conforme o contrato da plataforma.

## Guardrails de ativação

- Não liberar `SOCIAL_PUBLISH_ENABLED` antes de homologar uma conta de teste por rede e confirmar IDs/permalinks no Ledger.
- Não adicionar segredos ao canvas, aos exports, ao GitHub ou ao chat; use somente o cofre criptografado de credenciais do n8n.
- Não expor o portal da LAN sem HTTPS, autenticação e uma regra de rede apropriada.
- Não alterar a imagem global do n8n durante a homologação: a mesma instância atende outro processo operacional e atualizações precisam de janela de manutenção e backup.

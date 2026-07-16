# Evolução para n8n 2.27+

## Decisão de arquitetura

A automação anterior concentrava seleção de conteúdo, geração, publicação e fontes externas em um orquestrador difícil de operar. A evolução adotou uma camada visual de aprovação e separou a operação em três workflows sustentados:

- **Portal Visual:** biblioteca, filtros, editor, prévias e formulário de postagem rápida;
- **Portal: Ações:** decisões, rascunhos assistidos, fila, retry, auditoria e rotas de publicação;
- **Portal: Arquivos:** entrega controlada de mídia vinculada ao conteúdo solicitado.

Google Sheets e Google Drive deixaram de ser necessários para a operação diária. A biblioteca local aceita carrosséis e `Texto.txt`; a fila e os resultados por rede são registrados no estado operacional e no Ledger nativo do n8n.

## Atualização de nós

Os workflows sanitizados foram atualizados para os nós disponíveis na instância n8n 2.27.3, priorizando componentes nativos e contratos explícitos quando uma API exige comportamento específico:

| Necessidade | Implementação atual |
|---|---|
| Execução da fila | `Schedule Trigger` e `Loop Over Items (Split in Batches)` |
| Decisão e roteamento | `Switch` e `If` |
| Rascunhos assistidos | `OpenAI`, `Google Gemini` e `Ollama`, ativados por variável |
| Histórico por destino | `Data Table` nativo |
| APIs sem abstração suficiente | `HTTP Request` com contratos explícitos |
| Mídia local | `Read/Write Files from Disk` limitado ao volume `/files` |
| Thread no X | nó nativo `X (Formerly Twitter)` v2 para post inicial e respostas |

As rotas de Instagram, Facebook, LinkedIn e X foram preparadas para as APIs oficiais. Elas não executam chamadas externas enquanto a trava global estiver desligada e cada conta não tiver sido homologada.

## Itens que exigem configuração manual

- Importar, publicar e ativar os três workflows na instância n8n correta.
- Montar volume persistente e restringir leitura/escrita a `/files/postagem-redes`.
- Criar atalhos para a rota interna do portal e limitar o acesso aos computadores ou VLAN autorizados.
- Cadastrar OAuth/credenciais de Meta, LinkedIn e X no cofre do n8n.
- Definir backup, retenção e migração da reserva de fila para PostgreSQL caso o volume ou a concorrência justifiquem.

## Próxima validação operacional

1. Homologar uma rede de teste por vez e registrar ID remoto/permalink no Ledger.
2. Exercitar erro de API, mídia inválida e retry antes de liberar a rede seguinte.
3. Liberar a trava global somente depois de confirmar as redes que serão usadas na operação.
4. Adicionar HTTPS, autenticação e restrição de origem antes de qualquer exposição fora da LAN.

Consulte [workflow-audit.md](workflow-audit.md) para a decisão de manter somente os três workflows de Postagem Redes.

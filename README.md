# Postagem Redes

[![Validação do projeto](https://github.com/Mayconxzdev/PostagemRedes/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/Mayconxzdev/PostagemRedes/actions/workflows/validate.yml)

Desenvolvi uma central visual e três workflows n8n para organizar carrosséis técnicos, revisar legendas, escolher redes, aprovar conteúdo e registrar o resultado individual de cada tentativa de publicação.

> **Estado atual:** revisei os workflows na instância local **n8n 2.33.5**. Facebook e Instagram foram exercitados em ambiente de teste. Uma tentativa posterior no Instagram encontrou limite do túnel público de mídia; X continua bloqueado por crédito da conta de teste e LinkedIn depende de acesso à Página.

## Visão geral

| Aspecto | Situação atual |
|---|---|
| **Arquitetura** | Três workflows: portal visual, ações/agendamento e serviço controlado de arquivos. |
| **Fluxo principal** | O workflow de ações possui 58 nós no snapshot público atual. |
| **IA aplicada** | OpenAI → Gemini → Ollama como cadeia opcional para rascunho, sempre com aprovação humana. |
| **Grounding/RAG** | No ambiente pessoal/interno, a recuperação de contexto usa LangChain, Supabase e n8n/Docker para apoiar respostas com informações da própria base antes da revisão. A base de conhecimento e seus dados não são publicados neste snapshot. |
| **Integrações** | Meta Graph API, OAuth2, APIs HTTP e resultado independente por rede. |
| **Confiabilidade** | Reserva por destino, `dispatchId`, idempotência, retry, ledger e falha isolada por canal. |
| **Versão pública** | Exports inativos e sanitizados, demo sem chamadas externas, validação de privacidade e GitHub Actions. |

## Problema que resolvi

O conteúdo técnico ficava espalhado entre pastas, planilhas e mensagens. Organizei o processo em um único fluxo com:

- biblioteca visual de carrosséis;
- revisão de legenda e prévia;
- responsável, comentário, canais e agendamento;
- recuperação de contexto/grounding antes da geração quando a base interna está habilitada;
- geração assistida de rascunho;
- aprovação humana antes das APIs externas;
- fila e resultado individual por rede;
- histórico e ledger de entregas.

## Estado por canal

| Canal | O que aconteceu | Estado atual |
|---|---|---|
| **Facebook** | Publicação multi-imagem confirmada em Página de teste controlada. | **Funcionou em teste** |
| **Instagram** | OAuth e publicação foram exercitados; uma tentativa posterior com seis imagens falhou pelo tempo de download através do túnel. | **Fluxo validado com limite de infraestrutura** |
| **X** | A rota e o registro existem; a conta de teste retornou limite de créditos. | **Bloqueado pelo provedor** |
| **LinkedIn** | O fluxo está preparado, mas a credencial e o acesso à Página não foram fornecidos. | **Pendente de acesso externo** |

Essa separação deixa claro o que já funcionou, o que depende de infraestrutura e o que ainda depende de acesso externo.

## Interface

### Biblioteca

![Biblioteca visual](docs/assets/screenshots/01-biblioteca-visual.png)

### Revisão e decisão

![Editor de publicação](docs/assets/screenshots/02-editor-de-publicacao.png)

### Postagem rápida

![Postagem rápida](docs/assets/screenshots/03-postagem-rapida.png)

As telas usam conteúdo fictício e anonimizado. A [demo navegável](docs/demo/index.html) não chama n8n nem serviços externos.

## Workflows

| Workflow | Gatilho | Responsabilidade |
|---|---|---|
| `Portal Visual` | Webhook `GET` | Biblioteca, filtros, prévias, modais e upload rápido. |
| `Portal: Ações` | Webhook `POST` + agenda | Decisões, contexto/rascunho assistido, reservas, publicação, falhas e ledger. |
| `Portal: Arquivos` | Webhook `GET` | Entrega somente a mídia validada do conteúdo solicitado. |

O export [`05-portal-acoes.sanitized.json`](workflows/05-portal-acoes.sanitized.json) possui 58 nós, fica inativo por segurança e passa pela validação automática.

![Canvas real do workflow Portal Ações](docs/assets/n8n-real/05-portal-acoes-canvas-completo.png)

## Fluxo de decisão

```mermaid
flowchart LR
    U[Usuário] --> P[Portal visual]
    P --> H[Aprovação humana]
    H --> A[Workflow de ações]
    A --> AI[Contexto + IA opcional]
    A --> R[Reserva por rede]
    R --> FB[Facebook]
    R --> IG[Instagram]
    R --> X[X]
    R --> LI[LinkedIn]
    FB --> L[Ledger]
    IG --> L
    X --> L
    LI --> L
```

## Grounding e base de conhecimento

No ambiente original, uso uma camada de recuperação de contexto com **LangChain + Supabase + n8n/Docker** para consultar informações da própria base antes de montar o rascunho. O objetivo é reduzir afirmações sem base sobre produtos, capacidades ou informações da empresa.

Essa camada é diferente do snapshot público: documentos, embeddings, registros e configurações da base interna permanecem privados. Portanto, este repositório demonstra publicamente o fluxo de publicação e seus guardrails, enquanto a implementação operacional de conhecimento é descrita sem expor o conteúdo corporativo.

## Decisões técnicas

- separei interface, ações e mídia em três workflows;
- mantive OAuth no cofre do n8n;
- usei chamadas HTTP específicas quando o nó oficial não cobria o contrato necessário;
- reservei cada destino e gerei um `dispatchId` antes da chamada externa;
- isolei falhas por canal para que uma rede não cancele as demais;
- mantive a legenda aprovada como fonte principal, mesmo quando a IA sugere um rascunho;
- usei grounding/recuperação de contexto quando a base interna está disponível, sem publicar seus dados;
- limitei o portal sem login à rede local;
- deixei PostgreSQL como evolução prevista caso concorrência e retenção cresçam.

## Documentação

- [Arquitetura](docs/architecture.md)
- [AI System Card](docs/AI_SYSTEM_CARD.md) — papel da IA, human-in-the-loop, risco de terceiros e limites
- [Detalhes técnicos](docs/evidence.md)
- [Operação do portal](docs/portal.md)
- [Setup seguro](docs/setup.md)
- [Segurança](docs/security.md)
- [Testes e próximos passos](docs/testing.md)
- [Migração](docs/migration.md)
- [Exports sanitizados](workflows/README.md)

## Validar a cópia pública

```powershell
node scripts/build-portfolio-demo.mjs
node scripts/validate-portfolio-workflows.mjs
node scripts/validate-portal-code.mjs
pwsh -NoProfile -File scripts/validate-workflows.ps1
```

A validação rejeita JSON inválido, credenciais serializadas, e-mails reais, IDs internos, domínios temporários de túnel e exports ativos.

## Tecnologias

`n8n 2.33.5` · `Docker` · `JavaScript` · `Node.js` · `Webhooks` · `OAuth2` · `Meta Graph API` · `HTTP APIs` · `LangChain` · `Supabase` · `RAG/grounding` · `Data Tables` · `Idempotência` · `Retry` · `Auditoria` · `GitHub Actions`

## Autor

**Maycon Ferreira** — produto, workflows, integrações, IA aplicada, experiência operacional, testes e documentação.

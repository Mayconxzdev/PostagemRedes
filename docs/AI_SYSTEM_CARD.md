# AI System Card — Postagem Redes

Este documento descreve **o papel real da IA no fluxo, as fronteiras de decisão, a dependência de terceiros e os controles usados antes de qualquer publicação externa**.

## Finalidade

A IA existe para **apoiar o rascunho e recuperar contexto**, não para decidir sozinha o que deve ser publicado. A legenda revisada/aprovada continua sendo a fonte principal do envio.

O fluxo operacional é:

```text
conteúdo/contexto → rascunho opcional → revisão humana → aprovação
→ reserva por rede → API externa → resultado por canal → ledger
```

## Provedores de IA

A cadeia opcional registrada no projeto é:

**OpenAI → Gemini → Ollama**

Ela funciona como capacidade auxiliar. A indisponibilidade de um provedor não transforma automaticamente outro modelo em fonte de verdade e não remove a etapa humana.

No ambiente pessoal/interno, o grounding usa **LangChain + Supabase + n8n/Docker** para recuperar informações da própria base antes de preparar um rascunho. Documentos, embeddings e registros reais não fazem parte do snapshot público.

## Dados e fronteiras

A versão pública não contém:

- base interna de conhecimento;
- embeddings ou documentos corporativos;
- tokens OAuth;
- IDs reais de Página/conta;
- campanhas, conteúdo confidencial ou credenciais;
- domínios temporários usados em testes.

Qualquer uso de um modelo externo precisa considerar quais dados são enviados ao provedor. O projeto não assume que toda informação interna pode sair do ambiente.

## Human-in-the-loop

Antes de uma chamada de publicação, a pessoa revisa e decide:

- conteúdo/legenda;
- mídia;
- canais;
- responsável e comentário quando aplicável;
- agendamento;
- aprovação final.

A IA não possui autoridade para publicar diretamente por ter produzido um rascunho.

## Risco de terceiros

O sistema depende de serviços externos em duas categorias:

1. **modelos/provedores de IA**, quando habilitados;
2. **APIs das redes sociais**, para o efeito externo.

Os riscos não são tratados como equivalentes. Uma falha de geração pode resultar em ausência de sugestão; uma falha de publicação precisa preservar o estado operacional por destino.

| Risco | Tratamento |
| --- | --- |
| Provedor de IA indisponível | cadeia opcional/fallback e revisão humana |
| Saída sem base | grounding quando disponível + pessoa aprova o texto final |
| Uma rede falha | falha isolada por canal; as demais não são canceladas automaticamente |
| Repetição de chamada externa | reserva por destino, `dispatchId`, idempotência e ledger |
| OAuth/credencial | segredo mantido fora do export público e no cofre do n8n |
| Limite de API/crédito/permissão | estado explícito por canal, sem reportar sucesso fictício |
| Mídia externa indisponível/lenta | erro registrado e operação não promovida para “sucesso” |

## Segurança de prompt e conteúdo

A base recuperada deve ser tratada como **contexto não confiável até ser interpretada pelo fluxo**. Conteúdo textual recuperado não recebe autoridade para alterar credenciais, aprovações, canais ou regras do sistema.

Controles relevantes:

- separação entre contexto, rascunho, aprovação e execução;
- nenhum segredo é incorporado ao prompt público;
- campos de ação continuam governados pelo workflow;
- resultado de IA não substitui o objeto aprovado;
- cada efeito externo é registrado individualmente.

## Evidência atual

O snapshot público registra:

- **3 workflows**;
- workflow de ações com **58 nós**;
- Facebook com publicação multi-imagem confirmada em ambiente de teste controlado;
- Instagram exercitado em teste, com uma tentativa posterior limitada pela infraestrutura do túnel de mídia;
- X bloqueado por crédito da conta de teste;
- LinkedIn dependente de acesso à Página.

Esses estados são intencionalmente diferentes de “produção”. O projeto publica o que foi comprovado e mantém dependências externas como dependências.

## Limites

- não existe avaliação universal de qualidade dos modelos;
- comportamento e políticas dos provedores podem mudar;
- RAG/grounding reduz risco de afirmação sem base, mas não garante correção;
- aprovação humana não substitui políticas editoriais ou jurídicas da organização;
- publicação em rede social continua sujeita a permissões, limites e termos do provedor.

## Documentação relacionada

- [`architecture.md`](architecture.md)
- [`security.md`](security.md)
- [`testing.md`](testing.md)
- [`evidence.md`](evidence.md)
- [`setup.md`](setup.md)

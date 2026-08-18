# Evals reproduzíveis — IA aplicada

Esta pasta adiciona uma camada pública de **avaliação offline e independente de provedor** para os guardrails descritos no Postagem Redes.

Ela não afirma medir a qualidade absoluta de OpenAI, Gemini, Ollama ou qualquer outro modelo. O objetivo é tornar verificáveis contratos que devem continuar verdadeiros quando um rascunho de IA entra no fluxo:

- fontes citadas precisam pertencer ao conjunto autorizado;
- evidência mínima exigida pelo caso precisa estar presente;
- claims proibidas ou instruções injetadas em conteúdo recuperado não podem ser obedecidas;
- revisão humana continua obrigatória;
- a ação de publicação permanece em `hold` até a decisão humana.

Todos os dados desta pasta são sintéticos.

## Executar a baseline

Na raiz do repositório:

```bash
node evals/run-evals.mjs
```

O comando usa `evals/sample_outputs.json` e deve terminar com todos os casos aprovados.

## Avaliar outro provedor ou prompt

Gere um arquivo JSON com o mesmo formato de `sample_outputs.json` e execute:

```bash
node evals/run-evals.mjs caminho/para/candidate_outputs.json
```

Formato por caso:

```json
{
  "caseId": "grounded-capability",
  "draft": "texto candidato",
  "sourceIds": ["kb:capability:001"],
  "humanReviewRequired": true,
  "publishAction": "hold"
}
```

O runner retorna um relatório JSON por caso e falha com exit code diferente de zero quando algum contrato não passa. Isso permite comparar prompts/provedores em CI sem colocar credenciais ou documentos corporativos no repositório.

## Casos atuais

1. **grounded-capability** — afirmação baseada em fonte sintética autorizada;
2. **missing-evidence** — ausência de evidência não pode virar claim inventada;
3. **prompt-injection-in-source** — conteúdo recuperado é dado, não instrução operacional;
4. **channel-isolation** — indisponibilidade de canal não pode virar alegação de sucesso geral.

## O que esta avaliação não prova

- não mede factualidade em uma base corporativa real;
- não executa chamadas de LLM por padrão;
- não é benchmark estatístico de modelo;
- não substitui red teaming, avaliação humana ou observabilidade em produção;
- não promove Postagem Redes de “validado em teste” para “produção”.

Ela cria uma base reproduzível para evoluir de exemplos manuais para conjuntos de avaliação maiores sem comprometer privacidade ou inventar métricas.

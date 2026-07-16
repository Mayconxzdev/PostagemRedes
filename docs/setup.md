# Configuração e homologação segura

Este documento descreve a configuração operacional dos workflows. Os exports do repositório são sanitizados: credenciais, tokens, IDs corporativos e dados de clientes pertencem exclusivamente à instância de n8n que executará a automação.

## Portal de aprovação na rede interna

Pré-requisitos:

- n8n 2.27 ou superior em Docker;
- volume persistente montado no container como `/files`;
- os três workflows do portal importados, publicados e ativos;
- acesso à rede local do servidor n8n;
- variáveis `NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs,path` e `N8N_RESTRICT_FILE_ACCESS_TO=/files` configuradas no container.

O endereço do portal segue este formato:

```text
http://<servidor-n8n>:5678/webhook/postagem-redes
```

Um atalho `.url` pode ser distribuído apenas para os computadores autorizados. O portal foi projetado para uso interno; não o exponha publicamente sem HTTPS, autenticação e restrição de origem.

## Inserção de conteúdo

### Biblioteca organizada

Crie uma pasta dentro de `entrada/` para cada postagem:

```text
entrada/
└── campanha-exemplo/
    ├── 01.png
    ├── 02.png
    ├── 03.png
    └── Texto.txt
```

As imagens podem ser PNG, JPG/JPEG ou WEBP. A ordenação usa o nome do arquivo; prefixos como `01`, `02` e `03` tornam o carrossel previsível. Ao escolher **Atualizar biblioteca** no portal, o novo conteúdo fica disponível para revisão.

### Postagem rápida

No painel, escolha **Criar publicação**, informe responsável, título e legenda, e envie de 1 a 10 imagens. O workflow cria uma pasta segura na biblioteca e registra o item como pendente. Esse caminho existe para demandas urgentes que ainda não estão organizadas na biblioteca — sem depender de planilha.

## Variáveis do n8n

Crie as variáveis em **Settings → Variables**. Os valores iniciais abaixo preservam a operação em modo seguro até a homologação de cada integração.

| Variável | Valor inicial | Finalidade |
|---|---|---|
| `SOCIAL_AI_ENABLED` | `false` | Impede chamada de IA até a credencial estar pronta. |
| `SOCIAL_AI_MODEL` | `gpt-5-mini` | Modelo primário usado para gerar sugestões de texto. |
| `SOCIAL_AI_GEMINI_FALLBACK_ENABLED` | `false` | Habilita Gemini somente depois da configuração da credencial. |
| `SOCIAL_GEMINI_MODEL` | `gemini-3.5-flash` | Modelo Gemini usado no fallback por ID de variável. |
| `SOCIAL_AI_OLLAMA_FALLBACK_ENABLED` | `false` | Habilita Ollama somente depois de validar servidor e modelo local. |
| `SOCIAL_OLLAMA_MODEL` | `llama3.2` | Modelo local do último fallback. |
| `SOCIAL_PUBLISH_ENABLED` | `false` | Trava global: nenhum conteúdo é enviado a redes enquanto estiver falso. |
| `SOCIAL_META_ENABLED` | `false` | Libera a rota Meta somente após credencial e IDs válidos. |
| `SOCIAL_META_GRAPH_VERSION` | `v23.0` | Versão da Graph API usada pelos nós Meta. |
| `SOCIAL_META_INSTAGRAM_ACCOUNT_ID` | vazio | ID da conta profissional do Instagram. |
| `SOCIAL_META_PAGE_ID` | vazio | ID da Página do Facebook. |
| `SOCIAL_LINKEDIN_ENABLED` | `false` | Libera a rota multi-imagem do LinkedIn. |
| `SOCIAL_LINKEDIN_ORGANIZATION_URN` | vazio | URN da Página da empresa. |
| `SOCIAL_LINKEDIN_VERSION` | `202607` | Cabeçalho de versão da API LinkedIn. |
| `SOCIAL_X_ENABLED` | `false` | Libera criação de thread e upload de mídia no X. |
| `SOCIAL_PUBLIC_MEDIA_BASE_URL` | vazio | Base HTTPS pública do endpoint de mídia. |
| `SOCIAL_MEDIA_SIGNING_SECRET` | vazio | Segredo exclusivo para assinatura de URLs de imagens. |
| `SOCIAL_MEDIA_REQUIRE_SIGNED_URLS` | `false` | Só deve ser ativada após testar URLs assinadas no endpoint HTTPS. |

Os nós OpenAI, Gemini e Ollama usam **By ID** com `SOCIAL_AI_MODEL`, `SOCIAL_GEMINI_MODEL` e `SOCIAL_OLLAMA_MODEL`. A escolha permite trocar modelos centralmente sem editar o canvas. A IA sempre devolve um rascunho: a legenda só muda depois de uma ação explícita de revisão e salvamento no portal.

## Credenciais e dados de homologação

As contas sociais devem ser conectadas no cofre criptografado de credenciais do n8n. Nunca adicione segredos a Code nodes, exports, variáveis versionadas ou documentação.

| Serviço | Credencial no n8n | Dados operacionais necessários |
|---|---|---|
| Meta Graph API | OAuth2 da aplicação Meta com escopos mínimos de publicação | ID da Página, ID da conta profissional do Instagram, versão da Graph API e base HTTPS pública das mídias. |
| LinkedIn | OAuth2 Community Management para Página da empresa | URN da organização e versão da API. |
| X | OAuth2 com leitura, escrita e escopo de mídia | Configuração de mídia/thread e IDs retornados pelas chamadas. |
| SMTP | Credencial SMTP dedicada para alertas | Remetente autorizado e caixa ou grupo de falhas. |

### Sequência de homologação

1. Mantenha `SOCIAL_PUBLISH_ENABLED=false` durante toda a configuração.
2. Configure uma rede de teste por vez, com credenciais e IDs somente na instância n8n.
3. Para Meta e qualquer fluxo que baixa a mídia remotamente, publique um endpoint **HTTPS acessível pela plataforma**. Um endereço interno da LAN não é suficiente.
4. Faça uma publicação de teste, confirme o ID remoto e o permalink no Ledger e valide o comportamento de retry.
5. Habilite a variável específica da rede testada. Só libere `SOCIAL_PUBLISH_ENABLED=true` depois de repetir a validação em todas as redes desejadas.

## Ledger e escopo dos exports

`Portal: Ações` cria a Data Table interna **Postagem Redes - Ledger** quando o agendador é executado pela primeira vez. Ela registra sucesso ou falha por rede, conteúdo, `dispatchId`, ID remoto, permalink, erro e horário. O `state.json` segue como fonte imediata da biblioteca visual; a Data Table torna o histórico consultável dentro do n8n sem planilha ou banco externo.

O repositório contém somente os três exports mantidos (`04` a `06`). A decisão de consolidação está em [workflow-audit.md](workflow-audit.md).

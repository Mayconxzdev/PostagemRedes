# Configuração e credenciais

## Portal local de aprovação

Pré-requisitos do portal:

- n8n 2.27 ou superior em Docker;
- volume persistente montado no container como `/files`;
- acesso à rede local do servidor n8n;
- os três workflows do portal importados e publicados/ativos;
- variáveis `NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs,path` e `N8N_RESTRICT_FILE_ACCESS_TO=/files` configuradas no container.

O endereço do painel segue este formato:

```text
http://<servidor-n8n>:5678/webhook/postagem-redes
```

Crie um atalho `.url` com esse endereço para os computadores autorizados. O portal foi projetado para uso interno sem login; não o exponha na internet dessa forma.

## Como colocar novos conteúdos

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

As imagens devem ser PNG, JPG/JPEG ou WEBP. A ordenação usa o nome do arquivo; prefira prefixos `01`, `02`, `03` para um carrossel previsível. Ao clicar em **Atualizar biblioteca**, a nova postagem fica disponível.

### Postagem rápida

No painel, clique em **Nova postagem rápida**, informe o nome do responsável, um título, a legenda e envie de 1 a 10 imagens. O portal cria uma pasta segura na biblioteca e a coloca como pendente, sem depender de Google Sheets.

## Variáveis operacionais do n8n

Crie as variáveis em **Settings → Variables** do n8n. Os valores abaixo mantêm o sistema seguro até cada etapa ser homologada.

| Variável | Valor inicial | Uso |
|---|---|---|
| `SOCIAL_AI_ENABLED` | `false` | Impede qualquer chamada de IA até a credencial estar pronta. |
| `SOCIAL_AI_MODEL` | `gpt-5-mini` | Modelo usado para gerar sugestões de texto; pode ser ajustado depois. |
| `SOCIAL_AI_GEMINI_FALLBACK_ENABLED` | `false` | Habilita Gemini somente se o OpenAI falhar e a credencial Gemini estiver conectada. |
| `SOCIAL_GEMINI_MODEL` | `gemini-3.5-flash` | Modelo Gemini estável usado no fallback. O nó usa **By ID** para permitir troca centralizada pela variável. |
| `SOCIAL_AI_OLLAMA_FALLBACK_ENABLED` | `false` | Habilita Ollama local somente depois de validar o servidor e o modelo. |
| `SOCIAL_OLLAMA_MODEL` | `llama3.2` | Modelo Ollama local usado no último fallback. |
| `SOCIAL_PUBLISH_ENABLED` | `false` | Trava global: nenhum conteúdo pode ir para uma rede enquanto estiver falso. |
| `SOCIAL_META_ENABLED` | `false` | Libera somente a validação das entregas Instagram/Facebook após credencial e IDs Meta. |
| `SOCIAL_META_GRAPH_VERSION` | `v23.0` | Versão da Graph API usada pelos nós Meta; revise quando a Meta descontinuar uma versão. |
| `SOCIAL_META_INSTAGRAM_ACCOUNT_ID` | vazio | ID da conta profissional do Instagram. |
| `SOCIAL_META_PAGE_ID` | vazio | ID da Página do Facebook. |
| `SOCIAL_LINKEDIN_ENABLED` | `false` | Libera a rota de publicação multi-imagem do LinkedIn. |
| `SOCIAL_LINKEDIN_ORGANIZATION_URN` | vazio | URN da Página da empresa, por exemplo `urn:li:organization:...`. |
| `SOCIAL_LINKEDIN_VERSION` | `202607` | Cabeçalho da versão atual da API LinkedIn; revise mensalmente durante a manutenção da integração. |
| `SOCIAL_X_ENABLED` | `false` | Libera a criação da thread e o upload de mídia no X. |
| `SOCIAL_PUBLIC_MEDIA_BASE_URL` | vazio | URL HTTPS do endpoint de mídia, a ser preenchida após o Cloudflare Tunnel. |
| `SOCIAL_MEDIA_SIGNING_SECRET` | vazio | Segredo aleatório exclusivo para assinar URLs de imagens; nunca vai para Git. |
| `SOCIAL_MEDIA_REQUIRE_SIGNED_URLS` | `false` | Só mude para `true` depois de testar o túnel e as URLs assinadas. |

Para criar uma sugestão de IA, abra o nó nativo **OpenAI · sugestão primária** de `Portal: Ações` e selecione a credencial **OpenAI API** criada no cofre do n8n. Mude `SOCIAL_AI_ENABLED` para `true` somente depois do teste. Os três nós de modelo usam **By ID** com variáveis (`SOCIAL_AI_MODEL`, `SOCIAL_GEMINI_MODEL` e `SOCIAL_OLLAMA_MODEL`): isso é intencional, pois permite trocar um modelo de forma centralizada sem editar o canvas. Os nós **Gemini · fallback** e **Ollama · fallback local** são reais, mas permanecem desligados pelas variáveis até suas credenciais/servidor serem homologados. O portal sempre salva o retorno como rascunho: a legenda atual só muda quando alguém clica em **Usar legenda-base** e depois em **Salvar atualização**.

## Credenciais para publicação externa

O portal de aprovação não exige credenciais sociais. Elas só são necessárias ao conectar o publicador real, depois da homologação:

| Serviço | Onde será configurado | Acesso que deve ser criado no n8n | Dados não secretos que ainda precisam ser preenchidos |
|---|---|---|---|
| Meta Graph API | `Portal: Ações` | OAuth2 exclusivo da aplicação Meta, com permissões de publicação mínimas | ID da Página, ID da conta profissional do Instagram, versão Graph API e base HTTPS pública das mídias. |
| LinkedIn | `Portal: Ações` | **LinkedIn Community Management OAuth2** para a Página da empresa | URN/ID da organização e versão atual da API LinkedIn. |
| X | `Portal: Ações` | OAuth2 da aplicação X com leitura/escrita e escopo de mídia | Nenhum segredo no canvas; somente configuração de thread, mídia e IDs retornados. |
| SMTP | `Portal: Ações` | SMTP dedicado para falhas operacionais | Remetente autorizado e caixa/grupo que receberá os avisos. |

Crie segredos exclusivamente nas credenciais criptografadas do n8n; nunca edite exports de portfólio ou arquivos versionados para inserir tokens.

### Ordem segura de configuração

1. Deixe `SOCIAL_PUBLISH_ENABLED=false` durante toda a configuração e conecte uma única plataforma de teste por vez no respectivo nó de `Portal: Ações`.
2. Preencha IDs de Página/organização e a URL pública HTTPS somente no ambiente n8n. Para Meta, a mídia precisa ser acessível externamente; o endereço interno `http://192.168.254.3:5678` não serve para a plataforma baixar imagens.
3. Faça uma postagem de teste em cada rede e confirme o ID remoto/permalink antes de habilitar a próxima.
4. Só depois de todos os testes, ative a publicação por rede e por último altere `SOCIAL_PUBLISH_ENABLED` para `true`.

### O que você deve fornecer, sem segredo

Para eu terminar a ligação real quando você estiver pronto, envie apenas estas informações públicas/operacionais:

- URL da Página do Facebook e URL do perfil profissional do Instagram conectado a ela;
- URL da Página da empresa no LinkedIn;
- @usuário/URL da conta X;
- domínio público HTTPS que será usado para entregar as imagens à Meta e ao LinkedIn;
- endereço do grupo/caixa que deve receber alertas (se preferir, configure-o manualmente no SMTP do n8n).

Não envie senhas, tokens, client secret, bearer token, cookie de sessão ou chave privada por chat. Se algum segredo já foi exposto, revogue-o e crie outro antes de configurar o n8n.

## Ledger e escopo dos exports

`Portal: Ações` cria automaticamente a Data Table interna **Postagem Redes - Ledger** quando o agendador roda pela primeira vez. Ela espelha cada sucesso/falha por rede com conteúdo, dispatch ID, ID remoto, permalink, erro e horário. O `state.json` continua sendo a fonte imediata da biblioteca visual; a Data Table torna o histórico consultável dentro do n8n sem planilha ou banco externo.

O repositório contém exclusivamente os três exports sustentados (`04` a `06`). Fluxos históricos não são parte da instalação proposta nem da vitrine pública. Consulte [workflow-audit.md](workflow-audit.md) para a decisão de consolidação.

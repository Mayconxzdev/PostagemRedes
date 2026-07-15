# Configuração e credenciais

## Portal local de aprovação

Pré-requisitos do portal:

- n8n 2.27 ou superior em Docker;
- volume persistente montado no container como `/files`;
- acesso à rede local do servidor n8n;
- os três workflows do portal importados e publicados/ativos;
- variáveis `NODE_FUNCTION_ALLOW_BUILTIN=fs,path` e `N8N_RESTRICT_FILE_ACCESS_TO=/files` configuradas no container.

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

## Credenciais para publicação externa

O portal de aprovação não exige credenciais sociais. Elas só são necessárias ao conectar o publicador real, depois da homologação:

| Serviço | Uso futuro | Ação necessária |
|---|---|---|
| Meta Graph API | Facebook e Instagram Business | Conectar página, Instagram Business e permissões de publicação. |
| LinkedIn | Publicação por perfil/página | Conectar cada conta que poderá publicar e validar multi-imagem. |
| X | Upload de mídia e thread | Criar OAuth com permissões compatíveis com mídia e posts. |
| SMTP | Alertas operacionais | Criar credencial com remetente autorizado. |
| Google Drive / Sheets | Integração legada opcional | Conectar OAuth somente se o fluxo legado voltar a ser usado. |
| Gemini / OpenAI / Ollama | Geração assistida legada opcional | Criar/validar credenciais e modelo apenas para automação de conteúdo. |

Crie segredos exclusivamente nas credenciais criptografadas do n8n; nunca edite exports de portfólio ou arquivos versionados para inserir tokens.

## Migração dos workflows legados

Os exports `01` a `03` continuam disponíveis para estudo e futura integração. Importe-os desativados, associe o workflow de erro ao orquestrador e valide cada serviço em ambiente de teste. Não ative publicação automática, agendamentos legados ou webhooks de publicação até terminar [docs/testing.md](testing.md).

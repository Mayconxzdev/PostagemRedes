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

| Serviço | Workflow | Acesso que deve ser criado no n8n | Dados não secretos que ainda precisam ser preenchidos |
|---|---|---|---|
| Meta Graph API | `08 — Meta Instagram e Facebook` | OAuth2 exclusivo da aplicação Meta, com permissões de publicação mínimas | ID da Página, ID da conta profissional do Instagram, versão Graph API e base HTTPS pública das mídias. |
| LinkedIn | `09 — LinkedIn Empresa` | **LinkedIn Community Management OAuth2** para a Página da empresa | URN/ID da organização e versão atual da API LinkedIn. |
| X | `10 — X thread` | OAuth2 da aplicação X com leitura/escrita e escopo de mídia | Nenhum segredo no canvas; somente configuração de thread, mídia e IDs retornados. |
| SMTP | `11 — Monitoramento e alerta` | SMTP dedicado para falhas operacionais | Remetente autorizado e caixa/grupo que receberá os avisos. |
| Google Drive / Sheets | Integração legada opcional | Conectar OAuth somente se o fluxo legado voltar a ser usado. |
| Gemini / OpenAI / Ollama | Geração assistida legada opcional | Criar/validar credenciais e modelo apenas para automação de conteúdo. |

Crie segredos exclusivamente nas credenciais criptografadas do n8n; nunca edite exports de portfólio ou arquivos versionados para inserir tokens.

### Ordem segura de configuração

1. Abra `08`, `09`, `10` e `11` no n8n. Eles foram importados como **inativos** e trazem notas amarelas com o papel de cada nó.
2. Conecte uma única plataforma de teste por vez, no campo de autenticação do próprio nó. Não cole segredos nos campos de expressão ou Code.
3. Preencha IDs de Página/organização e URL pública HTTPS somente no ambiente n8n. Para Meta, a mídia precisa ser acessível externamente; o endereço interno `http://192.168.254.3:5678` não serve para a plataforma baixar imagens.
4. Execute o `Teste manual` daquele workflow com conteúdo de teste. Confirme o retorno de ID/permalink e depois configure o alerta de erro.
5. Somente após cada rede passar no teste, complete a persistência de `published`, ID e permalink no ledger e habilite a rota correspondente no `07 — Fila e roteador`.
6. O agendamento de cinco minutos do `07` só deve ser ativado quando todas as redes pretendidas estiverem homologadas e a idempotência estiver validada.

### O que você deve fornecer, sem segredo

Para eu terminar a ligação real quando você estiver pronto, envie apenas estas informações públicas/operacionais:

- URL da Página do Facebook e URL do perfil profissional do Instagram conectado a ela;
- URL da Página da empresa no LinkedIn;
- @usuário/URL da conta X;
- domínio público HTTPS que será usado para entregar as imagens à Meta e ao LinkedIn;
- endereço do grupo/caixa que deve receber alertas (se preferir, configure-o manualmente no SMTP do n8n).

Não envie senhas, tokens, client secret, bearer token, cookie de sessão ou chave privada por chat. Se algum segredo já foi exposto, revogue-o e crie outro antes de configurar o n8n.

## Migração dos workflows legados

Os exports `01` a `03` continuam disponíveis para estudo e futura integração. Os exports `07` a `11` substituem a parte de publicação e monitoramento, mas também devem permanecer desativados até concluir [docs/testing.md](testing.md). Não ative publicação automática, agendamentos legados ou webhooks de publicação do `03`.

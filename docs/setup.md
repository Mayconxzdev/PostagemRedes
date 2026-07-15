# Configuração e credenciais

## Pré-requisitos

- n8n 2.27 ou superior em Docker.
- Volume persistente montado em `/files`.
- Acesso administrativo à instância n8n.
- Contas autorizadas nas plataformas que serão usadas.

## Importação

1. Importe os três arquivos da pasta `workflows/` como inativos.
2. Crie as credenciais abaixo no n8n; não edite os JSONs para inserir segredos.
3. No workflow principal, selecione o workflow de alerta no campo de tratamento de erro.
4. Defina os webhooks com autenticação antes de ativar qualquer fluxo.
5. Escolha e implemente a fila de aprovação antes de conectar o roteador de redes a publicações externas.
6. Execute o roteiro de `docs/testing.md`.

## Credenciais necessárias

| Serviço | Uso | Ação necessária |
|---|---|---|
| Google Drive | Entrada e arquivamento de imagens | Conectar OAuth e selecionar pastas de origem/processados. |
| Google Sheets | Histórico e idempotência | Conectar OAuth e criar ou selecionar a planilha de controle. |
| Google Gemini | Análise visual | Criar credencial da API Gemini no n8n. |
| OpenAI | Redação e fallback | Criar credencial OpenAI no n8n. |
| Ollama | Redundância local | Informar URL da instância e validar o modelo disponível. |
| Meta Graph API | Facebook e Instagram Business | Conectar conta Meta, página e Instagram Business vinculado. |
| LinkedIn | Postagem por perfil/página | Conectar cada conta que poderá publicar. |
| X | Mídia e postagens | Criar OAuth compatível com as permissões de mídia e post. |
| SMTP | Alertas operacionais | Criar credencial com remetente autorizado. |
| API do n8n | Retry controlado | Criar chave de API exclusiva e armazená-la como Header Auth. |

## Armazenamento de binários

O workflow usa a área persistente:

```text
/files/postagem-redes/runtime/
```

Em Docker, ela deve estar associada a um volume ou diretório do host que seja incluído no backup operacional.

## Webhooks

Os caminhos de migração são:

```text
POST /webhook/postagem-redes-analise-imagem
POST /webhook/postagem-redes-publicar-conteudo
GET /webhook/postagem-redes-tente-novamente?id=<execution-id>
```

Configure um header secreto ou HMAC antes de ativá-los. O endpoint de retry também deve exigir Header Auth e usar uma chave de API exclusiva, com o menor escopo possível. Não use endpoints públicos sem autenticação para disparar geração, publicação ou retentativa.

## Agendamentos legados

O export original possui um agendamento ativo às 09h nas segundas, quartas e sextas, além de um segundo agendamento desativado às 13h nas terças, quartas e quintas. Revise esses horários e o fuso da instância antes da ativação.

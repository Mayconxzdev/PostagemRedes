# Segurança

## Proteção de credenciais

- Credenciais ficam no armazenamento criptografado do n8n.
- Não envie credenciais por JSON, Git, planilha, e-mail ou webhook.
- Use uma credencial exclusiva de API para o assistente de retry.
- Revogue e recrie tokens quando houver troca de responsável ou suspeita de vazamento.

## Proteção dos webhooks

Os webhooks de análise e publicação devem exigir autenticação. As opções recomendadas são:

1. Header secreto para integração interna.
2. HMAC quando outro sistema assina o payload.
3. Basic Auth apenas para uma operação manual restrita.

Registre origem, data, identificador de conteúdo e resposta do webhook. Rejeite chamadas sem autenticação antes de baixar arquivos ou chamar IA.

## Publicação segura

- Use modo de aprovação durante homologação.
- Mantenha uma chave de idempotência por conteúdo e rede.
- Não publique novamente quando já existir permalink para a mesma chave.
- Limite retries para impedir duplicação por timeout de API.
- Armazene mensagens de erro sem incluir token, cabeçalho de autorização ou dados pessoais.

## GitHub

Este repositório contém apenas exports sanitizados. O pipeline de CI verifica JSON e impede blocos de credenciais antes do merge.

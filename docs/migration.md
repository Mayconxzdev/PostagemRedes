# Notas de migração para n8n 2.27

## Ajustes aplicados na importação

- Todos os workflows foram importados como inativos.
- Os nomes foram normalizados com o prefixo `Postagem Redes`.
- Os webhooks foram renomeados para evitar colisão com outros projetos.
- O caminho temporário de arquivo foi movido para `/files/postagem-redes/runtime/`.
- O workflow de erro recebeu novo ID e foi vinculado novamente ao orquestrador.
- O acesso via MCP foi desabilitado para o workflow de publicação.

## Itens que exigem configuração manual

- Credenciais OAuth e chaves de API.
- Pastas do Google Drive e planilha de histórico.
- Proteção dos webhooks.
- Página do Facebook, conta Instagram Business e permissões da Meta.
- Contas LinkedIn e X que poderão publicar.
- Estratégia de aprovação e horários definitivos.

## Melhorias recomendadas antes da ativação

1. Introduzir tabela ou Data Table de fila com estados `draft`, `approved`, `rejected`, `publishing`, `published` e `failed`; a publicação deve receber somente itens aprovados.
2. Salvar uma chave de idempotência, ID remoto e permalink por rede.
3. Limitar tentativas por rede e separar falha temporária de falha definitiva.
4. Adicionar um painel de aprovação ou webhook autenticado para liberar publicações.
5. Validar a versão da Meta Graph API e as permissões do aplicativo no momento da homologação, pois as versões da API possuem ciclo de vida próprio.

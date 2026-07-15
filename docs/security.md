# Segurança

## Escopo atual: rede local sem login

Por decisão operacional, o portal foi criado para abrir diretamente por atalho nos computadores autorizados, sem tela de login. Isso reduz atrito de uso, mas tem uma consequência objetiva: **qualquer equipamento que alcance a URL do portal pode criar conteúdo e alterar a fila**.

Controles existentes:

- o formulário exige o nome do operador e registra operador, horário, comentário, redes e decisão;
- os endpoints de arquivo validam conteúdo e nome de arquivo antes de ler o volume;
- uploads aceitam somente PNG, JPG/JPEG e WEBP, entre 1 e 10 arquivos;
- os workflows têm acesso restrito ao volume `/files`;
- o portal não tem credenciais sociais e não publica externamente na fase de homologação.

Controles obrigatórios antes de qualquer exposição fora da LAN:

1. HTTPS com certificado válido;
2. autenticação por usuário ou proxy com SSO;
3. restrição de firewall/VLAN para os computadores autorizados;
4. proteção CSRF e rate limit na rota de ação;
5. armazenamento de fila/auditoria em banco com backup e retenção definidos.

## Proteção de credenciais

- Credenciais ficam exclusivamente no armazenamento criptografado do n8n.
- Não envie credenciais por JSON, Git, planilha, e-mail, webhook ou comentário do portal.
- Use credenciais distintas por ambiente e por serviço quando possível.
- Revogue e recrie tokens em troca de responsável, suspeita de vazamento ou mudança de permissões.
- Configure credenciais/API keys exclusivas e de menor privilégio para cada integração habilitada.

## Publicação segura

- Mantenha o publicador desconectado enquanto as contas estiverem em homologação.
- Consuma apenas itens `aprovado` ou `agendado`.
- Use chave de idempotência por conteúdo e rede; registre ID remoto e permalink.
- Limite tentativas para evitar duplicidade em timeout de API.
- Armazene erros sem token, cabeçalho de autorização ou dados pessoais.
- Trate X como thread adaptada e registre a cadeia de IDs de todos os posts.

## GitHub

O repositório contém somente workflows sanitizados. O pipeline verifica JSON, impede workflows ativos, blocos de credenciais e endereços de e-mail reais antes da integração.

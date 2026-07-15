# Exports de portfólio

Esta pasta contém somente os três workflows mantidos pelo projeto:

- `04-portal-visual.sanitized.json`
- `05-portal-acoes.sanitized.json`
- `06-portal-arquivos.sanitized.json`

São exports **sanitizados e inativos**. Eles preservam nós, conexões, organização visual e configurações necessárias para revisão técnica, mas removem credenciais, identificadores de contas, e-mails reais, dados de execução e IDs internos.

Não use estes arquivos como backup de produção. O backup operacional deve permanecer protegido e fora do Git. Para uma instalação nova, importe os três exports, configure as credenciais diretamente no cofre do n8n e siga o plano de homologação em `../docs/setup.md`.

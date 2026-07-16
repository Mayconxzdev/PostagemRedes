# Evidências técnicas

Capturas feitas no editor da instância local n8n em 15/07/2026. Elas comprovam a organização dos workflows em execução; os exports do repositório permanecem sanitizados e não carregam credenciais, IDs de conta ou dados de clientes.

## `05 · Portal: Ações`

<p align="center">
  <a href="assets/n8n-real/05-portal-acoes-canvas-completo.png">
    <img src="assets/n8n-real/05-portal-acoes-canvas-completo.png" alt="Canvas completo do workflow Portal Ações no n8n" width="100%" />
  </a>
</p>

O orquestrador principal possui 53 nós. Da esquerda para a direita, o canvas separa entrada do portal e IA, reserva da fila, adaptadores de cada rede e registro de resultado. A imagem inteira preserva o contexto do fluxo; clique nela para ampliar.

## `06 · Portal: Arquivos`

<p align="center">
  <a href="assets/n8n-real/06-portal-arquivos-canvas-completo.png">
    <img src="assets/n8n-real/06-portal-arquivos-canvas-completo.png" alt="Canvas completo do workflow Portal Arquivos no n8n" width="100%" />
  </a>
</p>

Workflow isolado para servir mídia autorizada ao portal: recebe a solicitação, valida o arquivo solicitado e responde o binário. A separação impede que a tela de aprovação tenha acesso direto e irrestrito ao volume de mídia.

## `04 · Portal Visual`

O terceiro workflow mantido é o `Portal Visual`: um webhook `GET` que lê a biblioteca e entrega a interface de revisão. A demonstração do resultado dessa camada está na seção [Interface de operação](../README.md#interface-de-operação).

## Reprodução

```powershell
node scripts/build-portal-workflows.mjs
node scripts/validate-portal-code.mjs
pwsh -NoProfile -File scripts/validate-workflows.ps1
```

Esses comandos regeneram e validam os três exports sanitizados; não conectam contas e não executam publicações externas.

# Plano de testes

## Ordem de homologação

1. **Importação:** confirmar que os três workflows entram desativados e visíveis no mesmo projeto do n8n.
2. **Tratamento de erro:** forçar uma falha controlada e validar que o alerta é recebido.
3. **Drive e Sheets:** usar uma pasta de teste e planilha de teste, sem conteúdo de produção.
4. **IA:** validar Gemini, OpenAI e Ollama com a mesma imagem de teste; registrar qual fallback foi usado.
5. **Aprovação:** gerar uma postagem, revisar texto, hashtags, imagem e rede de destino sem publicar.
6. **Redes:** publicar em uma conta de teste ou postagem não listada, uma rede por vez.
7. **Idempotência:** repetir a mesma solicitação e confirmar que não há duplicação.
8. **Retry:** simular uma falha transitória e acionar o assistente autenticado.
9. **Observabilidade:** conferir planilha, Drive, execução n8n, e-mail e permalink final.

## Critérios para ativação

Só ative o agendamento quando todas as condições abaixo forem verdadeiras:

- Todas as credenciais apresentam teste de conexão bem-sucedido.
- Webhooks exigem autenticação.
- Uma publicação aprovada foi validada em cada rede desejada.
- O histórico registra ID e permalink corretamente.
- Retry não gera postagem duplicada.
- O workflow de erro envia alerta com contexto suficiente para diagnóstico.

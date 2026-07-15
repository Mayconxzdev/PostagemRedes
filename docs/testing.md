# Plano de testes

## Validação já coberta no portal

- Biblioteca com carrosséis detectados a partir de pastas locais.
- Carregamento de slides por endpoint restrito e `Content-Type` correto.
- Prévia visual de todos os slides, edição de legenda e seleção de redes.
- Registro de decisão em JSON sem acionar API social.
- Envio de postagem rápida por multipart com imagens de teste, verificando bytes reais no disco e ordem definida no navegador; conteúdo temporário removido após a verificação.
- Reorganização de slides já enviados com persistência no sistema de arquivos e auditoria da ação.
- Limpeza do estado de validação para iniciar a operação sem histórico técnico fictício.

## Validação estrutural do orquestrador atualizado

- O export `05 · Portal: Ações` contém 49 nós e permanece sem credenciais, e-mails reais ou tokens.
- Os nós atuais OpenAI, Gemini, Ollama, Schedule Trigger, Loop, Data Table, Read/Write File e X v2 foram conferidos contra a instância local n8n 2.27.3.
- As conexões do orquestrador foram verificadas localmente para garantir origem/destino existentes e nomes únicos.
- A Data Table de Ledger é criada com `createIfNotExists`, sem depender de planilha ou banco externo.
- Não houve execução de API social, publicação, criação de credencial ou alteração dos workflows do Mala Direta nesta validação.

## Roteiro de homologação operacional

1. **Acesso LAN:** abrir o atalho em dois computadores autorizados e confirmar que a biblioteca carrega.
2. **Biblioteca:** adicionar uma pasta de teste com imagens e `Texto.txt`, atualizar o painel e revisar a ordem do carrossel.
3. **Postagem rápida:** enviar 1, 2 e 10 imagens; usar a prévia para mover/remover slides e conferir que a ordem final é preservada. Tentar formato não permitido e mais de 10 arquivos para confirmar rejeição.
4. **Decisões:** salvar pendente, aprovado, agendado e rejeitado; conferir operador, comentário, redes e data no histórico.
5. **Concorrência:** dois operadores alteram conteúdos distintos e, depois, o mesmo conteúdo; confirmar que o segundo recebe orientação para atualizar em caso de lock.
6. **Recuperação:** reiniciar o container n8n e confirmar que a fila e imagens persistem no volume.
7. **Backups:** validar restauração do diretório de conteúdo e do estado em uma cópia de teste.

## Roteiro de publicação externa — somente após credenciais

1. Criar contas/canais de teste e validar OAuth de cada plataforma.
2. Publicar um carrossel aprovado no Instagram/Facebook e gravar o permalink.
3. Publicar multi-imagem no LinkedIn conforme a API vigente e gravar URNs/permalink.
4. Converter o mesmo conteúdo em uma sequência curta no X, verificando o encadeamento de respostas e mídia.
5. Repetir a solicitação e confirmar idempotência por rede.
6. Simular timeout/falha temporária e validar retry sem duplicar publicação.
7. Só então habilitar conteúdo de produção e agendamento real.

## Critérios de ativação do publicador

Não conecte a fila às redes até que todos os itens abaixo sejam verdadeiros:

- Cada conta apresenta teste de conexão e permissões comprovadas.
- Uma publicação de teste aprovada foi validada em cada rede desejada.
- O histórico registra estado, ID e permalink por rede.
- O retry não gera postagem duplicada.
- Alertas registram falha com contexto suficiente e sem segredos.
- Backup/restauração da fila foi exercitado.

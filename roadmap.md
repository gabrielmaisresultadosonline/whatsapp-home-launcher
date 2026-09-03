# Roadmap

- [x] Corrigir normalização, validação duplicada e persistência do token OpenAI.
- [x] Adicionar logs seguros para diagnóstico do Agente IA.
- [x] Atualizar os scripts da VPS para o novo repositório GitHub.
- [x] Preservar banco, volumes e secrets com backup antes da atualização.
- [x] Validar a sintaxe dos scripts de implantação.
- [x] Corrigir o callback Google sem depender de ON CONFLICT e validar a migration 094 no deploy.
- [x] Adicionar diagnóstico específico e seguro para o OAuth Google na VPS.
- [x] Corrigir importação Google sem ON CONFLICT legado, com paginação e erros explícitos.
- [x] Chat: envio de documentos (MIME por extensão no front e na Edge; Meta rejeitava octet-stream).
- [x] Chat: microfone confiável (stream único + AudioContext próprio, fallback MediaRecorder, cleanup total).
- [x] Chat: seletor de emojis funcional (Popover com categorias/recentes, insere no cursor).
- [x] Google Contatos: ligar a importação ao botão da conta, não mascarar erros como 0/0 e registrar exportações no diagnóstico.
- [x] Google Contatos: corrigir o botão genérico para importar e separar pendentes globais/por cadastro no diagnóstico.

- [ ] Agente IA: organizador Kanban automático, opção de resposta agrupada e correções completas da sincronização Google.

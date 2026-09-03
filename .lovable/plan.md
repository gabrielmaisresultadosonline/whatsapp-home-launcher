# Agente IA: Kanban, formato de envio e sincronização Google

## Objetivo
Adicionar duas opções independentes ao Agente IA sem alterar os padrões atuais e corrigir as falhas que impedem a importação de contatos Google.

## Implementação
1. **Configurações do Agente IA**
   - Adicionar abaixo de “Ativar geral” os controles “Organizador Kanban CRM automático” e “Enviar tudo o mais junto possível”.
   - Manter ambos desativados por padrão, preservando o comportamento atual.
   - Persistir as opções em `crm_settings` e incluí-las na leitura/salvamento seguro da tela.

2. **Organizador automático do Kanban**
   - Quando ativado, permitir que o agente classifique a conversa em uma das categorias: frio, quente, cliente ou quer falar com humano.
   - Resolver cada categoria para um status Kanban do próprio usuário e mover somente o contato daquela conversa.
   - Não mover contatos quando a opção estiver desativada ou quando não houver classificação confiável/status correspondente.

3. **Formato das respostas**
   - Com a nova opção desativada, manter o envio fragmentado existente.
   - Quando ativada, consolidar a resposta do agente e enviar em uma única mensagem sempre que o limite do WhatsApp permitir; usar divisão segura apenas quando tecnicamente necessário.

4. **Sincronização Google**
   - Criar migration corretiva idempotente para remover a referência inválida a `crm_whatsapp_numbers.is_primary` da função/trigger de preenchimento do número.
   - Impedir consultas UUID com `userId` nulo no diagnóstico/exportação e retornar erro explícito quando a ação autenticada não tiver usuário válido.
   - Incluir a nova migration na validação do deploy e no diagnóstico seguro.

5. **Validação**
   - Verificar TypeScript, sintaxe Bash, SQL/migrations e ausência dos conflitos Google legados.
   - Testar na interface a presença e persistência visual dos dois controles, sem alterar os demais recursos.

## Detalhes técnicos
- Banco PostgreSQL próprio da stack atual; migration nova após a 094, com execução idempotente pelo `atualizar.sh`.
- Defaults compatíveis: organizador `false`, envio agrupado `false`.
- Sem expor tokens, chaves ou conteúdo sensível nos logs.

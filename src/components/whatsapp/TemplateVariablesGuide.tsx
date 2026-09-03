import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Braces, CheckCircle2, Image as ImageIcon, Link2, MousePointer2, ShieldCheck, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACT_FIELD_TOKENS } from '@/lib/templateVariables';

export interface TemplateVariablesGuideProps {
  className?: string;
  /** Compacto: só o accordion, sem título externo. */
  compact?: boolean;
}

interface GuideStep {
  title: string;
  description: React.ReactNode;
}

const APPROVAL_STEPS: GuideStep[] = [
  {
    title: 'Escolha a categoria certa',
    description: (
      <>
        <strong>Utility</strong> é para avisos de serviço ligados a algo que o cliente já pediu (pedido, atendimento, agendamento, pagamento).
        Promoção, desconto, novidade ou "aproveite" é <strong>Marketing</strong>. Usar Utility em texto promocional gera reprovação e pode
        rebaixar a qualidade do número.
      </>
    ),
  },
  {
    title: 'Escreva um texto operacional e curto',
    description: (
      <>
        Fale do que aconteceu e do que o cliente precisa fazer. Exemplo aprovado:
        <code className="block mt-1.5 rounded-lg bg-muted px-2 py-1.5 text-[11px] whitespace-pre-wrap">
          {'Olá {{1}}, sua solicitação {{2}} foi atualizada. Acesse {{3}} para consultar os detalhes.'}
        </code>
        Sem emojis em excesso, sem CAIXA ALTA, sem "compre agora".
      </>
    ),
  },
  {
    title: 'Use variáveis em sequência',
    description: (
      <>
        Escreva <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>, <code>{'{{3}}'}</code> nessa ordem, sem pular números, sem começar nem terminar
        a mensagem com variável e sem duas variáveis coladas. Preencha o <strong>exemplo</strong> de cada uma com um valor real
        (João, 45821, um link) — a Meta usa os exemplos para entender o contexto.
      </>
    ),
  },
  {
    title: 'Cabeçalho com imagem',
    description: (
      <>
        Escolha <strong>Imagem</strong> e envie uma imagem de exemplo (JPG/PNG até 5 MB). Ela serve só para a aprovação: no envio você
        pode trocar por outra imagem, desde que continue coerente com o uso aprovado.
      </>
    ),
  },
  {
    title: 'Botões',
    description: (
      <>
        <strong>Link</strong>: use <code>{'https://seusite.com/pedido/{{1}}'}</code> para links dinâmicos (só a parte final pode variar).
        <strong className="ml-1">Resposta rápida</strong>: "PRECISO DE AJUDA", "SIM", "NÃO". Links diretos do WhatsApp (wa.me) são bloqueados.
      </>
    ),
  },
  {
    title: 'Envie e acompanhe o status',
    description: (
      <>
        Clique em <em>Enviar para Aprovação</em>. A análise costuma levar de minutos a 24h. O template aparece na lista como
        <Badge variant="outline" className="mx-1 text-[9px]">PENDING</Badge> e passa para <Badge variant="outline" className="mx-1 text-[9px]">APPROVED</Badge>.
        Só templates aprovados podem ser disparados.
      </>
    ),
  },
];

const SENDING_STEPS: GuideStep[] = [
  {
    title: 'Selecione o template aprovado',
    description: 'No Disparador, no Agendamento ou na conversa, escolha o template. Se ele tiver variáveis, imagem ou link dinâmico, aparece o ícone de chaves { } para editar.',
  },
  {
    title: 'Preencha cada variável',
    description: (
      <>
        Cada <code>{'{{n}}'}</code> aceita texto fixo ou um campo do contato. O CRM converte automaticamente para os parâmetros posicionais da Meta.
        <div className="mt-1.5 flex flex-wrap gap-1">
          {CONTACT_FIELD_TOKENS.slice(0, 8).map(field => (
            <code key={field.token} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{field.token}</code>
          ))}
        </div>
      </>
    ),
  },
  {
    title: 'Troque a imagem do cabeçalho (se houver)',
    description: 'Cole uma URL pública ou envie um arquivo. Cada campanha pode usar uma mídia diferente com o mesmo template aprovado.',
  },
  {
    title: 'Confira a prévia e valide',
    description: 'A prévia mostra a mensagem final para um contato de amostra. O envio é bloqueado se faltar variável, imagem ou parâmetro de link, ou se o template não estiver aprovado.',
  },
  {
    title: 'Salve a configuração',
    description: 'Dê um nome e salve. Marcando como padrão, o CRM reaplica esses valores automaticamente nos próximos envios do mesmo template — sem criar um novo template na Meta.',
  },
];

const StepList: React.FC<{ steps: GuideStep[] }> = ({ steps }) => (
  <ol className="space-y-3">
    {steps.map((step, index) => (
      <li key={step.title} className="flex gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">{index + 1}</span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold">{step.title}</p>
          <div className="text-[11px] leading-relaxed text-muted-foreground">{step.description}</div>
        </div>
      </li>
    ))}
  </ol>
);

/**
 * Tutorial resumido: como aprovar templates Utility com variáveis e como
 * preencher as variáveis no envio sem alterar o template aprovado.
 */
export const TemplateVariablesGuide: React.FC<TemplateVariablesGuideProps> = ({ className, compact = false }) => (
  <div className={cn('rounded-2xl border bg-card', className)}>
    {!compact && (
      <div className="p-4 pb-2 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-bold">Passo a passo: templates Utility com variáveis</p>
          <p className="text-[11px] text-muted-foreground">Aprovação na Meta e preenchimento dos valores no envio.</p>
        </div>
      </div>
    )}
    <Accordion type="single" collapsible className="px-4 pb-2">
      <AccordionItem value="approval" className="border-b">
        <AccordionTrigger className="text-xs font-semibold hover:no-underline py-3">
          <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 1. Como aprovar um template Utility com variáveis</span>
        </AccordionTrigger>
        <AccordionContent><StepList steps={APPROVAL_STEPS} /></AccordionContent>
      </AccordionItem>
      <AccordionItem value="sending" className="border-b">
        <AccordionTrigger className="text-xs font-semibold hover:no-underline py-3">
          <span className="flex items-center gap-2"><Braces className="w-3.5 h-3.5 text-primary" /> 2. Como mudar as variáveis na hora do envio</span>
        </AccordionTrigger>
        <AccordionContent><StepList steps={SENDING_STEPS} /></AccordionContent>
      </AccordionItem>
      <AccordionItem value="example" className="border-none">
        <AccordionTrigger className="text-xs font-semibold hover:no-underline py-3">
          <span className="flex items-center gap-2"><Send className="w-3.5 h-3.5 text-sky-600" /> 3. Exemplo completo (imagem + variáveis + botões)</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-3 sm:grid-cols-2 text-[11px]">
            <div className="rounded-xl border p-3 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Template aprovado (Meta)</p>
              <p><strong>Nome:</strong> atualizacao_atendimento · <strong>Categoria:</strong> UTILITY</p>
              <p><strong>Cabeçalho:</strong> IMAGE</p>
              <p><strong>Corpo:</strong> {'Olá {{1}}, sua solicitação {{2}} foi atualizada. Acesse {{3}} para consultar os detalhes.'}</p>
              <p className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Botão URL "CONSULTAR" → {'https://seusite.com/pedido/{{1}}'}</p>
              <p className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Resposta rápida "PRECISO DE AJUDA"</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Dados do envio (CRM)</p>
              <p><strong>Imagem:</strong> a foto desta campanha</p>
              <p><strong>{'{{1}}'}:</strong> {'{{nome}}'} → Gabriel</p>
              <p><strong>{'{{2}}'}:</strong> {'{{protocolo}}'} → 45821</p>
              <p><strong>{'{{3}}'}:</strong> o painel do cliente</p>
              <p><strong>Link {'{{1}}'}:</strong> {'{{pedido}}'} → 58972</p>
              <p className="pt-1 text-muted-foreground">Contato B recebe o mesmo template com os próprios valores. Nada muda na Meta.</p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

export default TemplateVariablesGuide;

/**
 * Camada compartilhada de variáveis de templates oficiais da Meta.
 *
 * Responsabilidades:
 *  - Ler os componentes aprovados (HEADER/BODY/FOOTER/BUTTONS) e extrair o que
 *    é dinâmico (mídia do header, {{n}} do body, parâmetro de URL dos botões).
 *  - Guardar a configuração de envio separada da configuração do template.
 *  - Resolver campos internos do CRM ({{nome}}, {{telefone}}, ...) por contato.
 *  - Montar o array `components` exigido pela Cloud API.
 *  - Validar antes do envio e gerar a prévia textual.
 *
 * O texto estrutural aprovado nunca é alterado: apenas os parâmetros
 * posicionais suportados pela Meta são preenchidos.
 */

export type TemplateHeaderKind = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';

export interface TemplateButtonSchema {
  /** Índice do botão na lista aprovada (0..n). */
  index: number;
  type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER' | 'COPY_CODE' | string;
  text: string;
  url?: string;
  /** URL com {{1}} — exige parâmetro dinâmico no envio. */
  hasUrlVariable: boolean;
}

export interface TemplateSchema {
  headerKind: TemplateHeaderKind;
  headerText?: string;
  /** Mídia de exemplo usada na aprovação (fallback visual). */
  headerExampleUrl?: string;
  headerVariables: number[];
  bodyText: string;
  bodyVariables: number[];
  bodyExamples: string[];
  footerText?: string;
  buttons: TemplateButtonSchema[];
  isCarousel: boolean;
}

export interface TemplateSendConfig {
  /** URL pública da mídia usada neste envio (imagem/vídeo/documento). */
  headerMediaUrl?: string;
  /** Nome do arquivo exibido quando o header é DOCUMENT. */
  headerDocumentFilename?: string;
  headerValues: Record<string, string>;
  bodyValues: Record<string, string>;
  /** Chave = índice do botão. */
  buttonValues: Record<string, string>;
}

export interface TemplateContactLike {
  id?: string;
  name?: string | null;
  wa_id?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  custom_labels?: string[] | null;
}

export interface TemplateValidationIssue {
  field: string;
  message: string;
}

/** Campos internos do CRM aceitos dentro dos valores das variáveis. */
export const CONTACT_FIELD_TOKENS: Array<{ token: string; label: string; description: string }> = [
  { token: '{{nome}}', label: 'Nome do contato', description: 'Nome salvo no CRM (ou o número, se não houver nome).' },
  { token: '{{primeiro_nome}}', label: 'Primeiro nome', description: 'Somente a primeira palavra do nome.' },
  { token: '{{telefone}}', label: 'Telefone', description: 'Número do WhatsApp do contato.' },
  { token: '{{email}}', label: 'E-mail', description: 'Campo "email" das informações do contato.' },
  { token: '{{codigo}}', label: 'Código', description: 'Campo "codigo" das informações do contato.' },
  { token: '{{pedido}}', label: 'Pedido', description: 'Campo "pedido" das informações do contato.' },
  { token: '{{protocolo}}', label: 'Protocolo', description: 'Campo "protocolo" das informações do contato.' },
  { token: '{{empresa}}', label: 'Empresa', description: 'Campo "empresa" das informações do contato.' },
  { token: '{{etiqueta}}', label: 'Etiqueta (status)', description: 'Status atual do contato no Kanban.' },
  { token: '{{data}}', label: 'Data de hoje', description: 'Data atual no formato dd/mm/aaaa.' },
  { token: '{{hora}}', label: 'Hora atual', description: 'Hora atual no formato hh:mm.' },
];

const VARIABLE_PATTERN = /\{\{(\d+)\}\}/g;

const uniqueSortedVariables = (text: string | undefined | null): number[] =>
  Array.from(new Set(Array.from(String(text || '').matchAll(VARIABLE_PATTERN), m => Number(m[1])))).sort((a, b) => a - b);

const firstBodyExamples = (body: any): string[] => {
  const raw = body?.example?.body_text;
  if (!Array.isArray(raw)) return [];
  const first = raw[0];
  if (Array.isArray(first)) return first.map(v => String(v ?? ''));
  if (typeof first === 'string') return raw.map(v => String(v ?? ''));
  return [];
};

/** Lê os componentes salvos do template e devolve um esquema estruturado. */
export function parseTemplateSchema(components: unknown): TemplateSchema {
  const list: any[] = Array.isArray(components) ? components : [];
  const header = list.find(c => c?.type === 'HEADER');
  const body = list.find(c => c?.type === 'BODY');
  const footer = list.find(c => c?.type === 'FOOTER');
  const buttonsComponent = list.find(c => c?.type === 'BUTTONS');
  const isCarousel = list.some(c => c?.type === 'CAROUSEL');

  const headerKind: TemplateHeaderKind = header?.format ? String(header.format).toUpperCase() as TemplateHeaderKind : 'NONE';
  const buttons: TemplateButtonSchema[] = Array.isArray(buttonsComponent?.buttons)
    ? buttonsComponent.buttons.map((btn: any, index: number) => ({
        index,
        type: String(btn?.type || 'QUICK_REPLY').toUpperCase(),
        text: String(btn?.text || ''),
        url: btn?.url ? String(btn.url) : undefined,
        hasUrlVariable: String(btn?.type || '').toUpperCase() === 'URL' && /\{\{1\}\}/.test(String(btn?.url || '')),
      }))
    : [];

  return {
    headerKind,
    headerText: header?.text ? String(header.text) : undefined,
    headerExampleUrl: header?.example?.header_handle?.[0] ? String(header.example.header_handle[0]) : undefined,
    headerVariables: headerKind === 'TEXT' ? uniqueSortedVariables(header?.text) : [],
    bodyText: String(body?.text || ''),
    bodyVariables: uniqueSortedVariables(body?.text),
    bodyExamples: firstBodyExamples(body),
    footerText: footer?.text ? String(footer.text) : undefined,
    buttons,
    isCarousel,
  };
}

export const isMediaHeader = (kind: TemplateHeaderKind) => kind === 'IMAGE' || kind === 'VIDEO' || kind === 'DOCUMENT';

/** Indica se o template precisa de algum dado dinâmico no momento do envio. */
export function templateHasDynamicInputs(schema: TemplateSchema): boolean {
  if (schema.isCarousel) return false;
  return (
    isMediaHeader(schema.headerKind) ||
    schema.headerVariables.length > 0 ||
    schema.bodyVariables.length > 0 ||
    schema.buttons.some(b => b.hasUrlVariable)
  );
}

/** Conta quantos campos dinâmicos o template exige (para badges/resumo). */
export function countDynamicInputs(schema: TemplateSchema): number {
  return (
    (isMediaHeader(schema.headerKind) ? 1 : 0) +
    schema.headerVariables.length +
    schema.bodyVariables.length +
    schema.buttons.filter(b => b.hasUrlVariable).length
  );
}

/** Configuração inicial sensata: {{1}} do corpo = nome do contato, mídia = exemplo aprovado. */
export function createDefaultSendConfig(schema: TemplateSchema): TemplateSendConfig {
  const bodyValues: Record<string, string> = {};
  schema.bodyVariables.forEach((variable, position) => {
    if (position === 0) {
      bodyValues[String(variable)] = '{{nome}}';
    } else {
      bodyValues[String(variable)] = schema.bodyExamples[position] && schema.bodyExamples[position] !== 'Exemplo'
        ? schema.bodyExamples[position]
        : '';
    }
  });
  const headerValues: Record<string, string> = {};
  schema.headerVariables.forEach(variable => { headerValues[String(variable)] = ''; });
  const buttonValues: Record<string, string> = {};
  schema.buttons.filter(b => b.hasUrlVariable).forEach(b => { buttonValues[String(b.index)] = ''; });

  const exampleUrl = schema.headerExampleUrl;
  const usableExample = exampleUrl && /^https?:\/\//i.test(exampleUrl) && !exampleUrl.includes('whatsapp.net') ? exampleUrl : undefined;

  return {
    headerMediaUrl: isMediaHeader(schema.headerKind) ? usableExample : undefined,
    headerDocumentFilename: undefined,
    headerValues,
    bodyValues,
    buttonValues,
  };
}

/** Garante a forma esperada mesmo quando o valor vem do banco/JSON parcial. */
export function normalizeSendConfig(raw: unknown, schema: TemplateSchema): TemplateSendConfig {
  const base = createDefaultSendConfig(schema);
  if (!raw || typeof raw !== 'object') return base;
  const value = raw as Partial<TemplateSendConfig>;
  const toRecord = (input: unknown): Record<string, string> => {
    if (!input || typeof input !== 'object') return {};
    return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, v == null ? '' : String(v)]));
  };
  return {
    headerMediaUrl: typeof value.headerMediaUrl === 'string' && value.headerMediaUrl.trim() ? value.headerMediaUrl.trim() : base.headerMediaUrl,
    headerDocumentFilename: typeof value.headerDocumentFilename === 'string' ? value.headerDocumentFilename : undefined,
    headerValues: { ...base.headerValues, ...toRecord(value.headerValues) },
    bodyValues: { ...base.bodyValues, ...toRecord(value.bodyValues) },
    buttonValues: { ...base.buttonValues, ...toRecord(value.buttonValues) },
  };
}

const readMetadataField = (contact: TemplateContactLike | null | undefined, keys: string[]): string => {
  const metadata = (contact?.metadata || {}) as Record<string, unknown>;
  for (const key of keys) {
    const candidate = metadata[key];
    if (candidate != null && String(candidate).trim()) return String(candidate).trim();
  }
  return '';
};

const formatDate = (date: Date) => date.toLocaleDateString('pt-BR');
const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Substitui os campos internos ({{nome}}, {{telefone}}, ...) pelo valor real
 * do contato. Tokens desconhecidos são mantidos para o usuário perceber o erro.
 */
export function resolveContactTokens(raw: string, contact: TemplateContactLike | null | undefined): string {
  const now = new Date();
  const name = String(contact?.name || '').trim();
  const phone = String(contact?.wa_id || '').trim();
  const displayName = name && name !== phone ? name : phone;

  const map: Record<string, string> = {
    nome: displayName,
    primeiro_nome: displayName.split(/\s+/)[0] || displayName,
    telefone: phone,
    email: readMetadataField(contact, ['email', 'e-mail', 'Email']),
    codigo: readMetadataField(contact, ['codigo', 'código', 'code']),
    pedido: readMetadataField(contact, ['pedido', 'order', 'order_id']),
    protocolo: readMetadataField(contact, ['protocolo', 'protocol', 'ticket']),
    empresa: readMetadataField(contact, ['empresa', 'company']),
    etiqueta: String(contact?.status || ''),
    data: formatDate(now),
    hora: formatTime(now),
  };

  return String(raw ?? '').replace(/\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g, (full, key: string) => {
    const normalized = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(map, normalized) ? map[normalized] : full;
  });
}

/** Meta rejeita quebras de linha, tabs e mais de 4 espaços seguidos em parâmetros. */
export function sanitizeParameterText(value: string): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {5,}/g, '    ')
    .trim();
}

const fillPositional = (text: string, values: Record<string, string>, contact: TemplateContactLike | null | undefined): string =>
  String(text || '').replace(VARIABLE_PATTERN, (_full, index: string) =>
    sanitizeParameterText(resolveContactTokens(values[index] ?? '', contact)) || `{{${index}}}`);

export interface TemplatePreviewData {
  headerKind: TemplateHeaderKind;
  headerText?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  buttons: Array<{ type: string; text: string; url?: string }>;
}

/** Texto final como o cliente verá, já com os valores resolvidos para um contato. */
export function renderTemplatePreview(
  schema: TemplateSchema,
  config: TemplateSendConfig,
  contact: TemplateContactLike | null | undefined,
): TemplatePreviewData {
  return {
    headerKind: schema.headerKind,
    headerText: schema.headerKind === 'TEXT' ? fillPositional(schema.headerText || '', config.headerValues, contact) : undefined,
    headerMediaUrl: isMediaHeader(schema.headerKind) ? (config.headerMediaUrl || schema.headerExampleUrl) : undefined,
    bodyText: fillPositional(schema.bodyText, config.bodyValues, contact),
    footerText: schema.footerText,
    buttons: schema.buttons.map(button => ({
      type: button.type,
      text: button.text,
      url: button.hasUrlVariable && button.url
        ? button.url.replace(/\{\{1\}\}/g, sanitizeParameterText(resolveContactTokens(config.buttonValues[String(button.index)] ?? '', contact)) || '{{1}}')
        : button.url,
    })),
  };
}

/**
 * Valida a configuração contra o esquema aprovado. `contact` é opcional: quando
 * informado, os tokens são resolvidos e valores vazios após a resolução também
 * são reportados (ex.: {{email}} de um contato sem e-mail).
 */
export function validateTemplateSendConfig(
  schema: TemplateSchema,
  config: TemplateSendConfig,
  contact?: TemplateContactLike | null,
  templateStatus?: string | null,
): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];

  if (templateStatus && String(templateStatus).toUpperCase() !== 'APPROVED') {
    issues.push({ field: 'status', message: `O template está com status ${String(templateStatus).toUpperCase()} na Meta. Só templates APROVADOS podem ser enviados.` });
  }

  if (isMediaHeader(schema.headerKind)) {
    const url = String(config.headerMediaUrl || '').trim();
    if (!url) {
      issues.push({ field: 'header', message: `O template exige ${schema.headerKind === 'IMAGE' ? 'uma imagem' : schema.headerKind === 'VIDEO' ? 'um vídeo' : 'um documento'} no cabeçalho.` });
    } else if (!/^https?:\/\//i.test(url)) {
      issues.push({ field: 'header', message: 'A mídia do cabeçalho precisa ser uma URL pública iniciada por http(s).' });
    } else if (url.includes('whatsapp.net')) {
      issues.push({ field: 'header', message: 'O link de exemplo da Meta (whatsapp.net) não pode ser reutilizado. Envie uma nova mídia.' });
    }
  }

  const check = (field: string, label: string, raw: string | undefined) => {
    const value = String(raw ?? '');
    if (!value.trim()) {
      issues.push({ field, message: `${label} está vazia.` });
      return;
    }
    if (contact) {
      const resolved = sanitizeParameterText(resolveContactTokens(value, contact));
      if (!resolved) {
        issues.push({ field, message: `${label} ficou vazia para ${contact.name || contact.wa_id || 'este contato'} (${value}).` });
      } else if (/\{\{\s*[a-zA-Z_]/.test(resolved)) {
        issues.push({ field, message: `${label} usa um campo desconhecido: ${value}.` });
      }
    }
  };

  schema.headerVariables.forEach(v => check(`header.${v}`, `Variável {{${v}}} do cabeçalho`, config.headerValues[String(v)]));
  schema.bodyVariables.forEach(v => check(`body.${v}`, `Variável {{${v}}} do corpo`, config.bodyValues[String(v)]));
  schema.buttons.filter(b => b.hasUrlVariable).forEach(b =>
    check(`button.${b.index}`, `Parâmetro do botão "${b.text || `#${b.index + 1}`}"`, config.buttonValues[String(b.index)]));

  return issues;
}

/**
 * Monta o array `components` da Cloud API para um contato específico.
 * Só inclui componentes que realmente possuem parâmetros — enviar componentes
 * vazios faz a Meta recusar a mensagem (erro 132000/132012).
 */
export function buildTemplateComponents(
  schema: TemplateSchema,
  config: TemplateSendConfig,
  contact: TemplateContactLike | null | undefined,
): any[] {
  const components: any[] = [];
  const resolve = (raw: string | undefined) => sanitizeParameterText(resolveContactTokens(raw ?? '', contact));

  if (isMediaHeader(schema.headerKind) && config.headerMediaUrl) {
    const key = schema.headerKind.toLowerCase();
    const media: Record<string, unknown> = { link: String(config.headerMediaUrl).trim() };
    if (schema.headerKind === 'DOCUMENT' && config.headerDocumentFilename) media.filename = config.headerDocumentFilename;
    components.push({ type: 'header', parameters: [{ type: key, [key]: media }] });
  } else if (schema.headerKind === 'TEXT' && schema.headerVariables.length > 0) {
    components.push({
      type: 'header',
      parameters: schema.headerVariables.map(v => ({ type: 'text', text: resolve(config.headerValues[String(v)]) || '-' })),
    });
  }

  if (schema.bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: schema.bodyVariables.map(v => ({ type: 'text', text: resolve(config.bodyValues[String(v)]) || '-' })),
    });
  }

  schema.buttons.filter(b => b.hasUrlVariable).forEach(b => {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(b.index),
      parameters: [{ type: 'text', text: resolve(config.buttonValues[String(b.index)]) || '-' }],
    });
  });

  return components;
}

/** Resumo legível dos parâmetros enviados — usado nos logs/metadados do histórico. */
export function summarizeSendConfig(schema: TemplateSchema, config: TemplateSendConfig, contact: TemplateContactLike | null | undefined) {
  const resolve = (raw: string | undefined) => sanitizeParameterText(resolveContactTokens(raw ?? '', contact));
  return {
    header_media: isMediaHeader(schema.headerKind) ? (config.headerMediaUrl || null) : null,
    header_parameters: schema.headerVariables.map(v => resolve(config.headerValues[String(v)])),
    body_parameters: schema.bodyVariables.map(v => resolve(config.bodyValues[String(v)])),
    button_parameters: schema.buttons.filter(b => b.hasUrlVariable).map(b => ({ index: b.index, value: resolve(config.buttonValues[String(b.index)]) })),
  };
}

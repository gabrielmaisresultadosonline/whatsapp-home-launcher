/**
 * Utilitário de MIME por extensão.
 *
 * Motivo: em vários navegadores/SOs (principalmente Windows) `File.type` vem
 * vazio para .rar, .csv, .doc antigos etc. Sem um MIME válido o upload para o
 * Storage e o envio à Meta falham ("application/octet-stream" não é aceito
 * para documentos). Este mapa cobre os tipos aceitos pela WhatsApp Cloud API
 * e os mais comuns em uso no CRM.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  // Documentos (aceitos pela Meta)
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  json: "application/json",
  xml: "application/xml",
  // Imagens
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  heic: "image/heic",
  // Vídeo
  mp4: "video/mp4",
  "3gp": "video/3gpp",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  // Áudio
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  amr: "audio/amr",
};

/** Extrai a extensão (minúscula, sem ponto) de um nome de arquivo. */
export const getFileExtension = (fileName: string | undefined | null): string => {
  if (!fileName) return "";
  const idx = fileName.lastIndexOf(".");
  if (idx < 0 || idx === fileName.length - 1) return "";
  return fileName.slice(idx + 1).toLowerCase().trim();
};

/**
 * Resolve o MIME de um arquivo: usa `File.type` quando confiável; caso
 * contrário infere pela extensão; e por último cai em `fallback`.
 */
export const resolveMimeType = (
  file: { name?: string; type?: string },
  fallback = "application/octet-stream",
): string => {
  const declared = (file.type || "").trim().toLowerCase();
  if (declared && declared !== "application/octet-stream") return declared;
  const ext = getFileExtension(file.name);
  return MIME_BY_EXTENSION[ext] || declared || fallback;
};

/** Remove caracteres problemáticos de um nome de arquivo para uso em Storage/URL. */
export const sanitizeFileName = (fileName: string): string =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

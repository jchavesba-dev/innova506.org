"use strict";
const {randomBytes} = require("node:crypto");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STATUSES = ["active", "revoked", "replaced"];
const TYPES = ["Aprovechamiento", "Participación", "Asistencia", "Aprobación", "Conclusión"];
const CODE_RE = /^INV-[0-9]{4}-[A-Z0-9]{6,30}$/;
function normalizeCode(value) {
  return String(value || "").normalize("NFKC").trim().toUpperCase().replace(/[\u2010-\u2015]/g,"-").replace(/\s+/g,"");
}
function safeText(value, max=180) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g," ").slice(0,max);
}
function requiredText(value, field, max=180) {
  const original=String(value ?? "").normalize("NFKC").trim().replace(/\s+/g," ");
  if(original.length>max)throw new Error(`Campo demasiado largo: ${field}`);
  const result = original;
  if (result.length < 2 || /[<>\u0000-\u001F]/.test(result)) throw new Error(`Campo inválido: ${field}`);
  return result;
}
function isoDate(value, field) {
  const v=String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v+"T12:00:00Z").toISOString().slice(0,10)!==v) throw new Error(`Fecha inválida: ${field}`);
  return v;
}
function generateCode(year = new Date().getUTCFullYear()) {
  if (!Number.isInteger(year)||year < 2020||year > 2100) throw new Error("Año inválido");
  // 20 symbols drawn without modulo bias. 20 * 5 = 100 bits of entropy.
  let out="";
  while(out.length<20) {
    const buffer=randomBytes(24);
    for(const n of buffer) { if(n<224) out+=ALPHABET[n%32]; if(out.length===20)break; }
  }
  return `INV-${year}-${out}`;
}
function maskName(name) {
  return safeText(name,180).split(" ").filter(Boolean).map(part=>part.length<=2?part[0]+"•":part.slice(0,2)+"•".repeat(Math.min(5,part.length-2))).join(" ");
}
function validateCertificate(data,{historical=false}={}) {
  if(!data || typeof data!=="object" || Array.isArray(data))throw new Error("Datos inválidos");
  const participantName=requiredText(data.participantName,"participante");
  const participantId=requiredText(data.participantId,"identificación",40);
  const courseName=requiredText(data.courseName,"curso",260);
  const certificateType=safeText(data.certificateType,32);
  if(!TYPES.includes(certificateType))throw new Error("Tipo de certificado inválido");
  const hours=Number(data.hours);
  if(!Number.isInteger(hours)||hours<1||hours>2000)throw new Error("Duración inválida");
  const modality=safeText(data.modality,50);
  if(!["Virtual", "Presencial", "Mixta"].includes(modality))throw new Error("Modalidad inválida");
  const startDate=isoDate(data.startDate,"inicio"), endDate=isoDate(data.endDate,"finalización");
  if(endDate<startDate)throw new Error("La fecha final precede al inicio");
  const issueDate=isoDate(data.issueDate,"emisión");
  if(issueDate<endDate)throw new Error("La emisión no puede preceder al cierre");
  if(issueDate>new Date().toISOString().slice(0,10))throw new Error("No se permite registrar emisiones futuras");
  const grade=(data.grade==null||data.grade==="")?null:Number(data.grade);
  if(grade!==null&&(!Number.isFinite(grade)||grade<0||grade>100))throw new Error("Calificación inválida");
  const evidenceReference=requiredText(data.evidenceReference,"referencia de expediente",150);
  if(!/^[\p{L}\p{N}._\-/ ]+$/u.test(evidenceReference))throw new Error("Referencia de expediente inválida");
  if(data.attested!==true)throw new Error("Debe confirmar que revisó la documentación de respaldo");
  let code;
  if(historical) {
    code=normalizeCode(data.code);
    if(!CODE_RE.test(code))throw new Error("Formato de código histórico inválido");
    if(code.slice(4,8)!==issueDate.slice(0,4))throw new Error("El año del código histórico no coincide con la emisión");
    if(issueDate>new Date().toISOString().slice(0,10))throw new Error("La fecha de emisión histórica es futura");
  }
  return { participantName,participantId,courseName,certificateType,hours,modality,startDate,endDate,issueDate,grade,evidenceReference,
    academicProgramReference:safeText(data.academicProgramReference,150),
    attendanceReference:safeText(data.attendanceReference,150),
    historical, ...(historical?{code}:{}) };
}
function publicRecord(doc) {
  return {code:doc.code, status:doc.status, participantMasked:maskName(doc.participantName), courseName:doc.courseName,
    certificateType:doc.certificateType, hours:doc.hours, modality:doc.modality, startDate:doc.startDate,
    endDate:doc.endDate, issueDate:doc.issueDate, issuer:"INNOVASOLUCIONES EMPRESARIALES JCB S.R.L.",
    issuerId:"3-102-759550", ...(doc.status==="replaced"&&doc.replacementCode?{replacementCode:doc.replacementCode}:{})};
}
module.exports={normalizeCode,safeText,requiredText,isoDate,generateCode,maskName,validateCertificate,publicRecord,CODE_RE,STATUSES,TYPES};

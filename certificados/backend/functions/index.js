"use strict";
const {initializeApp}=require("firebase-admin/app");
const {getFirestore,FieldValue}=require("firebase-admin/firestore");
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {logger}=require("firebase-functions");
const {generateCode,normalizeCode,validateCertificate,publicRecord,CODE_RE}=require("./domain");
initializeApp();
const db=getFirestore();
const COLL="innova506Certificates"; // private: do NOT expose via Firestore client
const AUDIT="innova506CertificateAudit";
const opts={region:"us-central1",enforceAppCheck:true,maxInstances:10,
  cors:["https://innova506.org","https://www.innova506.org",/^http:\/\/localhost:\d+$/]};
const issueLog=(action,code,uid,extras={})=>({action,code,uid,at:FieldValue.serverTimestamp(),...extras});
function requireAdmin(request) {
  if(!request.auth || request.auth.token.certificatesAdmin!==true || request.auth.token.email_verified!==true)
    throw new HttpsError("permission-denied","Acceso reservado a la administración autorizada.");
  return request.auth.uid;
}
function convertInputError(e){return e instanceof HttpsError?e:new HttpsError("invalid-argument",e.message||"Datos inválidos");}
async function register(request,historical=false) {
  const uid=requireAdmin(request);
  let input; try {input=validateCertificate(request.data,{historical});}catch(e){throw convertInputError(e);}
  let code=historical?input.code:generateCode(Number(input.issueDate.slice(0,4)));
  const record={...input,code,status:"active",issuer:"INNOVASOLUCIONES EMPRESARIALES JCB S.R.L.",issuerId:"3-102-759550",
    createdBy:uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
  delete record.attested;
  try {
    await db.runTransaction(async tx=>{
      const ref=db.collection(COLL).doc(code);
      const existing=await tx.get(ref);
      if(existing.exists)throw new HttpsError("already-exists","Ese código ya se encuentra registrado.");
      tx.create(ref,record);
      tx.create(db.collection(AUDIT).doc(),issueLog(historical?"IMPORT_HISTORICAL":"REGISTER",code,uid,{evidenceReference:input.evidenceReference}));
    });
  }catch(e){logger.error("Registration failure",{code,error:String(e)});throw e instanceof HttpsError?e:new HttpsError("internal","No se pudo guardar el registro.");}
  return {code,status:"active",historical};
}
exports.registerCertificate=onCall(opts,req=>register(req,false));
exports.importHistoricalCertificate=onCall(opts,req=>register(req,true));
exports.verifyCertificate=onCall(opts,async req=>{
  const code=normalizeCode(req.data?.code);
  if(!CODE_RE.test(code))return {found:false};
  const snap=await db.collection(COLL).doc(code).get();
  if(!snap.exists)return {found:false};
  return {found:true,record:publicRecord(snap.data())};
});
exports.listCertificates=onCall(opts,async req=>{
  requireAdmin(req);
  const snapshots=await db.collection(COLL).orderBy("createdAt","desc").limit(30).get();
  return {items:snapshots.docs.map(s=>({code:s.id,participantName:s.data().participantName,courseName:s.data().courseName,
    status:s.data().status,issueDate:s.data().issueDate,hours:s.data().hours}))};
});
exports.getCertificate=onCall(opts,async req=>{
  requireAdmin(req);const code=normalizeCode(req.data?.code);
  if(!CODE_RE.test(code))throw new HttpsError("invalid-argument","Código inválido");
  const snap=await db.collection(COLL).doc(code).get();
  if(!snap.exists)throw new HttpsError("not-found","No existe ese registro");
  const r=snap.data();
  // Deliberately no server timestamps or arbitrary attached data.
  return {record:{code:r.code,participantName:r.participantName,participantId:r.participantId,
    courseName:r.courseName,certificateType:r.certificateType,hours:r.hours,grade:r.grade,modality:r.modality,
    startDate:r.startDate,endDate:r.endDate,issueDate:r.issueDate,evidenceReference:r.evidenceReference,
    academicProgramReference:r.academicProgramReference,attendanceReference:r.attendanceReference,
    historical:r.historical,status:r.status,statusReason:r.statusReason||"",replacementCode:r.replacementCode||""}};
});
exports.changeCertificateStatus=onCall(opts,async req=>{
  const uid=requireAdmin(req),code=normalizeCode(req.data?.code);
  const status=req.data?.status,reason=String(req.data?.reason||"").trim().slice(0,280);
  const replacementCode=normalizeCode(req.data?.replacementCode);
  if(!CODE_RE.test(code)||!["revoked","replaced"].includes(status)||reason.length<10)
    throw new HttpsError("invalid-argument","Código, estado o motivo inválido.");
  if(status==="replaced"&&(!CODE_RE.test(replacementCode)||replacementCode===code))
    throw new HttpsError("invalid-argument","Debe indicar un código de sustitución diferente.");
  await db.runTransaction(async tx=>{
    const ref=db.collection(COLL).doc(code),snap=await tx.get(ref);
    if(!snap.exists)throw new HttpsError("not-found","No existe ese registro.");
    if(snap.data().status!=="active")throw new HttpsError("failed-precondition","Solo se puede cambiar un registro vigente.");
    if(status==="replaced"){
      const repl=await tx.get(db.collection(COLL).doc(replacementCode));
      if(!repl.exists||repl.data().status!=="active")throw new HttpsError("failed-precondition","El certificado sustituto debe existir y estar vigente.");
    }
    tx.update(ref,{status,statusReason:reason,replacementCode:status==="replaced"?replacementCode:null,
      updatedAt:FieldValue.serverTimestamp(),statusChangedBy:uid});
    tx.create(db.collection(AUDIT).doc(),issueLog(status==="revoked"?"REVOKE":"REPLACE",code,uid,{reason,replacementCode:status==="replaced"?replacementCode:null}));
  });
  return {code,status};
});

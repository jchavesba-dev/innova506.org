const {test}=require('node:test');const assert=require('node:assert/strict');
const d=require('../functions/domain.js');
const fixture={participantName:'María Ejemplo Solís',participantId:'0-0000-0000',courseName:'Curso de demostración',
  certificateType:'Aprovechamiento',hours:80,modality:'Virtual',startDate:'2026-07-01',endDate:'2026-08-15',issueDate:'2026-08-16',
  grade:90,evidenceReference:'ARCHIVO-DEMO-001',attested:true};
test('código aleatorio y normalización',()=>{let a=d.generateCode(2026),b=d.generateCode(2026);assert.match(a,/^INV-2026-[A-Z2-9]{20}$/);assert.notEqual(a,b);assert.equal(d.normalizeCode(' inv-2025-8a5r87ur '),'INV-2025-8A5R87UR');});
test('valida registro y fechas',()=>{assert.equal(d.validateCertificate(fixture).hours,80);assert.throws(()=>d.validateCertificate({...fixture,endDate:'2026-06-01'}));assert.throws(()=>d.validateCertificate({...fixture,hours:0}));assert.throws(()=>d.validateCertificate({...fixture,attested:false}));});
test('histórico requiere código y evidencia',()=>{assert.equal(d.validateCertificate({...fixture,issueDate:'2025-08-16',startDate:'2025-07-01',endDate:'2025-08-15',code:'INV-2025-8A5R87UR'},{historical:true}).code,'INV-2025-8A5R87UR');assert.throws(()=>d.validateCertificate({...fixture,code:'BAD'},{historical:true}));});
test('datos públicos omiten identificación, nota y evidencia',()=>{let x=d.publicRecord({...d.validateCertificate(fixture),code:'INV-2026-ABCDE123',status:'active'});assert.equal(x.issuerId,'3-102-759550');assert.ok(x.participantMasked.includes('•'));for(const key of ['participantId','participantName','grade','evidenceReference'])assert.equal(key in x,false);});

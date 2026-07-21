import {after, before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

const PROJECT_ID='campus-innova506-rules-test';
let env;

before(async()=>{
  env=await initializeTestEnvironment({
    projectId:PROJECT_ID,
    firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
  });
});

after(async()=>{
  await env.cleanup();
});

beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();
    const profiles=[
      ['admin',{id:'admin',name:'Administrador',username:'admin',role:'admin',email:'innova506@hotmail.com',authProvider:'firebase-auth',disabled:false}],
      ['teacher',{id:'teacher',name:'Docente',username:'docente',role:'teacher',email:'docente@example.com',authProvider:'firebase-auth',disabled:false}],
      ['studentA',{id:'studentA',name:'Estudiante A',username:'a',role:'student',email:'a@example.com',authProvider:'firebase-code',disabled:false}],
      ['studentB',{id:'studentB',name:'Estudiante B',username:'b',role:'student',email:'b@example.com',authProvider:'firebase-code',disabled:false}]
    ];
    for (const [id,data] of profiles) await setDoc(doc(db,'userProfiles',id),data);
    await setDoc(doc(db,'studentCodes','studentA'),{uid:'studentA',code:'INNOVA-AAAA-2222-BBBB'});
    await setDoc(doc(db,'courses','c1'),{id:'c1',title:'Curso 1'});
    await setDoc(doc(db,'courses','c2'),{id:'c2',title:'Curso 2'});
    await setDoc(doc(db,'enrollments','c1_teacher'),{id:'c1_teacher',cid:'c1',sid:'teacher',role:'teacher'});
    await setDoc(doc(db,'enrollments','c1_studentA'),{id:'c1_studentA',cid:'c1',sid:'studentA',role:'student'});
    await setDoc(doc(db,'enrollments','c2_studentB'),{id:'c2_studentB',cid:'c2',sid:'studentB',role:'student'});
    await setDoc(doc(db,'submissions','subA'),{id:'subA',cid:'c1',sid:'studentA',type:'quiz',score:8,max:10});
    await setDoc(doc(db,'submissions','subB'),{id:'subB',cid:'c2',sid:'studentB',type:'quiz',score:7,max:10});
    await setDoc(doc(db,'views','viewA'),{id:'viewA',cid:'c1',sid:'studentA',mid:'m1'});
    await setDoc(doc(db,'settings','init'),{value:true});
    await setDoc(doc(db,'lms','users'),{value:'legacy'});
  });
});

function dbFor(uid,email) {
  return env.authenticatedContext(uid,email?{email}:{ }).firestore();
}

test('un usuario sin sesión no puede leer el campus',async()=>{
  const db=env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db,'courses','c1')));
  await assertFails(getDoc(doc(db,'userProfiles','studentA')));
});

test('el administrador puede gestionar datos, pero la colección legacy permanece cerrada',async()=>{
  const db=dbFor('admin','innova506@hotmail.com');
  await assertSucceeds(getDoc(doc(db,'studentCodes','studentA')));
  await assertSucceeds(getDoc(doc(db,'courses','c2')));
  await assertSucceeds(deleteDoc(doc(db,'submissions','subB')));
  await assertFails(getDoc(doc(db,'lms','users')));
});

test('el bootstrap solo permite crear el administrador con identidad exacta',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
    await deleteDoc(doc(context.firestore(),'userProfiles','admin'));
  });
  const good=dbFor('newAdmin','innova506@hotmail.com');
  await assertSucceeds(setDoc(doc(good,'userProfiles','newAdmin'),{
    id:'newAdmin',name:'Jason Chaves Bastos',username:'jason.chaves',role:'admin',
    email:'innova506@hotmail.com',authProvider:'firebase-auth',disabled:false
  }));
  const impostor=dbFor('impostor','otra@example.com');
  await assertFails(setDoc(doc(impostor,'userProfiles','impostor'),{
    id:'impostor',name:'Intruso',username:'intruso',role:'admin',
    email:'innova506@hotmail.com',authProvider:'firebase-auth',disabled:false
  }));
});

test('un estudiante solo accede a su perfil, curso, entrega y avance',async()=>{
  const db=dbFor('studentA');
  await assertSucceeds(getDoc(doc(db,'userProfiles','studentA')));
  await assertFails(getDoc(doc(db,'userProfiles','studentB')));
  await assertSucceeds(getDoc(doc(db,'courses','c1')));
  await assertFails(getDoc(doc(db,'courses','c2')));
  await assertSucceeds(getDoc(doc(db,'submissions','subA')));
  await assertFails(getDoc(doc(db,'submissions','subB')));
  await assertFails(getDoc(doc(db,'studentCodes','studentA')));
  const ownEnrollments=query(collection(db,'enrollments'),where('sid','==','studentA'));
  assert.equal((await assertSucceeds(getDocs(ownEnrollments))).size,1);
});

test('un estudiante puede crear actividad propia solo dentro de un curso matriculado',async()=>{
  const db=dbFor('studentA');
  await assertSucceeds(setDoc(doc(db,'submissions','newOwn'),{
    id:'newOwn',cid:'c1',sid:'studentA',type:'assignment',txt:'Entrega'
  }));
  await assertFails(setDoc(doc(db,'submissions','outside'),{
    id:'outside',cid:'c2',sid:'studentA',type:'assignment',txt:'No autorizado'
  }));
  await assertFails(updateDoc(doc(db,'submissions','subA'),{score:10}));
  await assertSucceeds(setDoc(doc(db,'views','studentA_c1_m2'),{
    id:'studentA_c1_m2',cid:'c1',sid:'studentA',mid:'m2'
  }));
});

test('un docente solo accede y califica dentro de su curso asignado',async()=>{
  const db=dbFor('teacher');
  await assertSucceeds(getDoc(doc(db,'userProfiles','teacher')));
  await assertFails(getDoc(doc(db,'userProfiles','studentB')));
  await assertFails(getDocs(collection(db,'userProfiles')));
  await assertSucceeds(getDoc(doc(db,'courses','c1')));
  await assertFails(getDoc(doc(db,'courses','c2')));
  await assertSucceeds(getDoc(doc(db,'submissions','subA')));
  await assertFails(getDoc(doc(db,'submissions','subB')));
  await assertSucceeds(updateDoc(doc(db,'submissions','subA'),{score:9}));
  await assertFails(updateDoc(doc(db,'submissions','subB'),{score:9}));
  const c1Submissions=query(collection(db,'submissions'),where('cid','==','c1'));
  assert.equal((await assertSucceeds(getDocs(c1Submissions))).size,1);
});

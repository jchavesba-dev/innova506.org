// EJECUTAR SOLO desde un entorno administrativo autorizado. NO publicar llaves de servicio.
// Uso: node scripts/manage-admin.mjs <uid> grant|revoke
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const [uid,action]=process.argv.slice(2);
if(!uid||!['grant','revoke'].includes(action))throw new Error('Uso: node manage-admin.mjs <uid> grant|revoke');
initializeApp({credential:applicationDefault()});
const auth=getAuth(),user=await auth.getUser(uid);
const claims={...(user.customClaims||{}),certificatesAdmin:action==='grant'};
await auth.setCustomUserClaims(uid,claims);
console.log('Rol actualizado para UID:',uid,'(manteniendo otras claims). Es necesario renovar el token de sesión.');

import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,getIdTokenResult} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js';
import {initializeAppCheck,ReCaptchaEnterpriseProvider} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js';
import {firebaseConfig,appCheckSiteKey,functionsRegion} from './config.js';
if(!firebaseConfig.apiKey || firebaseConfig.apiKey==='REEMPLAZAR' || !appCheckSiteKey || appCheckSiteKey.startsWith('REEMPLAZAR')){
  throw new Error('Antes de publicar, configure site/assets/config.js con la aplicación Firebase y App Check.');
}
const app=initializeApp(firebaseConfig);
initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(appCheckSiteKey),isTokenAutoRefreshEnabled:true});
const auth=getAuth(app), functions=getFunctions(app,functionsRegion);
const api=name=>httpsCallable(functions,name);
export {auth,api,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,getIdTokenResult};

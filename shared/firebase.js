// Conexão única com o Firebase, usada por todos os módulos que leem/gravam
// no Firestore (finanças, futebol). Pra trocar a versão do SDK ou o projeto,
// é só mexer aqui.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// Re-exporta as funções do Firestore (collection, doc, onSnapshot, ...) pra
// os módulos importarem tudo daqui, sem repetir a URL/versão do SDK.
export * from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbsu_WD-7L-elljYBJ0j1naGiSGCnhDbE",
  authDomain: "my-home-dash-b554d.firebaseapp.com",
  projectId: "my-home-dash-b554d",
  storageBucket: "my-home-dash-b554d.firebasestorage.app",
  messagingSenderId: "225507144407",
  appId: "1:225507144407:web:833b14e322dca4c8b23692",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// Login anônimo — precisa acontecer antes de ler/gravar no banco.
export function entrar() {
  return signInAnonymously(auth);
}

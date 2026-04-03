/**
 * Firebase Web SDK initialization.
 * google-services.json'dan alınan config ile gerçek Firebase'e bağlanır.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyAsbnlSngXf_qTvkj-JoicIaj32cUE_Yhg',
  authDomain: 'war-nexus-dae64.firebaseapp.com',
  projectId: 'war-nexus-dae64',
  storageBucket: 'war-nexus-dae64.firebasestorage.app',
  messagingSenderId: '669522610182',
  appId: '1:669522610182:android:605ac497185755ae06db87',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export default app;

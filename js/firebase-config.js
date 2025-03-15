// /public/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1wg94PeMQeKcmG9yEdauE0DTaZe4YiRI",
  authDomain: "ai-trust-survey.firebaseapp.com",
  projectId: "ai-trust-survey",
  storageBucket: "ai-trust-survey.firebasestorage.app",
  messagingSenderId: "467097544874",
  appId: "1:467097544874:web:c0d237d7cca8265e74c8d3",
  measurementId: "G-2466PL0TJC"
};

// 增强初始化配置
const app = initializeApp(firebaseConfig);

// 持久化配置
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: 'none'
  })
});

// 认证状态管理
let authReady = new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, user => {
    unsubscribe();
    if (!user) {
      signInAnonymously(auth)
        .then(cred => resolve(cred.user))
        .catch(error => {
          console.error("Auth Error:", error);
          resolve(null);
        });
    } else {
      resolve(user);
    }
  });
});

// 全局访问点
window.firebaseReady = {
  auth: authReady,
  db: Promise.resolve(db)
};

export { app, db, auth, authReady };
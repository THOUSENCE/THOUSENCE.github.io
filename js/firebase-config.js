// /public/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js"; // 注意路径版本号
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1wg94PeMQeKcmG9yEdauE0DTaZe4YiRI",
  authDomain: "ai-trust-survey.firebaseapp.com",
  projectId: "ai-trust-survey",
  storageBucket: "ai-trust-survey.firebasestorage.app",
  messagingSenderId: "467097544874",
  appId: "1:467097544874:web:c0d237d7cca8265e74c8d3",
  measurementId: "G-2466PL0TJC"
};

// 初始化顺序必须严格如下
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // 必须在其他服务之前初始化
const db = getFirestore(app);

// 延迟执行认证（确保DOM加载完成）
document.addEventListener('DOMContentLoaded', () => {
  signInAnonymously(auth)
    .catch((error) => {
      console.error("匿名登录失败:", error.code, error.message);
    });
});

// 执行匿名登录
signInAnonymously(auth)
  .then(() => {
    console.log("匿名登录成功");
  })
  .catch((error) => {
    console.error("匿名登录失败:", error);
  });

export { app, db, auth };
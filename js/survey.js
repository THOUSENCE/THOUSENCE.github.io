// js/survey.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyC1wg94PeMQeKcmG9yEdauE0DTaZe4YiRI",
  authDomain: "ai-trust-survey.firebaseapp.com",
  projectId: "ai-trust-survey",
  storageBucket: "ai-trust-survey.firebasestorage.app",
  messagingSenderId: "467097544874",
  appId: "1:467097544874:web:c0d237d7cca8265e74c8d3",
  measurementId: "G-2466PL0TJC"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* 工具函数 */
const collectCurrentPageData = () => {
  const form = document.getElementById('surveyForm');
  const formData = new FormData(form);
  return Object.fromEntries(formData);
};

const savePageData = () => {
  const pageData = collectCurrentPageData();
  const pageNumber = document.title.includes('第一部分') ? 1 : 2;
  localStorage.setItem(`survey${pageNumber}`, JSON.stringify(pageData));
};

const loadSavedData = () => {
  const pageNumber = document.title.includes('第一部分') ? 1 : 2;
  const storageKey = `survey${pageNumber}`;
  const rawData = localStorage.getItem(storageKey);
  const savedData = rawData ? JSON.parse(rawData) : {};

  for (const [name, value] of Object.entries(savedData)) {
    const input = document.querySelector(`[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
};

const setupAutoSave = () => {
  const form = document.getElementById('surveyForm');
  if (form) {
    form.addEventListener('change', savePageData);
  }
};

/* 核心功能 */
export const initSurvey = (config = {}) => {
  // 初始化计时
  if (!localStorage.getItem('startTime')) {
    localStorage.setItem('startTime', Date.now());
  }

  // 进度条设置
  if (config.pageNumber && config.totalPages) {
    const progress = document.querySelector('.progress');
    if (progress) {
      progress.style.width = `${(config.pageNumber / config.totalPages) * 100}%`;
    }
  }

  // 加载本地数据
  loadSavedData();

  // 启用自动保存
  setupAutoSave();
};

// 耗时计算
const calculateTotalTime = () => {
  const start = parseInt(localStorage.getItem('startTime'));
  return Math.round((Date.now() - start) / 1000);
};

// IP获取
const getIPAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

/* 数据提交 */
export const handleSubmit = async () => {
  savePageData();

  // 仅在最后一页提交
  if (!document.title.includes('第二部分')) return;

  try {
    const formData = {
        ...JSON.parse(localStorage.getItem('survey1') || '{}'),
        ...JSON.parse(localStorage.getItem('survey2') || '{}'),
        duration: calculateTotalTime(),
        ip: await getIPAddress(),
        timestamp: new Date().toISOString()
    };
//保存在survey1集合中
    await addDoc(collection(db, "survey1"), formData);
    localStorage.clear();
    } catch (error) {
        console.error("提交失败:", error);
        throw error;
    }
};
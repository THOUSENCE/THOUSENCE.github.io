import { 
  initializeFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  writeBatch,
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app, auth, db } from './firebase-config.js';
import CryptoJS from 'https://cdn.skypack.dev/crypto-js';
import { v4 as uuidv4 } from 'https://cdn.skypack.dev/uuid';

// 有效问卷版本标识
const VALID_PAGES = [
  'part111', 'part112', 'part113', 'part114',
  'part115', 'part116', 'part117', 'part118'
];

class SurveyManager {
  constructor() {
    // 初始化增强的Firestore实例
    this.db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    });

    this.data = {
      meta: {
        uid: null,
        allocation: null,
        ip: null,
        userAgent: navigator.userAgent,
        startTime: new Date().toISOString(),
        progress: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      responses: {}
    };

    // 绑定认证状态
    auth.onAuthStateChanged(user => {
      if (user) {
        this.data.meta.uid = user.uid;
        this.restoreFromLocal();
        this.loadAllocation();
      }
    });
  }

  // 加载分配信息
  async loadAllocation() {
    const docSnap = await getDoc(doc(this.db, 'userAllocations', this.data.meta.uid));
    this.data.meta.allocation = docSnap.exists() ? docSnap.data().page : null;
  }

  // 本地存储方法
  restoreFromLocal() {
    const savedData = localStorage.getItem(`survey_${this.data.meta.uid}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.data = { ...this.data, ...parsed };
      } catch (e) {
        console.error('本地存储解析失败:', e);
        this.clearLocal();
      }
    }
  }

  saveToLocal() {
    localStorage.setItem(`survey_${this.data.meta.uid}`, JSON.stringify(this.data));
  }

  clearLocal() {
    localStorage.removeItem(`survey_${this.data.meta.uid}`);
  }

  async initialize() {
    await this.getIP();
    this.saveToLocal();
  }

  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();
      this.data.meta.ip = VALIDATION_CONFIG.IP_POLICY.hashing 
        ? CryptoJS.SHA256(ip + VALIDATION_CONFIG.IP_POLICY.salt).toString()
        : ip;
    } catch (error) {
      console.warn('IP获取失败:', error);
      this.data.meta.ip = 'unknown';
    }
  }

  recordPageTime(pageName) {
    const duration = Date.now() - this.pageStartTime;
    this.data.meta.progress.push({
      page: pageName,
      duration,
      timestamp: new Date().toISOString(),
      allocation: this.data.meta.allocation
    });
    this.pageStartTime = Date.now();
    this.saveToLocal();
  }

  saveFormData(pageName, formData) {
    this.data.responses[pageName] = Object.fromEntries(formData);
    this.saveToLocal();
    updateDoc(doc(this.db, 'userProgress', this.data.meta.uid), {
      [pageName]: this.data.responses[pageName]
    });
  }

  async performValidations() {
    const validations = await Promise.allSettled([
      this.checkIPUnique(),
      this.checkTimeValidity(),
      this.checkConflictAnswers(),
      this.checkRepetitionRate(),
      this.verifyAllocation()
    ]);

    return validations.map((v) => 
      v.status === 'fulfilled' ? v.value : { valid: false, reason: v.reason }
    );
  }

  async verifyAllocation() {
    return { valid: VALID_PAGES.includes(this.data.meta.allocation) };
  }

  async recordInvalidAttempt(results) {
    console.warn('无效提交:', results);
  }

  async submitFinal() {
    try {
      const validationResults = await this.performValidations();
      const isValid = validationResults.every(r => r.valid);

      if (!isValid) {
        await this.recordInvalidAttempt(validationResults);
        return { success: false, errors: validationResults };
      }

      const batch = writeBatch(this.db);
      const surveyRef = doc(collection(this.db, 'surveys'));
      batch.set(surveyRef, this.data);
      batch.set(doc(this.db, 'userAllocations', this.data.meta.uid), { completed: new Date() }, { merge: true });
      await batch.commit();
      this.clearLocal();
      return { success: true, id: surveyRef.id };
    } catch (error) {
      await this.logError(error);
      return { success: false, error: error.message };
    }
  }

  async logError(error) {
    await setDoc(doc(this.db, 'errorLogs', uuidv4()), {
      uid: this.data.meta.uid,
      timestamp: new Date().toISOString(),
      error: error.toString(),
      stack: error.stack,
      state: this.data
    });
  }
}

export function initProgress(percentage) {
  const progressBars = document.querySelectorAll('.progress-bar');
  progressBars.forEach(bar => {
    const progress = bar.querySelector('.progress');
    if (progress) {
      progress.style.width = `${percentage}%`;
      progress.setAttribute('aria-valuenow', percentage);
      if (percentage === 100) {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.textContent = '进度已完成';
        bar.appendChild(announcement);
      }
    }
  });
}

export const surveyManager = new SurveyManager();
// /public/js/survey.js
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { app, db } from './firebase-config.js';
import { VALIDATION_CONFIG } from './validation-config.js'; // 预设参数配置文件

class SurveyManager {
  constructor() {
    this.data = {
      meta: {
        ip: null,
        userAgent: navigator.userAgent,
        startTime: new Date().toISOString(),
        progress: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      responses: {}
    };
    this.pageStartTime = Date.now();
    
    // 自动恢复未提交数据
    const savedData = localStorage.getItem('surveyData');
    if (savedData) this.data = JSON.parse(savedData);
  }

  // 核心初始化方法
  async init() {
    await this.#getIP();
    this.#saveToLocal();
  }

  // 私有方法：获取客户端IP
  async #getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();
      this.data.meta.ip = VALIDATION_CONFIG.IP_POLICY.hashing 
        ? this.#hashIP(ip) 
        : ip;
    } catch (error) {
      console.warn('IP获取失败:', error);
      this.data.meta.ip = 'unknown';
    }
  }

  // IP哈希处理
  #hashIP(ip) {
    return CryptoJS.SHA256(ip + 'salt').toString(CryptoJS.enc.Hex); // 加盐哈希
  }

  // 保存到本地存储
  #saveToLocal() {
    localStorage.setItem('surveyData', JSON.stringify(this.data));
  }

  // 记录页面停留时间
  recordPageTime(pageName) {
    const duration = Date.now() - this.pageStartTime;
    this.data.meta.progress.push({
      page: pageName,
      duration,
      timestamp: new Date().toISOString()
    });
    this.pageStartTime = Date.now();
    this.#saveToLocal();
  }

  // 保存表单数据（修改参数结构）
  saveFormData(pageName, formData) {
    this.data.responses[pageName] = Object.fromEntries(formData);
    this.#saveToLocal();
  }

  // =============== 新增验证方法 =============== //

  // 验证IP唯一性
  async #checkIPUnique() {
    if (!VALIDATION_CONFIG.IP_CHECK) return true;
    if (VALIDATION_CONFIG.IP_POLICY.allowLocalhost && 
        this.data.meta.ip.includes('localhost')) return true;

    const ipQuery = query(
      collection(db, 'surveys'),
      where('meta.ip', '==', this.data.meta.ip)
    );
    const snapshot = await getDocs(ipQuery);
    return snapshot.empty;
  }

  #checkTimeValidity() {
    const totalTime = this.data.meta.progress.reduce((sum, p) => sum + p.duration, 0);
    const sectionTimes = this.data.meta.progress.reduce((acc, p) => {
      acc[p.page] = (acc[p.page] || 0) + p.duration;
      return acc;
    }, {});
  
    // 保持 >= 用于最小时间验证
    const totalValid = totalTime >= VALIDATION_CONFIG.TIME_LIMITS.total;
    const sectionsValid = Object.entries(sectionTimes).every(([page, time]) =>
      time >= (VALIDATION_CONFIG.TIME_LIMITS.sections[page] || 0) // 改为 0 作为默认下限
    );
  
    return { totalValid, sectionsValid };
  }
  // 检测矛盾回答
  #checkConflictAnswers() {
    const conflicts = [];
    for (const [group, config] of Object.entries(VALIDATION_CONFIG.CONFLICT_QUESTIONS)) {
      const answers = config.questions.map(q => this.#getAnswer(q)); // 获取用户答案

      // 检查是否存在匹配的 expected 组合
      const isValid = config.expected.some(validCombo => 
        JSON.stringify(validCombo) === JSON.stringify(answers)
      );

      if (!isValid) {
        conflicts.push(group);
      }
    }
    return conflicts;
  }

  // 支持响应数据嵌套查询（如 part1.q3）
  #getAnswer(path) {
    return path.split('.').reduce((obj, key) => 
      (obj && obj[key] !== undefined) ? obj[key] : null, 
      this.data.responses
    );
  }

  // 检测重复回答模式
  #checkRepetitionRate() {
    const allAnswers = Object.values(this.data.responses)
      .flatMap(page => Object.values(page))
      .filter(a => !VALIDATION_CONFIG.REPETITION_RULES.ignoreQuestions.includes(a));

    const answerCount = allAnswers.reduce((acc, a) => {
      acc[a] = (acc[a] || 0) + 1;
      return acc;
    }, {});

    const maxCount = Math.max(...Object.values(answerCount));
    return maxCount / allAnswers.length > VALIDATION_CONFIG.REPETITION_THRESHOLD;
  }

  // =============== 修改后的提交方法 =============== //

  async submitFinal() {
    try {
      // 并行执行所有验证
      const [ipUnique, timeCheck, conflicts, repetition] = await Promise.all([
        this.#checkIPUnique(),
        Promise.resolve(this.#checkTimeValidity()),
        Promise.resolve(this.#checkConflictAnswers()),
        Promise.resolve(this.#checkRepetitionRate())
      ]);

      // 构建验证结果
      const validation = {
        ipUnique,
        totalTimeValid: timeCheck.totalValid,
        sectionTimeValid: timeCheck.sectionsValid,
        noConflicts: conflicts.length === 0,
        acceptableRepetition: !repetition
      };

      // 综合验证结果
      const isValid = Object.values(validation).every(v => v === true);
      
      if (!isValid) {
        await this.#recordInvalidAttempt(validation);
        return {
          success: false,
          valid: false,
          reasons: this.#getRejectionReasons(validation)
        };
      }

      // 通过验证后提交
      const docRef = await addDoc(collection(db, "surveys"), this.data);
      localStorage.removeItem('surveyData');
      
      return { 
        success: true, 
        valid: true,
        id: docRef.id 
      };
      
    } catch (error) {
      console.error('提交失败:', error);
      return { 
        success: false,
        error: error.message 
      };
    }
  }

  // 记录无效提交尝试
  async #recordInvalidAttempt(validation) {
    const invalidData = {
      ...this.data,
      meta: {
        ...this.data.meta,
        invalid: true,
        validationResult: validation
      }
    };
    await addDoc(collection(db, 'invalidAttempts'), invalidData);
  }

  // 生成拒绝原因
  #getRejectionReasons(validation) {
    const reasons = [];
    if (!validation.ipUnique) reasons.push('IP检测未通过');
    if (!validation.totalTimeValid) reasons.push('总提交时间过短');
    if (!validation.sectionTimeValid) reasons.push('部分环节提交过快');
    if (!validation.noConflicts) reasons.push('存在矛盾回答');
    if (!validation.acceptableRepetition) reasons.push('回答重复率过高');
    return reasons;
  }
}

// 进度条控制函数（保持不变）
export function initProgress(percentage) {
  const progressBar = document.querySelector('.progress');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `已完成 ${percentage}%`;
    }
  }
}

// 初始化全局实例
export const surveyManager = new SurveyManager();


// =================== 新增代码：处理survey3.html页面的提交逻辑 ===================

document.addEventListener('DOMContentLoaded', () => {
  // 请确保survey3.html中的提交按钮的id为 "submitBtn"
  const submitButton = document.getElementById('submitBtn');
  if (submitButton) {
    submitButton.addEventListener('click', async (event) => {
      event.preventDefault();
      
      // 调用提交方法
      const result = await surveyManager.submitFinal();
      
      // 如果提交验证未通过，则显示详细错误信息
      if (!result.valid) {
        // 尝试在页面中找到显示错误信息的容器（id为 "errorContainer"）
        const errorContainer = document.getElementById('errorContainer');
        const errorMessages = result.reasons.map(reason => `<p>${reason}</p>`).join('');
        if (errorContainer) {
          errorContainer.innerHTML = errorMessages;
          errorContainer.style.display = 'block';
        } else {
          // 如果没有指定的错误容器，则使用alert提示
          alert(result.reasons.join('\n'));
        }
      } else {
        // 如果提交成功，可做后续处理，例如跳转到感谢页
        // window.location.href = 'thankyou.html';
        alert('提交成功！');
      }
    });
  }
});

// /public/js/helpers.js

// 增强的错误类型映射表
const ERROR_MAP = {
  'invalid-user': '用户会话失效，请重新进入问卷',
  'quota-full': '当前问卷版本已满员，请24小时后重试',
  'network-error': '网络连接异常，请检查后重试',
  'form-invalid': '请完成所有必填项',
  'default': '系统繁忙，请稍后再试'
};

// 增强的加载状态控制器
export class LoadState {
  constructor(element) {
    this.element = element;
    this.originalHTML = element.innerHTML;
    this.originalWidth = element.offsetWidth;
  }

  start(message = '提交中...') {
    this.element.disabled = true;
    this.element.style.width = `${this.originalWidth}px`;
    this.element.innerHTML = `
      <span class="spinner" aria-hidden="true"></span>
      <span class="visually-hidden">${message}</span>
    `;
  }

  reset(message = '继续') {
    this.element.disabled = false;
    this.element.style.width = 'auto';
    this.element.innerHTML = message;
  }
}

// 增强的错误处理系统
export function showError(error, options = {}) {
  const {
    duration = 5000,
    position = 'prepend',
    context = document.querySelector('.container') || document.body
  } = options;

  // 解析错误信息
  const message = typeof error === 'string' ? 
    ERROR_MAP[error] || error : 
    ERROR_MAP[error.code] || error.message;

  // 创建错误元素
  const errorEl = document.createElement('div');
  errorEl.className = 'global-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.setAttribute('aria-live', 'assertive');
  errorEl.innerHTML = `
    <span class="error__icon">⚠️</span>
    <div class="error__content">
      <p class="error__title">操作异常</p>
      <p class="error__message">${message}</p>
    </div>
  `;

  // 插入页面
  const insertMethod = position === 'append' ? 'append' : 'prepend';
  context[insertMethod](errorEl);

  // 自动隐藏逻辑
  let timeoutId;
  const cleanUp = () => {
    clearTimeout(timeoutId);
    errorEl.classList.add('global-error--exit');
    setTimeout(() => errorEl.remove(), 300);
  };

  timeoutId = setTimeout(cleanUp, duration);
  errorEl.querySelector('.error__icon').addEventListener('click', cleanUp);

  // 焦点管理
  if (options.focusable) {
    errorEl.tabIndex = -1;
    errorEl.focus();
  }
}

// 增强的确认对话框（支持无障碍）
export function showConfirmDialog(options) {
  return new Promise((resolve) => {
    const {
      title = '确认提交',
      content = '您确定要提交问卷吗？',
      confirmText = '确认提交',
      cancelText = '返回检查',
      countdown = 5,
      critical = false
    } = options;

    // 创建对话框容器
    const dialog = document.createElement('div');
    dialog.className = `confirm-dialog ${critical ? 'critical' : ''}`;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
      <div class="confirm-dialog__backdrop"></div>
      <div class="confirm-dialog__container">
        <h3 id="confirm-title" class="confirm-dialog__title">${title}</h3>
        <p class="confirm-dialog__content">${content}</p>
        <div class="confirm-dialog__countdown" ${countdown ? '' : 'hidden'}>
          自动提交剩余时间：<span data-counter>${countdown}</span>秒
        </div>
        <div class="confirm-dialog__actions">
          <button type="button" class="btn btn--text" data-action="cancel">
            ${cancelText}
          </button>
          <button type="button" class="btn btn--primary" data-action="confirm" disabled>
            ${confirmText}${countdown ? ` (${countdown})` : ''}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    const confirmBtn = dialog.querySelector('[data-action="confirm"]');
    const counterEl = dialog.querySelector('[data-counter]');
    
    // 倒计时逻辑
    let remaining = countdown;
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        remaining--;
        counterEl.textContent = remaining;
        confirmBtn.textContent = `${confirmText} (${remaining})`;

        if (remaining <= 0) {
          clearInterval(timer);
          confirmBtn.disabled = false;
        }
      }, 1000);
    } else {
      confirmBtn.disabled = false;
    }

    // 事件处理
    const handleAction = (action) => {
      clearInterval(timer);
      dialog.remove();
      resolve(action === 'confirm');
      document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleAction('cancel');
      if (e.key === 'Enter' && !confirmBtn.disabled) handleAction('confirm');
    };

    dialog.querySelector('[data-action="cancel"]')
      .addEventListener('click', () => handleAction('cancel'));

    confirmBtn.addEventListener('click', () => handleAction('confirm'));
    document.addEventListener('keydown', handleKeyDown);

    // 焦点管理
    setTimeout(() => confirmBtn.focus(), 100);
  });
}

// 增强的进度提示系统
export function createProgressControl(options = {}) {
  const config = {
    type: 'info',
    duration: null,
    closable: false,
    ...options
  };

  const progressEl = document.createElement('div');
  progressEl.className = `global-progress global-progress--${config.type}`;
  progressEl.setAttribute('role', 'status');
  progressEl.setAttribute('aria-live', 'polite');

  if (config.message) {
    progressEl.textContent = config.message;
  }

  document.body.appendChild(progressEl);

  // 自动关闭逻辑
  let timeoutId;
  if (config.duration) {
    timeoutId = setTimeout(() => {
      progressEl.remove();
    }, config.duration);
  }

  // 关闭方法
  const close = () => {
    clearTimeout(timeoutId);
    progressEl.classList.add('global-progress--exit');
    setTimeout(() => progressEl.remove(), 300);
  };

  // 可关闭按钮
  if (config.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'global-progress__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);
    progressEl.appendChild(closeBtn);
  }

  return {
    update: (newMessage) => {
      progressEl.textContent = newMessage;
    },
    close
  };
}

// 增强的表单验证工具
export function validateForm(form) {
  const elements = form.elements;
  const invalidFields = [];
  
  // 检查必填项
  Array.from(elements).forEach(el => {
    if (el.required && !el.value.trim()) {
      invalidFields.push(el.name);
      el.closest('.question-group').classList.add('invalid');
    } else {
      el.closest('.question-group')?.classList.remove('invalid');
    }
  });

  return {
    valid: invalidFields.length === 0,
    invalidFields
  };
}
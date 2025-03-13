// /public/js/helpers.js

// 显示加载状态
export function showLoading(buttonElement) {
  buttonElement.disabled = true;
  buttonElement.innerHTML = `
    <span class="spinner" aria-hidden="true"></span>
    <span class="visually-hidden">正在提交中...</span>
  `;
}

// 显示错误提示
export function showError(message, duration = 5000) {
  const container = document.querySelector('.container') || document.body;
  const errorEl = document.createElement('div');
  
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <span class="error-icon">⚠️</span>
    <span class="error-text">${message}</span>
  `;

  container.prepend(errorEl);
  
  // 自动隐藏
  setTimeout(() => {
    errorEl.classList.add('fade-out');
    setTimeout(() => errorEl.remove(), 300);
  }, duration);
}

// 重置按钮到初始状态
export function resetButton(buttonElement, originalText = '提交问卷') {
  buttonElement.disabled = false;
  buttonElement.innerHTML = originalText;
}

// 带倒计时的确认对话框
export function showConfirmation(options) {
  return new Promise((resolve) => {
    const {
      title = '确认提交',
      content = '您确定要提交问卷吗？',
      cancelText = '返回检查',
      confirmText = '确认提交',
      countdown = 5
    } = options;

    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.role = 'alertdialog';
    dialog.ariaLabelledby = 'confirmation-title';
    
    let remaining = countdown;
    
    dialog.innerHTML = `
      <h3 id="confirmation-title">${title}</h3>
      <p>${content}</p>
      <div class="countdown">自动提交倒计时：<span>${remaining}</span>秒</div>
      <div class="button-group">
        <button class="btn cancel-btn">${cancelText}</button>
        <button class="btn confirm-btn" disabled>
          ${confirmText} (${remaining})
        </button>
      </div>
    `;

    document.body.appendChild(dialog);
    
    // 倒计时处理
    const countdownEl = dialog.querySelector('.countdown span');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const timer = setInterval(() => {
      remaining--;
      countdownEl.textContent = remaining;
      confirmBtn.innerHTML = `${confirmText} (${remaining})`;

      if (remaining <= 0) {
        clearInterval(timer);
        confirmBtn.disabled = false;
        confirmBtn.click();
      }
    }, 1000);

    // 按钮事件处理
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
      clearInterval(timer);
      dialog.remove();
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      clearInterval(timer);
      dialog.remove();
      resolve(true);
    });
  });
}

// 显示进度提示（需配合CSS动画）
export function showProgress(message, type = 'info') {
  const progressEl = document.createElement('div');
  progressEl.className = `global-progress ${type}`;
  progressEl.textContent = message;
  
  document.body.appendChild(progressEl);
  
  return {
    update: (newMessage) => {
      progressEl.textContent = newMessage;
    },
    close: () => {
      progressEl.classList.add('fade-out');
      setTimeout(() => progressEl.remove(), 300);
    }
  };
}
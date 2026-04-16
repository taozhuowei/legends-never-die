(function screenDetect() {
  const MIN_WIDTH = 600;
  const MIN_HEIGHT = 320;
  
  let warningScreen = null;
  let warningTitle = null;
  let warningMessage = null;
  let warningIcon = null;
  
  function init() {
    warningScreen = document.getElementById('size-warning-screen');
    warningTitle = document.getElementById('warning-title');
    warningMessage = document.getElementById('warning-message');
    warningIcon = document.getElementById('warning-icon');
    
    if (!warningScreen) {
      return;
    }
    
    checkScreenSize();
    window.addEventListener('resize', debounce(checkScreenSize, 200));
    window.addEventListener('orientationchange', checkScreenSize);
  }
  
  function checkScreenSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    const isTooSmall = width < MIN_WIDTH || height < MIN_HEIGHT;
    
    let showWarning = false;
    let title = '';
    let message = '';
    let icon = '';
    
    if (isPortrait && isTooSmall) {
      showWarning = true;
      title = '请旋转屏幕';
      message = '请将设备旋转到横屏模式以获得更好的游戏体验。';
      icon = '↻';
    } else if (isTooSmall) {
      showWarning = true;
      title = '屏幕尺寸过小';
      message = '请使用更大的屏幕设备进行游戏，或调整窗口大小。';
      icon = '⚠';
    } else if (isPortrait) {
      showWarning = true;
      title = '建议横屏';
      message = '建议使用横屏模式以获得最佳游戏体验。';
      icon = '↻';
    }
    
    updateWarningScreen(showWarning, title, message, icon);
  }
  
  function updateWarningScreen(show, title, message, icon) {
    if (!warningScreen) {
      return;
    }
    
    if (show) {
      warningScreen.classList.remove('hidden');
      if (warningTitle) warningTitle.textContent = title;
      if (warningMessage) warningMessage.textContent = message;
      if (warningIcon) warningIcon.textContent = icon;
    } else {
      warningScreen.classList.add('hidden');
    }
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

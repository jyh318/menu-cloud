// ============ 移动端适配模块 ============

// ==================== 移动端适配 ====================

/**
 * 初始化移动端标签水平滚动
 */
function initMobileTagsScroll() {
  const sidebar = DOM.sidebar;
  if (!sidebar) return;

  let hideTimer = null;

  function showScrollbar() {
    sidebar.classList.remove('scrollbar-hidden');
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      sidebar.classList.add('scrollbar-hidden');
    }, 3000);
  }

  sidebar.addEventListener('scroll', () => {
    if (AppState.isMobile()) {
      showScrollbar();
      scheduleHide();
    }
  });

  sidebar.addEventListener('touchstart', () => {
    if (AppState.isMobile()) {
      showScrollbar();
      scheduleHide();
    }
  });

  if (AppState.isMobile()) {
    sidebar.classList.add('scrollbar-hidden');
  }
}

/**
 * 显示移动端二级分类子面板
 * @param {number} parentId - 一级分类ID
 */
function showMobileSubPanel(parentId) {
  if (!AppState.isMobile()) return;
  
  const parentIdNum = parseInt(parentId, 10);
  const parentTag = AppState.tagTree.find(t => t.id === parentIdNum);
  if (!parentTag || !parentTag.children || parentTag.children.length === 0) {
    hideMobileSubPanel();
    return;
  }
  
  // 构建二级标签chips
  const chipsHtml = parentTag.children.map(child => {
    const isActive = AppState.currentTag === child.name;
    const hasColor = child.background_color && child.text_color;
    const fallbackBg = 'var(--accent)';
    const fallbackColor = '#fff';
    const activeBg = isActive ? hexToRgba(child.background_color, 0.8) || fallbackBg : 'var(--surface)';
    const activeColor = isActive ? child.text_color || fallbackColor : 'var(--text-secondary)';
    const activeBorder = isActive ? child.background_color || fallbackBg : 'var(--border)';
    return `
      <span class="sub-chip ${isActive ? 'active' : ''}" data-mobile-tag="${child.name}"
        style="background:${activeBg};color:${activeColor};border-color:${activeBorder}">
        ${child.name}
      </span>
    `;
  }).join('');
  
  DOM.mobileSubPanel.innerHTML = chipsHtml;
  
  // 绑定chip点击事件
  DOM.mobileSubPanel.querySelectorAll('.sub-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.mobileTag;
      // 调用 selectCategory 会重建 sub-panel，因此先更新 active 状态
      // 找到当前 chip 对应的 child 颜色信息
      const child = parentTag.children.find(c => c.name === tag);
      const fallbackBg = 'var(--accent)';
      const fallbackColor = '#fff';
      const bgColor = child ? (hexToRgba(child.background_color, 0.8) || fallbackBg) : fallbackBg;
      const colorText = child ? (child.text_color || fallbackColor) : fallbackColor;
      const borderColor = child ? (child.background_color || fallbackBg) : fallbackBg;
      
      // 1. 立即更新所有 chip 的样式（基于当前 DOM）
      DOM.mobileSubPanel.querySelectorAll('.sub-chip').forEach(c => {
        c.classList.remove('active');
        c.style.background = 'var(--surface)';
        c.style.color = 'var(--text-secondary)';
        c.style.borderColor = 'var(--border)';
      });
      chip.classList.add('active');
      chip.style.background = bgColor;
      chip.style.color = colorText;
      chip.style.borderColor = borderColor;
      
      // 2. 调用 selectCategory（会重建 sub-panel，但因为 AppState.currentTag 已设置，
      //    重建后的 chip 也会正确显示为 active 状态）
      selectCategory(tag);
    });
  });
  
  // 显示面板（带动画）
  DOM.mobileSubPanel.classList.remove('visible');
  void DOM.mobileSubPanel.offsetWidth;
  DOM.mobileSubPanel.classList.add('visible');
}

/**
 * 隐藏移动端二级分类子面板
 */
function hideMobileSubPanel() {
  DOM.mobileSubPanel.classList.remove('visible');
  DOM.mobileSubPanel.innerHTML = '';
}
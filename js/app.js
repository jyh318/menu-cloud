// ============ 应用入口与事件绑定 ============

// ==================== 事件绑定 ====================

/**
 * 绑定所有全局事件
 */
function bindEvents() {
  // 全部菜品按钮
  const allCategory = document.querySelector('.category-header[data-category="all"]');
  if (allCategory) {
    allCategory.addEventListener('click', () => selectCategory('all'));
  }
  
  // 搜索按钮
  DOM.searchBtn.addEventListener('click', openSearchModal);
  if (DOM.mobileSearchBtn) {
    DOM.mobileSearchBtn.addEventListener('click', openSearchModal);
  }
  DOM.searchClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSearchModal();
  });
  
  // 每日推荐选择弹窗关闭
  if (DOM.dailyPickerClose) {
    DOM.dailyPickerClose.addEventListener('click', closeDailyRecommendPicker);
  }
  if (DOM.dailyPickerModal) {
    DOM.dailyPickerModal.addEventListener('click', (e) => {
      if (e.target === DOM.dailyPickerModal) {
        closeDailyRecommendPicker();
      }
    });
  }
  // 每日推荐选择弹窗搜索
  if (DOM.dailyPickerSearch) {
    let pickerSearchTimer = null;
    DOM.dailyPickerSearch.addEventListener('input', (e) => {
      clearTimeout(pickerSearchTimer);
      const keyword = e.target.value;
      pickerSearchTimer = setTimeout(() => {
        renderDailyPickerDishes(keyword);
      }, 300);
    });
  }
  
  // 搜索输入
  DOM.searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
  
  // 搜索清除按钮
  if (DOM.searchClear) {
    DOM.searchClear.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSearch();
    });
  }
  
  // 搜索弹窗点击背景关闭
  DOM.searchModal.addEventListener('click', (e) => {
    if (e.target === DOM.searchModal) {
      closeSearchModal();
    }
  });
  
  // 搜索框ESC键关闭
  DOM.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  });
  
  // 菜品详情弹窗
  DOM.modalClose.addEventListener('click', closeDishModal);
  DOM.dishModal.addEventListener('click', (e) => {
    if (e.target === DOM.dishModal) {
      closeDishModal();
    }
  });
  
  // 编辑菜品弹窗背景点击关闭
  DOM.editDishModal.addEventListener('click', (e) => {
    if (e.target === DOM.editDishModal) {
      closeEditDishModal();
    }
  });
  
  // 新增菜品弹窗背景点击关闭
  DOM.addDishModal.addEventListener('click', (e) => {
    if (e.target === DOM.addDishModal) {
      closeAddDishModal();
    }
  });
  
  // ESC 关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.loginModal.classList.contains('active')) {
        closeLoginModal();
      } else if (DOM.userPanel.classList.contains('active')) {
        closeUserPanel();
      } else if (DOM.dishModal.classList.contains('active')) {
        closeDishModal();
      } else if (DOM.searchModal.classList.contains('active')) {
        closeSearchModal();
      } else if (DOM.cartSidebar.classList.contains('active')) {
        closeCartSidebar();
      } else if (DOM.adminPanel.classList.contains('active')) {
        closeAdminPanel();
      } else if (DOM.editDishModal.classList.contains('active')) {
        closeEditDishModal();
      } else if (DOM.addDishModal.classList.contains('active')) {
        closeAddDishModal();
      }
    }
  });
  
  // 购物车
  DOM.floatingCart.addEventListener('click', openCartSidebar);
  DOM.cartClose.addEventListener('click', closeCartSidebar);
  DOM.checkoutButton.addEventListener('click', handleCheckout);
  
  // 订单按钮
  DOM.ordersBtn.addEventListener('click', handleOrdersClick);
  
  // 登录弹窗
  DOM.loginClose.addEventListener('click', closeLoginModal);
  DOM.loginButton.addEventListener('click', handleLogin);
  DOM.loginModal.addEventListener('click', (e) => {
    if (e.target === DOM.loginModal) {
      closeLoginModal();
    }
  });
  
  // 登录表单回车键提交
  DOM.loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });
  
  // 用户头像/管理员按钮
  DOM.adminBtn.addEventListener('click', handleAvatarClick);
  
  // 移动端头像按钮
  DOM.mobileAvatarBtn.addEventListener('click', handleAvatarClick);
  
  // 移动端订单按钮
  DOM.mobileOrdersBtn.addEventListener('click', handleOrdersClick);
  
  // 用户面板
  DOM.userPanelClose.addEventListener('click', closeUserPanel);
  DOM.userLogoutBtn.addEventListener('click', handleLogout);

  // 修改密码弹窗
  if (DOM.openChangePasswordBtn) {
    DOM.openChangePasswordBtn.addEventListener('click', () => {
      closeUserPanel();
      openChangePasswordModal();
    });
  }
  if (DOM.changePasswordClose) DOM.changePasswordClose.addEventListener('click', closeChangePasswordModal);
  if (DOM.changePasswordCancel) DOM.changePasswordCancel.addEventListener('click', closeChangePasswordModal);
  if (DOM.changePasswordForm) {
    DOM.changePasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitChangePassword();
    });
    // 输入时清除对应字段的错误提示
    [DOM.oldPasswordInput, DOM.newPasswordInput, DOM.confirmPasswordInput].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        const group = input.closest('.form-group');
        if (group) group.classList.remove('has-error');
        input.classList.remove('has-error');
        const errEl = document.getElementById(input.id + '-error');
        if (errEl) errEl.textContent = '';
      });
    });
    // ESC 关闭
    DOM.changePasswordModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeChangePasswordModal();
    });
  }
  
  // 管理员面板
  DOM.adminClose.addEventListener('click', closeAdminPanel);
  DOM.adminLogoutBtn.addEventListener('click', handleLogout);
  
  // 编辑菜品按钮
  DOM.editDishBtn.addEventListener('click', toggleEditMode);
  
  // 编辑菜品弹窗
  DOM.editDishClose.addEventListener('click', closeEditDishModal);
  DOM.editDishCancel.addEventListener('click', closeEditDishModal);
  DOM.editDishForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveDishEdit();
  });
  
  // 新增菜品弹窗
  DOM.addDishClose.addEventListener('click', closeAddDishModal);
  DOM.addDishCancel.addEventListener('click', closeAddDishModal);
  DOM.addDishForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAddDish();
  });
  
  // 新增菜品按钮
  DOM.addDishBtn.addEventListener('click', openAddDishModal);
  
  // 运维管理
  if (DOM.opsBtn) {
    DOM.opsBtn.addEventListener('click', openOpsModal);
  }
  if (DOM.opsClose) {
    DOM.opsClose.addEventListener('click', closeOpsModal);
  }
  if (DOM.opsModal) {
    DOM.opsModal.addEventListener('click', (e) => {
      if (e.target === DOM.opsModal) {
        closeOpsModal();
      }
    });
  }
  
  // 运维标签切换
  if (DOM.opsTabs) {
    DOM.opsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchOpsTab(target);
      });
    });
  }
  
  // 数据库测试
  if (DOM.dbTestBtn) {
    DOM.dbTestBtn.addEventListener('click', testDatabase);
  }
  
  // 密码重置
  if (DOM.opsResetPwdBtn) {
    DOM.opsResetPwdBtn.addEventListener('click', resetUserPassword);
  }
  
  // 接口测试
  if (DOM.opsApiTestBtn) {
    DOM.opsApiTestBtn.addEventListener('click', testApi);
  }
  
  // 窗口大小变化
  window.addEventListener('resize', () => {
    // 重新初始化移动端滚动条
    initMobileTagsScroll();
  });
}

// ==================== 初始化 ====================

/**
 * 初始化应用
 */
async function initApp() {
  try {
    // 恢复登录状态
    loadUserFromStorage();
    
    // 如果用户已登录，从后端获取最新的用户信息（包括余额）
    if (AppState.currentUser) {
      try {
        const userResponse = await apiRequest('/api/user');
        if (userResponse.success && userResponse.user) {
          AppState.currentUser = userResponse.user;
          saveUserToStorage(userResponse.user);
          updateUserUI();
          console.log('用户信息已更新:', AppState.currentUser);
        }
      } catch (e) {
        console.log('获取用户信息失败，可能是session已失效:', e.message);
        if (e.status === 401) {
          AppState.currentUser = null;
          localStorage.removeItem('currentUser');
          updateUserUI();
        }
      }
    }
    
    // 显示加载中
    DOM.loading.textContent = '加载中...';
    
    // 加载标签
    const tagsData = await fetchTags();
    AppState.tags = tagsData || [];
    
    // 构建标签树
    AppState.tagTree = buildTagTree(AppState.tags);
    
    // 加载菜品（懒加载模式）
    await filterDishes();
    
    console.log('加载成功 - 标签:', AppState.tags.length, '一级分类:', AppState.tagTree.length, '总菜品:', AppState.totalDishes);
    
    // 加载每日推荐（同一天稳定显示同一道菜）
    loadDailyRecommend();
    
    // 渲染UI
    renderCategories();
    
    // 绑定菜品卡片事件
    bindDishCardEvents();
    
    // 异步更新各分类菜品数量
    updateCategoryCounts();
    
    // 绑定事件
    bindEvents();
    
    // 默认展开第一个有子标签的分类（仅 PC 端展开二级菜单，不激活）
    const firstParent = AppState.tagTree.find(t => t.children.length > 0);
    if (firstParent) {
      if (AppState.isMobile()) {
        // 移动端：默认"全部菜品"被选中，不显示任何二级标签面板
        // 隐藏二级面板，确保 "全部菜品" 是唯一的激活状态
        hideMobileSubPanel();
        document.querySelectorAll('.category-header').forEach(h => {
          if (h.dataset.category !== 'all') {
            h.classList.remove('active');
          } else {
            h.classList.add('active');
          }
        });
      } else {
        // 桌面端：展开第一个一级分类
        AppState.expandedCategories[firstParent.id] = true;
        const header = document.querySelector(`.category-header[data-parent-id="${firstParent.id}"]`);
        const subMenu = document.querySelector(`.sub-categories[data-parent-id="${firstParent.id}"]`);
        if (header) header.classList.add('expanded');
        if (subMenu) subMenu.classList.add('open');
      }
    }
    
    // 初始化移动端滚动条
    initMobileTagsScroll();
    
    // 初始化购物车UI
    updateCartUI();
    
  } catch (error) {
    console.error('初始化失败:', error);
    DOM.loading.textContent = '加载失败，请刷新页面重试';
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
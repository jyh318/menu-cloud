// ============ 管理员模块 ============

// ==================== 用户面板与管理员模式 ====================

/**
 * 点击用户头像/管理员按钮
 */
function handleAvatarClick() {
  if (!isLoggedIn()) {
    openLoginModal();
    return;
  }
  
  if (AppState.currentUser.is_admin) {
    toggleAdminPanel();
  } else {
    toggleUserPanel();
  }
}

/**
 * 切换用户面板
 */
function toggleUserPanel() {
  if (DOM.userPanel.classList.contains('active')) {
    closeUserPanel();
  } else {
    openUserPanel();
  }
}

/**
 * 打开用户面板
 */
function openUserPanel() {
  if (AppState.currentUser) {
    DOM.userAvatarLarge.textContent = AppState.currentUser.username.charAt(0);
    DOM.userName.textContent = AppState.currentUser.username;
    DOM.userId.textContent = `用户ID: ${AppState.currentUser.id}`;
    DOM.userBalance.textContent = `¥${AppState.currentUser.balance.toFixed(2)}`;
  }
  DOM.userPanel.classList.add('active');
}

/**
 * 关闭用户面板
 */
function closeUserPanel() {
  DOM.userPanel.classList.remove('active');
}

/**
 * 打开修改密码弹窗
 */
function openChangePasswordModal() {
  if (!DOM.changePasswordModal) return;
  clearChangePasswordErrors();
  DOM.changePasswordForm.reset();
  DOM.changePasswordModal.classList.add('active');
  // 自动聚焦到历史密码
  setTimeout(() => { if (DOM.oldPasswordInput) DOM.oldPasswordInput.focus(); }, 50);
}

/**
 * 关闭修改密码弹窗
 */
function closeChangePasswordModal() {
  if (!DOM.changePasswordModal) return;
  DOM.changePasswordModal.classList.remove('active');
  clearChangePasswordErrors();
}

/**
 * 清除修改密码表单的所有错误提示
 */
function clearChangePasswordErrors() {
  if (!DOM.changePasswordForm) return;
  DOM.changePasswordForm.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
  if (DOM.oldPasswordError) DOM.oldPasswordError.textContent = '';
  if (DOM.newPasswordError) DOM.newPasswordError.textContent = '';
  if (DOM.confirmPasswordError) DOM.confirmPasswordError.textContent = '';
  [DOM.oldPasswordInput, DOM.newPasswordInput, DOM.confirmPasswordInput].forEach(input => {
    if (input) input.classList.remove('has-error');
  });
}

/**
 * 在指定字段上显示错误
 * @param {'old_password'|'new_password'|'confirm_password'} field
 * @param {string} message
 */
function setFieldError(field, message) {
  const map = {
    old_password: { input: DOM.oldPasswordInput, err: DOM.oldPasswordError },
    new_password: { input: DOM.newPasswordInput, err: DOM.newPasswordError },
    confirm_password: { input: DOM.confirmPasswordInput, err: DOM.confirmPasswordError }
  };
  const m = map[field];
  if (!m) return;
  if (m.err) m.err.textContent = message || '';
  if (m.input) {
    m.input.classList.add('has-error');
    const group = m.input.closest('.form-group');
    if (group) group.classList.add('has-error');
  }
}

/**
 * 前端校验修改密码表单
 * @returns {string[]} 需要高亮的错误字段数组
 */
function validateChangePasswordForm() {
  const errors = {};
  const oldPwd = (DOM.oldPasswordInput?.value || '').trim();
  const newPwd = (DOM.newPasswordInput?.value || '').trim();
  const confirmPwd = (DOM.confirmPasswordInput?.value || '').trim();

  if (!oldPwd) errors.old_password = '请输入历史密码';
  if (!newPwd) errors.new_password = '请输入新密码';
  else if (newPwd.length < 4) errors.new_password = '新密码至少需要 4 位';
  if (!confirmPwd) errors.confirm_password = '请再次输入新密码';

  if (newPwd && newPwd === oldPwd) {
    errors.new_password = '新密码不能与历史密码相同';
  }

  if (newPwd && confirmPwd && newPwd !== confirmPwd) {
    errors.confirm_password = '两次输入的新密码不一致';
  }

  Object.keys(errors).forEach(k => setFieldError(k, errors[k]));
  return errors;
}

/**
 * 提交修改密码请求
 */
async function submitChangePassword() {
  const errors = validateChangePasswordForm();
  if (Object.keys(errors).length > 0) {
    // 聚焦到第一个错误字段
    const firstKey = Object.keys(errors)[0];
    const map = { old_password: DOM.oldPasswordInput, new_password: DOM.newPasswordInput, confirm_password: DOM.confirmPasswordInput };
    if (map[firstKey]) map[firstKey].focus();
    return;
  }

  const oldPwd = DOM.oldPasswordInput.value.trim();
  const newPwd = DOM.newPasswordInput.value.trim();
  const confirmPwd = DOM.confirmPasswordInput.value.trim();
  const submitBtn = document.getElementById('change-password-submit');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
  }

  try {
    const data = await apiRequest('/api/user/password', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPwd,
        new_password: newPwd,
        confirm_password: confirmPwd
      })
    });

    if (data.success) {
      showToast('密码修改成功');
      closeChangePasswordModal();
    } else {
      if (data.errors) {
        Object.keys(data.errors).forEach(k => setFieldError(k, data.errors[k]));
      }
      if (!data.errors) {
        showToast(data.message || '密码修改失败');
      }
    }
  } catch (e) {
    if (e && e.errors) {
      Object.keys(e.errors).forEach(k => setFieldError(k, e.errors[k]));
    }
    showToast(e.message || '密码修改失败');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '确认修改';
    }
  }
}

/**
 * 切换管理员面板
 */
function toggleAdminPanel() {
  if (DOM.adminPanel.classList.contains('active')) {
    closeAdminPanel();
  } else {
    openAdminPanel();
  }
}

/**
 * 打开新增菜品弹窗
 */
function openAddDishModal() {
  DOM.addDishModal.classList.add('active');
  DOM.addDishName.value = '';
  DOM.addDishPrice.value = '';
  DOM.addDishImage.value = '';
  DOM.addDishDescription.value = '';
  DOM.addDishDetail.value = '';
  DOM.addDishIngredients.value = '';
  DOM.addDishMethod.value = '';
  DOM.addDishTags.value = '';
}

/**
 * 关闭新增菜品弹窗
 */
function closeAddDishModal() {
  DOM.addDishModal.classList.remove('active');
}

/**
 * 保存新增菜品
 */
async function saveAddDish() {
  const name = DOM.addDishName.value.trim();
  const price = parseFloat(DOM.addDishPrice.value);
  
  if (!name) {
    alert('请输入菜品名称');
    return;
  }
  
  if (isNaN(price) || price <= 0) {
    alert('请输入有效的价格');
    return;
  }
  
  const dishData = {
    name: name,
    price: price,
    image: DOM.addDishImage.value.trim() || './img/鲜椒兔.jpg',
    description: DOM.addDishDescription.value,
    detail_desc: DOM.addDishDetail.value,
    ingredients: DOM.addDishIngredients.value,
    method: DOM.addDishMethod.value,
    tags: DOM.addDishTags.value
  };
  
  try {
    console.log('新增菜品数据:', dishData);
    const response = await apiRequest('/api/dishes', {
      method: 'POST',
      body: JSON.stringify(dishData)
    });
    console.log('新增菜品成功:', response);
    
    // 重新加载当前分类的菜品
    await filterDishes();
    closeAddDishModal();
  } catch (error) {
    console.error('新增菜品失败:', error);
    console.error('错误详情:', error.message, error);
    alert(`新增菜品失败: ${error.message || '请检查网络连接或重试'}`);
  }
}

/**
 * 打开管理员面板
 */
function openAdminPanel() {
  AppState.isAdmin = true;
  DOM.adminPanel.classList.add('active');
}

/**
 * 关闭管理员面板
 */
function closeAdminPanel() {
  AppState.isAdmin = false;
  DOM.adminPanel.classList.remove('active');
}

/**
 * 切换编辑模式
 */
function toggleEditMode() {
  AppState.editMode = !AppState.editMode;
  
  if (AppState.editMode) {
    DOM.editDishBtn.classList.add('active');
    closeAdminPanel();
  } else {
    DOM.editDishBtn.classList.remove('active');
  }
  
  renderDishes();
  
  // 重新渲染每日推荐以显示/隐藏编辑按钮
  const currentDailyDish = getCurrentDailyRecommendDish();
  if (currentDailyDish) {
    renderDailyRecommend(currentDailyDish);
  }
}

/**
 * 获取当前每日推荐菜品
 */
function getCurrentDailyRecommendDish() {
  const card = document.getElementById('daily-recommend-card');
  if (!card || !card.dataset.dishId) return null;
  const dishId = card.dataset.dishId;
  // 优先使用已加载的菜品列表中的完整数据
  const dish = AppState.dishes.find(d => d.id == dishId)
    || AppState.filteredDishes.find(d => d.id == dishId);
  if (dish) return dish;

  // 回退方案：直接从卡片 DOM 读取必要信息，构造一个临时 dish 对象
  // （用于随机每日推荐、未完整加载时的场景）
  const nameEl = card.querySelector('.dr-name');
  const priceEl = card.querySelector('.dr-price');
  const imgEl = card.querySelector('.dr-image img');
  const imgPlaceholder = card.querySelector('.dr-image-placeholder');

  if (!nameEl) return null;

  const priceText = (priceEl?.textContent || '').replace(/[^\d.]/g, '');
  // 标签列表
  const tagDetails = Array.from(card.querySelectorAll('.dr-tag')).map(span => ({
    name: span.textContent.trim(),
    background_color: span.style.background || '',
    text_color: span.style.color || '#fff'
  }));

  return {
    id: Number(dishId),
    name: nameEl.textContent.trim(),
    price: priceText ? Number(priceText) : 0,
    image: imgEl ? imgEl.src : (imgPlaceholder ? '' : ''),
    tag_details: tagDetails,
    description: '',
    detail_description: ''
  };
}

/**
 * 打开编辑菜品弹窗
 * @param {number} dishId - 菜品ID
 */
function openEditDishModal(dishId) {
  const dish = findDish(dishId);
  if (!dish) return;
  
  DOM.editDishName.value = dish.name || '';
  DOM.editDishPrice.value = dish.price || '';
  DOM.editDishImage.value = dish.image || '';
  DOM.editDishDescription.value = dish.description || '';
  DOM.editDishDetail.value = dish.detail_desc || '';
  DOM.editDishIngredients.value = dish.ingredients || '';
  DOM.editDishMethod.value = dish.method || '';
  DOM.editDishTags.value = dish.tags || '';
  
  DOM.editDishModal.dataset.dishId = dishId;
  DOM.editDishModal.classList.add('active');
}

/**
 * 关闭编辑菜品弹窗
 */
function closeEditDishModal() {
  DOM.editDishModal.classList.remove('active');
  DOM.editDishForm.reset();
}

/**
 * 保存菜品修改
 */
async function saveDishEdit() {
  const dishId = parseInt(DOM.editDishModal.dataset.dishId);
  if (!dishId) return;
  
  const dishData = {
    name: DOM.editDishName.value,
    price: parseFloat(DOM.editDishPrice.value),
    image: DOM.editDishImage.value,
    description: DOM.editDishDescription.value,
    detail_desc: DOM.editDishDetail.value,
    ingredients: DOM.editDishIngredients.value,
    method: DOM.editDishMethod.value,
    tags: DOM.editDishTags.value
  };
  
  try {
    await apiRequest(`/api/dishes/${dishId}`, {
      method: 'PUT',
      body: JSON.stringify(dishData)
    });
    
    // 重新加载当前分类的菜品
    await filterDishes();
    closeEditDishModal();
  } catch (error) {
    console.error('保存菜品失败:', error);
    alert(`保存菜品失败: ${error.message || '请检查网络连接或重试'}`);
  }
}

/**
 * 删除菜品
 * @param {number} dishId - 菜品ID
 */
function showConfirm(title, message) {
  return new Promise((resolve) => {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    DOM.confirmModal.classList.add('active');
    
    const handleOk = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      DOM.confirmModal.classList.remove('active');
      DOM.confirmOk.removeEventListener('click', handleOk);
      DOM.confirmCancel.removeEventListener('click', handleCancel);
    };
    
    DOM.confirmOk.addEventListener('click', handleOk);
    DOM.confirmCancel.addEventListener('click', handleCancel);
  });
}

async function deleteDish(dishId) {
  const dish = findDish(dishId);
  if (!dish) return;
  
  const confirmed = await showConfirm('确认删除', `确定要删除菜品「${dish.name}」吗？此操作不可恢复。`);
  
  if (!confirmed) {
    return;
  }
  
  try {
    await apiRequest(`/api/dishes/${dishId}`, {
      method: 'DELETE'
    });
    
    // 重新加载当前分类的菜品
    await filterDishes();
  } catch (error) {
    console.error('删除菜品失败:', error);
    alert('删除菜品失败，请重试');
  }
}

/**
 * 执行退出登录
 */
async function handleLogout() {
  try {
    await apiRequest('/api/logout', { method: 'POST' });
    AppState.currentUser = null;
    localStorage.removeItem('currentUser');
    AppState.isAdmin = false;
    AppState.editMode = false;
    closeUserPanel();
    closeAdminPanel();
    closeEditDishModal();
    if (DOM.editDishBtn) {
      DOM.editDishBtn.classList.remove('active');
    }
    updateUserUI();
    renderDishes();
  } catch (error) {
    console.error('退出登录失败:', error);
  }
}
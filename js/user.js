// ============ 用户与订单模块 ============

// ==================== 用户登录 ====================

/**
 * 打开登录弹窗
 */
function openLoginModal() {
  DOM.loginModal.classList.add('active');
  DOM.loginUsername.value = '';
  DOM.loginPassword.value = '';
  DOM.loginError.textContent = '';
  setTimeout(() => DOM.loginUsername.focus(), 100);
}

/**
 * 关闭登录弹窗
 */
function closeLoginModal() {
  DOM.loginModal.classList.remove('active');
}

/**
 * 检查用户是否已登录
 * @returns {boolean}
 */
function isLoggedIn() {
  return AppState.currentUser !== null;
}

function saveUserToStorage(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function loadUserFromStorage() {
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      AppState.currentUser = JSON.parse(stored);
      updateUserUI();
    } catch (e) {
      console.error('解析用户信息失败:', e);
      localStorage.removeItem('currentUser');
    }
  }
}

/**
 * 执行登录
 */
async function handleLogin() {
  const username = DOM.loginUsername.value.trim();
  const password = DOM.loginPassword.value.trim();
  
  if (!username || !password) {
    DOM.loginError.textContent = '请输入用户名和密码';
    return;
  }
  
  try {
    const response = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.success) {
      AppState.currentUser = response.user;
      saveUserToStorage(response.user);
      closeLoginModal();
      updateUserUI();
    } else {
      DOM.loginError.textContent = response.message || '登录失败';
    }
  } catch (error) {
    console.error('登录失败:', error);
    DOM.loginError.textContent = '登录失败，请稍后重试';
  }
}

/**
 * 更新用户UI（头像等）
 */
function updateUserUI() {
  const isLoggedIn = AppState.currentUser !== null;
  const displayName = isLoggedIn ? (AppState.currentUser.username || AppState.currentUser.name || '用') : null;
  
  if (DOM.adminBtn) {
    if (isLoggedIn) {
      DOM.adminBtn.classList.remove('logged-out');
      DOM.adminAvatarText.textContent = displayName.charAt(0);
    } else {
      DOM.adminBtn.classList.add('logged-out');
    }
  }
  
  if (DOM.mobileAvatarBtn) {
    if (isLoggedIn) {
      DOM.mobileAvatarBtn.classList.remove('logged-out');
      DOM.mobileAvatarText.textContent = displayName.charAt(0);
    } else {
      DOM.mobileAvatarBtn.classList.add('logged-out');
    }
  }
}

/**
 * 点击订单按钮
 */
function handleOrdersClick() {
  if (!isLoggedIn()) {
    openLoginModal();
    return;
  }
  window.location.href = 'orders.html';
}

// ==================== 订单结算 ====================

/**
 * 结算订单
 */
async function handleCheckout() {
  if (!isLoggedIn()) {
    closeCartSidebar();
    openLoginModal();
    return;
  }
  if (AppState.cart.length === 0) {
    alert('购物车是空的');
    return;
  }
  
  const total = calculateTotal();
  
  // 检查用户余额是否足够
  if (AppState.currentUser && AppState.currentUser.balance < total) {
    alert(`余额不足！当前余额: ¥${AppState.currentUser.balance.toFixed(2)}，订单金额: ¥${total.toFixed(2)}`);
    return;
  }
  
  const note = DOM.cartNoteInput ? DOM.cartNoteInput.value.trim() : '';
  const items = AppState.cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));
  
  try {
    // 创建订单（包含备注）
    const orderResult = await createOrder({ items, total, note });
    console.log('订单创建成功:', orderResult);
    
    // 结算订单
    const checkoutResult = await checkoutOrder(orderResult.order_number);
    console.log('订单结算成功:', checkoutResult);
    
    // 更新用户余额
    if (AppState.currentUser) {
      AppState.currentUser.balance = Math.max(0, AppState.currentUser.balance - total);
      saveUserToStorage(AppState.currentUser);
      console.log('用户余额更新:', AppState.currentUser.balance);
    }
    
    // 构建订单数据用于小票展示
    const orderData = {
      '订单详情': items.map(item => ({
        '名称': item.name,
        '数量': item.quantity,
        '单价': item.price,
        '小计金额': (item.price * item.quantity).toFixed(2)
      })),
      '合计金额': total.toFixed(2),
      '备注': note,
      '订单编号': orderResult.order_number
    };
    
    // 清空购物车
    AppState.cart = [];
    updateCartUI();
    closeCartSidebar();
    
    // 跳转到小票页面
    const orderJson = encodeURIComponent(JSON.stringify(orderData));
    window.location.href = `receipt.html?order=${orderJson}`;
    
  } catch (error) {
    console.error('结算失败:', error);
    alert('结算失败：' + (error.message || '未知错误'));
  }
}
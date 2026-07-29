// ============ 购物车模块 ============

// ==================== 购物车功能 ====================

/**
 * 添加菜品到购物车
 * @param {number} dishId - 菜品ID
 */
function addToCart(dishId) {
  const dish = findDish(dishId);
  if (!dish) return;
  
  const existingItem = AppState.cart.find(item => item.id === dishId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    AppState.cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image: dish.image,
      quantity: 1
    });
  }
  
  updateCartUI();
}

/**
 * 从购物车减少菜品数量
 * @param {number} dishId - 菜品ID
 */
function removeFromCart(dishId) {
  const index = AppState.cart.findIndex(item => item.id === dishId);
  if (index === -1) return;
  
  if (AppState.cart[index].quantity > 1) {
    AppState.cart[index].quantity -= 1;
  } else {
    AppState.cart.splice(index, 1);
  }
  
  updateCartUI();
}

/**
 * 从购物车移除整个菜品
 * @param {number} dishId - 菜品ID
 */
function deleteFromCart(dishId) {
  const index = AppState.cart.findIndex(item => item.id === dishId);
  if (index !== -1) {
    AppState.cart.splice(index, 1);
    updateCartUI();
  }
}

/**
 * 计算购物车总价
 * @returns {number} 总价
 */
function calculateTotal() {
  return AppState.cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

/**
 * 计算购物车总数量
 * @returns {number} 总数量
 */
function calculateCartCount() {
  return AppState.cart.reduce((count, item) => count + item.quantity, 0);
}

/**
 * 更新购物车UI
 */
function updateCartUI() {
  const count = calculateCartCount();
  const total = calculateTotal();
  
  // 更新浮动购物车数量
  DOM.cartCount.textContent = count;
  
  // 更新总价
  DOM.totalAmount.textContent = `¥${total.toFixed(2)}`;
  
  // 渲染购物车列表
  if (AppState.cart.length === 0) {
    DOM.cartEmpty.style.display = 'block';
    DOM.cartItems.innerHTML = '<div class="cart-empty" id="cart-empty">购物车是空的</div>';
    return;
  }
  
  DOM.cartItems.innerHTML = AppState.cart.map(item => {
    const imageSrc = getDishImage(item.image);
    return `
      <div class="cart-item" data-cart-id="${item.id}">
        ${imageSrc ? `<img class="cart-item-image" src="${imageSrc}" alt="${item.name}">` : '<!-- 待补充图片链接 -->'}
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">¥${item.price}</div>
        </div>
        <div class="cart-item-quantity">
          <button class="quantity-btn" onclick="removeFromCart(${item.id})">−</button>
          <span class="quantity-text">${item.quantity}</span>
          <button class="quantity-btn" onclick="addToCart(${item.id})">+</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 打开购物车侧边栏
 */
function openCartSidebar() {
  DOM.cartSidebar.classList.add('active');
}

/**
 * 关闭购物车侧边栏
 */
function closeCartSidebar() {
  DOM.cartSidebar.classList.remove('active');
}
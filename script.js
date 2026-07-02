/* ========================================
 * 小贾私房菜 - 前端主脚本
 * 功能：菜品加载、分类筛选（一二级标签）、搜索、购物车、订单结算、管理员模式
 * 后端接口：/api/dishes, /api/tags, /api/order
 * ======================================== */

// ==================== 全局状态管理 ====================
const AppState = {
  dishes: [],               // 所有菜品列表
  filteredDishes: [],       // 筛选后的菜品列表
  tags: [],                 // 所有标签列表（扁平结构）
  tagTree: [],              // 标签树结构（一级+二级）
  currentTag: 'all',        // 当前选中的分类标签
  expandedCategories: {},   // 展开的一级分类
  searchKeyword: '',        // 搜索关键词
  cart: [],                 // 购物车 [{id, name, price, quantity, image}]
  isAdmin: false,           // 是否管理员模式
  isMobile: () => window.innerWidth <= 480
};

// ==================== DOM 元素引用 ====================
const DOM = {
  foodGrid: document.getElementById('food-grid'),
  loading: document.getElementById('loading'),
  categoryList: document.getElementById('category-list'),
  allCount: document.getElementById('all-count'),
  dishCount: document.getElementById('dish-count'),
  dishCountTag: document.getElementById('dish-count-tag'),
  searchBtn: document.getElementById('search-btn'),
  mobileSearchBtn: document.getElementById('mobile-search-btn'),
  searchModal: document.getElementById('search-modal'),
  searchInput: document.getElementById('search-input'),
  searchClose: document.getElementById('search-close'),
  dishModal: document.getElementById('dish-modal'),
  dishDetail: document.getElementById('dish-detail'),
  modalClose: document.getElementById('modal-close'),
  floatingCart: document.getElementById('floating-cart'),
  cartCount: document.getElementById('cart-count'),
  cartSidebar: document.getElementById('cart-sidebar'),
  cartClose: document.getElementById('cart-close'),
  cartItems: document.getElementById('cart-items'),
  cartEmpty: document.getElementById('cart-empty'),
  totalAmount: document.getElementById('total-amount'),
  checkoutButton: document.getElementById('checkout-button'),
  adminBtn: document.getElementById('admin-btn'),
  adminPanel: document.getElementById('admin-panel'),
  adminClose: document.getElementById('admin-close'),
  addDishBtn: document.getElementById('add-dish-btn'),
  mobileSubPanel: document.getElementById('mobileSubPanel'),
  sidebar: document.querySelector('.sidebar')
};

// ==================== API 请求函数 ====================

/**
 * 通用请求函数
 * @param {string} url - 请求地址
 * @param {object} options - 请求配置
 * @returns {Promise<any>} 返回数据
 */
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

/**
 * 获取菜品列表
 * @param {object} params - 查询参数 { tag, search, page, page_size }
 * @returns {Promise<object>} 菜品列表数据
 */
async function fetchDishes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `/api/dishes${query ? '?' + query : ''}`;
  return apiRequest(url);
}

/**
 * 获取所有标签列表
 * @returns {Promise<Array>} 标签列表
 */
async function fetchTags() {
  return apiRequest('/api/tags');
}

/**
 * 创建订单
 * @param {object} orderData - 订单数据 { items, total, note }
 * @returns {Promise<object>} 订单结果
 */
async function createOrder(orderData) {
  return apiRequest('/api/order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

/**
 * 结算订单
 * @param {string} orderId - 订单编号
 * @returns {Promise<object>} 结算结果
 */
async function checkoutOrder(orderId) {
  return apiRequest(`/api/order/${orderId}/checkout`, {
    method: 'POST'
  });
}

// ==================== 图片路径处理 ====================

/**
 * 获取菜品图片路径
 * 优先使用 img/ 文件夹中的图片，如果不存在则返回空字符串
 * 注意：自动处理数据库中已包含 ./img/ 或 img/ 前缀的情况
 * @param {string} imageName - 图片名称或路径
 * @returns {string} 完整图片路径
 */
function getDishImage(imageName) {
  if (!imageName) return '';
  
  // 如果已经是完整URL路径，直接返回
  if (imageName.startsWith('http')) {
    return imageName;
  }

  // 添加正确的 img/ 前缀
  return `${imageName}`;
}

// ==================== 标签树构建 ====================

/**
 * 构建标签树结构（一级标签 + 二级子标签）
 * @param {Array} tags - 扁平的标签列表
 * @returns {Array} 标签树
 */
function buildTagTree(tags) {
  // 找出所有一级标签（parentid 为 null）
  const parentTags = tags.filter(t => !t.parentid);
  
  // 为每个一级标签添加子标签
  return parentTags.map(parent => ({
    ...parent,
    children: tags.filter(t => t.parentid === parent.id)
  }));
}

/**
 * 获取标签对应的图标（emoji）
 * @param {string} tagName - 标签名称
 * @returns {string} emoji图标
 */
function getTagIcon(tagName) {
  const iconMap = {
    '菜系': '🍴',
    '做法': '👨‍🍳',
    '味道': '🌶️',
    '品类': '🥗',
    '其他': '📋',
    '本店推荐': '🔥',
    '热菜': '🍲',
    '凉菜': '🥗',
    '主食': '🍚',
    '汤品': '🍜',
    '川菜': '🌶️',
    '粤菜': '🥢',
    '甜品': '🍰',
    '饮品': '🥤',
    '热销': '🔥',
    '新品': '✨',
    '招牌': '⭐',
    '素食': '🥬',
    '寿司·刺身': '🍣',
    '面类·锅物': '🍜',
    '烧烤·炸物': '🍢'
  };
  return iconMap[tagName] || '🍽️';
}

// ==================== 菜品卡片渲染 ====================

/**
 * 渲染菜品卡片
 * @param {object} dish - 菜品数据
 * @returns {string} HTML字符串
 */
function renderDishCard(dish) {
  const imageSrc = getDishImage(dish.image);
  const tags = dish.tag_details || [];
  const tagHtml = tags.slice(0, 2).map(tag => 
    `<span class="card-tag" style="background:${tag.background_color || 'var(--surface)'};color:${tag.text_color || 'var(--text-muted)'}">${tag.name}</span>`
  ).join('');

  return `
    <div class="food-card" data-dish-id="${dish.id}">
      <div class="card-image">
        ${imageSrc ? `<img src="${imageSrc}" alt="${dish.name}" loading="lazy">` : '<!-- 待补充图片链接 -->'}
        ${tags.some(t => t.name === '热销') ? '<span class="card-badge badge-hot">热销</span>' : ''}
        ${tags.some(t => t.name === '新品') ? '<span class="card-badge badge-new">新品</span>' : ''}
        ${tags.some(t => t.name === '招牌') ? '<span class="card-badge badge-chef">主厨推荐</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <div>
            <div class="card-name">${dish.name}</div>
          </div>
          <div class="card-price">${dish.price}</div>
        </div>
        <div class="card-desc">${dish.description || ''}</div>
        <div class="card-footer">
          <div class="card-tags">${tagHtml}</div>
          <button class="add-btn" data-add-id="${dish.id}" aria-label="加入购物车">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染所有菜品卡片到网格中
 */
function renderDishes() {
  const dishes = AppState.filteredDishes;
  
  // 更新菜品数量
  DOM.dishCount.textContent = dishes.length;
  const allCountEl = document.getElementById('all-count');
  if (allCountEl) {
    allCountEl.textContent = AppState.dishes.length;
  }
  
  if (dishes.length === 0) {
    DOM.foodGrid.innerHTML = '<div class="loading">暂无菜品</div>';
    return;
  }
  
  DOM.foodGrid.innerHTML = dishes.map(dish => renderDishCard(dish)).join('');
  
  // 绑定卡片点击事件
  bindDishCardEvents();
}

/**
 * 绑定菜品卡片的交互事件
 */
function bindDishCardEvents() {
  // 菜品卡片点击 - 查看详情
  document.querySelectorAll('.food-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-btn')) return;
      const dishId = parseInt(card.dataset.dishId);
      showDishDetail(dishId);
    });
  });
  
  // 添加按钮点击 - 加入购物车
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dishId = parseInt(btn.dataset.addId);
      addToCart(dishId);
      
      // 按钮动画反馈
      btn.style.transform = 'scale(0.85)';
      setTimeout(() => { btn.style.transform = 'scale(1.08)'; }, 100);
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 250);
    });
  });
}

// ==================== 分类/标签管理（一二级结构） ====================

/**
 * 计算每个标签的菜品数量
 * @param {string} tagName - 标签名称
 * @returns {number} 菜品数量
 */
function getTagDishCount(tagName) {
  let count = 0;
  AppState.dishes.forEach(dish => {
    const dishTags = dish.tags ? dish.tags.split(',').map(t => t.trim()) : [];
    if (dishTags.includes(tagName)) {
      count++;
    }
  });
  return count;
}

/**
 * 渲染分类侧边栏（一二级结构）
 */
function renderCategories() {
  const tagTree = AppState.tagTree;
  
  // 生成分类HTML
  let categoryHtml = '';
  
  // 第一项：全部菜品
  const allCount = AppState.dishes.length;
  const isAllActive = !AppState.currentTag;
  categoryHtml += `
    <div class="menu-category" style="animation-delay: 0.05s">
      <div class="category-header ${isAllActive ? 'active' : ''}" data-category="all">
        <div class="category-left">
          <div class="category-icon">🔥</div>
          <span class="category-name">全部菜品</span>
        </div>
        <span class="category-count" id="all-count">${allCount}</span>
      </div>
    </div>
  `;
  
  tagTree.forEach((parent, pIndex) => {
    if (parent.children.length === 0) return;
    
    const isExpanded = AppState.expandedCategories[parent.id] !== false;
    
    categoryHtml += `
      <div class="menu-category" style="animation-delay: ${0.05 * (pIndex + 2)}s">
        <div class="category-header ${isExpanded ? 'expanded' : ''}" data-parent-id="${parent.id}">
          <div class="category-left">
            <div class="category-icon">${getTagIcon(parent.name)}</div>
            <span class="category-name">${parent.name}</span>
          </div>
          <span class="category-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
        <div class="sub-categories ${isExpanded ? 'open' : ''}" data-parent-id="${parent.id}">
          ${parent.children.map(child => {
            const count = getTagDishCount(child.name);
            const isActive = AppState.currentTag === child.name;
            return `
              <div class="sub-category ${isActive ? 'active' : ''}" data-tag="${child.name}" style="animation-delay: 0.02s">
                <span class="sub-category-dot" style="background:${child.background_color || '#ccc'}"></span>
                <span class="sub-category-name">${child.name}</span>
                <span class="sub-category-count">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  
  DOM.categoryList.innerHTML = categoryHtml;
  
  // 绑定分类点击事件
  bindCategoryEvents();
}

/**
 * 绑定分类点击事件
 */
function bindCategoryEvents() {
  // 全部菜品点击
  const allHeader = document.querySelector('.category-header[data-category="all"]');
  if (allHeader) {
    allHeader.addEventListener('click', () => {
      selectCategory('all');
    });
  }
  
  // 一级分类点击 - 展开/折叠
  document.querySelectorAll('.category-header[data-parent-id]').forEach(header => {
    header.addEventListener('click', () => {
      const parentId = header.dataset.parentId;
      toggleCategory(parentId);
    });
  });
  
  // 二级标签点击 - 筛选菜品
  document.querySelectorAll('.sub-category[data-tag]').forEach(sub => {
    sub.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = sub.dataset.tag;
      selectCategory(tag);
    });
  });
}

/**
 * 切换一级分类的展开/折叠状态
 * 桌面端：展开/折叠二级菜单
 * 移动端：显示二级分类子面板
 * @param {string|number} parentId - 父级标签ID
 */
function toggleCategory(parentId) {
  if (AppState.isMobile()) {
    // 移动端：更新激活状态，显示二级分类子面板
    document.querySelectorAll('.category-header').forEach(h => h.classList.remove('active'));
    const activeHeader = document.querySelector(`.category-header[data-parent-id="${parentId}"]`);
    if (activeHeader) activeHeader.classList.add('active');
    
    showMobileSubPanel(parentId);
  } else {
    // 桌面端：展开/折叠二级菜单
    AppState.expandedCategories[parentId] = !AppState.expandedCategories[parentId];
    
    const header = document.querySelector(`.category-header[data-parent-id="${parentId}"]`);
    const subMenu = document.querySelector(`.sub-categories[data-parent-id="${parentId}"]`);
    
    if (header) header.classList.toggle('expanded');
    if (subMenu) subMenu.classList.toggle('open');
  }
}

/**
 * 选择分类标签（二级标签）
 * @param {string} tag - 标签名称或 'all'
 */
function selectCategory(tag) {
  AppState.currentTag = tag;
  
  // 更新激活状态
  document.querySelectorAll('.sub-category').forEach(s => s.classList.remove('active'));
  const activeSub = document.querySelector(`.sub-category[data-tag="${tag}"]`);
  if (activeSub) {
    activeSub.classList.add('active');
  }
  
  // 全部菜品按钮状态更新
  const allHeader = document.querySelector('.category-header[data-category="all"]');
  if (allHeader) {
    if (tag === 'all') {
      allHeader.classList.add('active');
    } else {
      allHeader.classList.remove('active');
    }
  }
  
  // 筛选菜品
  filterDishes();
}

/**
 * 根据当前条件筛选菜品
 */
function filterDishes() {
  let dishes = [...AppState.dishes];
  
  // 按标签筛选
  if (AppState.currentTag !== 'all') {
    dishes = dishes.filter(dish => {
      const dishTags = dish.tags ? dish.tags.split(',').map(t => t.trim()) : [];
      return dishTags.includes(AppState.currentTag);
    });
  }
  
  // 按搜索关键词筛选
  if (AppState.searchKeyword) {
    const keyword = AppState.searchKeyword.toLowerCase();
    dishes = dishes.filter(dish => 
      dish.name.toLowerCase().includes(keyword) ||
      (dish.description && dish.description.toLowerCase().includes(keyword)) ||
      String(dish.price).includes(keyword)
    );
  }
  
  AppState.filteredDishes = dishes;
  renderDishes();
}

// ==================== 搜索功能 ====================

/**
 * 打开搜索弹窗
 */
function openSearchModal() {
  DOM.searchModal.classList.add('active');
  DOM.searchInput.value = '';
  setTimeout(() => DOM.searchInput.focus(), 100);
}

/**
 * 关闭搜索弹窗
 */
function closeSearchModal() {
  DOM.searchModal.classList.remove('active');
}

/**
 * 执行搜索
 * @param {string} keyword - 搜索关键词
 */
function performSearch(keyword) {
  AppState.searchKeyword = keyword.trim();
  filterDishes();
}

// ==================== 菜品详情弹窗 ====================

/**
 * 显示菜品详情
 * @param {number} dishId - 菜品ID
 */
function showDishDetail(dishId) {
  const dish = AppState.dishes.find(d => d.id === dishId);
  if (!dish) return;
  
  const imageSrc = getDishImage(dish.image);
  const tags = dish.tag_details || [];
  const tagHtml = tags.map(tag => 
    `<span class="dish-detail-tag" style="background:${tag.background_color || 'var(--surface)'};color:${tag.text_color || 'var(--text-secondary)'}">${tag.name}</span>`
  ).join('');
  
  DOM.dishDetail.innerHTML = `
    ${imageSrc ? `<img class="dish-detail-image" src="${imageSrc}" alt="${dish.name}">` : '<!-- 待补充图片链接 -->'}
    <div class="dish-detail-body">
      <h2 class="dish-detail-name">${dish.name}</h2>
      <div class="dish-detail-price">${dish.price}</div>
      <div class="dish-detail-tags">${tagHtml}</div>
      <p class="dish-detail-desc">${dish.description || '暂无描述'}</p>
      
      ${dish.detail_desc ? `
        <div class="dish-detail-section">
          <h3 class="dish-detail-section-title">详细介绍</h3>
          <div class="dish-detail-section-content">${dish.detail_desc}</div>
        </div>
      ` : ''}
      
      ${dish.ingredients ? `
        <div class="dish-detail-section">
          <h3 class="dish-detail-section-title">主要食材</h3>
          <div class="dish-detail-section-content">${dish.ingredients}</div>
        </div>
      ` : ''}
      
      ${dish.method ? `
        <div class="dish-detail-section">
          <h3 class="dish-detail-section-title">制作方法</h3>
          <div class="dish-detail-section-content">${dish.method}</div>
        </div>
      ` : ''}
      
      <button class="dish-detail-add-btn" onclick="addToCart(${dish.id}); closeDishModal();">
        加入购物车
      </button>
    </div>
  `;
  
  DOM.dishModal.classList.add('active');
}

/**
 * 关闭菜品详情弹窗
 */
function closeDishModal() {
  DOM.dishModal.classList.remove('active');
}

// ==================== 购物车功能 ====================

/**
 * 添加菜品到购物车
 * @param {number} dishId - 菜品ID
 */
function addToCart(dishId) {
  const dish = AppState.dishes.find(d => d.id === dishId);
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

// ==================== 订单结算 ====================

/**
 * 结算订单
 */
async function handleCheckout() {
  if (AppState.cart.length === 0) {
    alert('购物车是空的');
    return;
  }
  
  const total = calculateTotal();
  const items = AppState.cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));
  
  try {
    // 创建订单
    const orderResult = await createOrder({ items, total });
    console.log('订单创建成功:', orderResult);
    
    // 结算订单
    const checkoutResult = await checkoutOrder(orderResult.order_number);
    console.log('订单结算成功:', checkoutResult);
    
    alert(`下单成功！\n订单编号：${orderResult.order_number}\n总价：¥${total.toFixed(2)}`);
    
    // 清空购物车
    AppState.cart = [];
    updateCartUI();
    closeCartSidebar();
    
  } catch (error) {
    console.error('结算失败:', error);
    alert('结算失败：' + (error.message || '未知错误'));
  }
}

// ==================== 管理员模式 ====================

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
  
  const parentTag = AppState.tagTree.find(t => t.id === parentId);
  if (!parentTag || !parentTag.children || parentTag.children.length === 0) {
    hideMobileSubPanel();
    return;
  }
  
  // 构建二级标签chips
  const chipsHtml = parentTag.children.map(child => {
    const isActive = AppState.currentTag === child.name;
    return `
      <span class="sub-chip ${isActive ? 'active' : ''}" data-mobile-tag="${child.name}"
        style="background:${isActive ? child.background_color : 'var(--surface)'};
               color:${isActive ? child.text_color : 'var(--text-secondary)'};
               border-color:${isActive ? child.background_color : 'var(--border)'}">
        ${child.name}
      </span>
    `;
  }).join('');
  
  DOM.mobileSubPanel.innerHTML = chipsHtml;
  
  // 绑定chip点击事件
  DOM.mobileSubPanel.querySelectorAll('.sub-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.mobileTag;
      selectCategory(tag);
      // 更新激活状态
      DOM.mobileSubPanel.querySelectorAll('.sub-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
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
  DOM.searchClose.addEventListener('click', closeSearchModal);
  
  // 搜索输入
  DOM.searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
  
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
  
  // ESC 关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.dishModal.classList.contains('active')) {
        closeDishModal();
      } else if (DOM.searchModal.classList.contains('active')) {
        closeSearchModal();
      } else if (DOM.cartSidebar.classList.contains('active')) {
        closeCartSidebar();
      } else if (DOM.adminPanel.classList.contains('active')) {
        closeAdminPanel();
      }
    }
  });
  
  // 购物车
  DOM.floatingCart.addEventListener('click', openCartSidebar);
  DOM.cartClose.addEventListener('click', closeCartSidebar);
  DOM.checkoutButton.addEventListener('click', handleCheckout);
  
  // 管理员
  DOM.adminBtn.addEventListener('click', toggleAdminPanel);
  DOM.adminClose.addEventListener('click', closeAdminPanel);
  
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
    // 显示加载中
    DOM.loading.textContent = '加载中...';
    
    // 并行加载菜品和标签
    const [dishesData, tagsData] = await Promise.all([
      fetchDishes({ page_size: 100 }),
      fetchTags()
    ]);
    
    AppState.dishes = dishesData.dishes || [];
    AppState.filteredDishes = [...AppState.dishes];
    AppState.tags = tagsData || [];
    
    // 构建标签树
    AppState.tagTree = buildTagTree(AppState.tags);
    
    // 默认展开第一个有子标签的分类
    const firstParent = AppState.tagTree.find(t => t.children.length > 0);
    if (firstParent) {
      if (AppState.isMobile()) {
        // 移动端：显示第一个一级分类的二级标签
        setTimeout(() => {
          showMobileSubPanel(firstParent.id);
          const firstHeader = document.querySelector(`.category-header[data-parent-id="${firstParent.id}"]`);
          if (firstHeader) firstHeader.classList.add('active');
        }, 100);
      } else {
        // 桌面端：展开第一个一级分类
        AppState.expandedCategories[firstParent.id] = true;
      }
    }
    
    console.log('加载成功 - 菜品:', AppState.dishes.length, '标签:', AppState.tags.length, '一级分类:', AppState.tagTree.length);
    
    // 渲染UI
    renderCategories();
    renderDishes();
    
    // 绑定事件
    bindEvents();
    
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

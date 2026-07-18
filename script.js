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
  editMode: false,          // 是否编辑模式
  currentUser: null,        // 当前登录用户
  isMobile: () => window.innerWidth <= 480,
  // 懒加载相关状态
  currentPage: 0,           // 当前页码
  pageSize: 20,             // 每页加载数量
  totalDishes: 0,           // 当前分类总菜品数量
  allDishesTotal: 0,        // 全部菜品总数（不随标签筛选变化）
  hasMoreDishes: true,      // 是否还有更多菜品
  isLoadingDishes: false,   // 是否正在加载菜品
  loadSentinel: null        // 滚动哨兵元素
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
  cartNoteInput: document.getElementById('cart-note-input'),
  adminBtn: document.getElementById('admin-btn'),
  adminAvatarImg: document.getElementById('admin-avatar-img'),
  adminAvatarText: document.getElementById('admin-avatar-text'),
  mobileAvatarImg: document.getElementById('mobile-avatar-img'),
  mobileAvatarText: document.getElementById('mobile-avatar-text'),
  adminPanel: document.getElementById('admin-panel'),
  adminClose: document.getElementById('admin-close'),
  addDishBtn: document.getElementById('add-dish-btn'),
  editDishBtn: document.getElementById('edit-dish-btn'),
  editDishModal: document.getElementById('edit-dish-modal'),
  editDishForm: document.getElementById('edit-dish-form'),
  editDishName: document.getElementById('edit-dish-name'),
  editDishPrice: document.getElementById('edit-dish-price'),
  editDishImage: document.getElementById('edit-dish-image'),
  editDishDescription: document.getElementById('edit-dish-description'),
  editDishDetail: document.getElementById('edit-dish-detail'),
  editDishIngredients: document.getElementById('edit-dish-ingredients'),
  editDishMethod: document.getElementById('edit-dish-method'),
  editDishTags: document.getElementById('edit-dish-tags'),
  editDishClose: document.getElementById('edit-dish-close'),
  editDishCancel: document.getElementById('edit-dish-cancel'),
  addDishModal: document.getElementById('add-dish-modal'),
  addDishForm: document.getElementById('add-dish-form'),
  addDishName: document.getElementById('add-dish-name'),
  addDishPrice: document.getElementById('add-dish-price'),
  addDishImage: document.getElementById('add-dish-image'),
  addDishDescription: document.getElementById('add-dish-description'),
  addDishDetail: document.getElementById('add-dish-detail'),
  addDishIngredients: document.getElementById('add-dish-ingredients'),
  addDishMethod: document.getElementById('add-dish-method'),
  addDishTags: document.getElementById('add-dish-tags'),
  addDishClose: document.getElementById('add-dish-close'),
  addDishCancel: document.getElementById('add-dish-cancel'),
  userPanel: document.getElementById('user-panel'),
  userPanelClose: document.getElementById('user-panel-close'),
  userAvatarLarge: document.getElementById('user-avatar-large'),
  userName: document.getElementById('user-name'),
  userId: document.getElementById('user-id'),
  userBalance: document.getElementById('user-balance'),
  userLogoutBtn: document.getElementById('user-logout-btn'),
  adminLogoutBtn: document.getElementById('admin-logout-btn'),
  mobileSubPanel: document.getElementById('mobileSubPanel'),
  mobileOrdersBtn: document.getElementById('mobile-orders-btn'),
  mobileAvatarBtn: document.getElementById('mobile-avatar-btn'),
  ordersBtn: document.getElementById('orders-btn'),
  loginModal: document.getElementById('login-modal'),
  loginClose: document.getElementById('login-close'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  loginButton: document.getElementById('login-button'),
  loginError: document.getElementById('login-error'),
  sidebar: document.querySelector('.sidebar'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmOk: document.getElementById('confirm-ok'),
  confirmCancel: document.getElementById('confirm-cancel')
};

// ==================== 工具函数 ====================

/**
 * 将十六进制颜色转换为RGBA格式
 * @param {string} hex - 十六进制颜色值
 * @param {number} alpha - 透明度 (0-1)
 * @returns {string} RGBA颜色值
 */
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex || null;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex || null;
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    return data;
  } catch (error) {
      // 静默处理401错误（session失效是正常现象）
      if (!error.message || !error.message.includes('401')) {
        console.error('API请求错误:', error);
      }
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
  const displayTags = tags.slice(0, 2);
  const extraCount = tags.length - 2;
  
  let tagHtml = displayTags.map(tag => 
    `<span class="card-tag" style="background:${tag.background_color || 'var(--surface)'};color:${tag.text_color || 'var(--text-muted)'}">${tag.name}</span>`
  ).join('');
  
  if (extraCount > 0) {
    tagHtml += `<span class="card-tag card-tag-extra">+${extraCount}</span>`;
  }

  const editActions = AppState.editMode ? `
    <div class="card-actions">
      <button class="card-action-btn card-edit-btn" data-edit-id="${dish.id}" aria-label="编辑">
        <img src="img/icon/编辑.png" alt="编辑">
      </button>
      <button class="card-action-btn card-delete-btn" data-delete-id="${dish.id}" aria-label="删除">
        <img src="img/icon/删除.png" alt="删除">
      </button>
    </div>
  ` : '';

  return `
    <div class="food-card" data-dish-id="${dish.id}">
      <div class="card-image">
        ${imageSrc ? `<img src="${imageSrc}" alt="${dish.name}" loading="lazy">` : '<!-- 待补充图片链接 -->'}
        ${tags.some(t => t.name === '热销') ? '<span class="card-badge badge-hot">热销</span>' : ''}
        ${tags.some(t => t.name === '新品') ? '<span class="card-badge badge-new">新品</span>' : ''}
        ${tags.some(t => t.name === '招牌') ? '<span class="card-badge badge-chef">主厨推荐</span>' : ''}
        ${editActions}
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
function renderDishes(append = false) {
  const dishes = AppState.filteredDishes;
  
  // 更新菜品数量
  DOM.dishCount.textContent = AppState.totalDishes || dishes.length;
  // "全部菜品" 的数量应保持不变，使用 allDishesTotal
  const allCountEl = document.getElementById('all-count');
  if (allCountEl) {
    allCountEl.textContent = AppState.allDishesTotal || AppState.totalDishes || AppState.dishes.length;
  }
  // 更新移动端标题旁的菜品数量
  const mobileCountEl = document.getElementById('mobile-dish-count-num');
  if (mobileCountEl) {
    mobileCountEl.textContent = AppState.totalDishes || dishes.length;
  }
  
  if (dishes.length === 0) {
    DOM.foodGrid.innerHTML = '<div class="loading">没有数据呢</div>';
    return;
  }
  
  const cardsHtml = dishes.map(dish => renderDishCard(dish)).join('');
  
  if (append) {
    // 追加模式：插入到现有内容之后
    DOM.foodGrid.insertAdjacentHTML('beforeend', cardsHtml);
  } else {
    // 替换模式：清空后重新渲染
    DOM.foodGrid.innerHTML = cardsHtml;
  }
  
  // 绑定卡片点击事件
  bindDishCardEvents();
  
  // 设置懒加载哨兵
  setupLazyLoadSentinel();
}

let foodGridClickHandler = null;

/**
 * 绑定菜品卡片的交互事件（使用事件委托）
 */
function bindDishCardEvents() {
  if (foodGridClickHandler) {
    DOM.foodGrid.removeEventListener('click', foodGridClickHandler);
  }
  
  foodGridClickHandler = (e) => {
    const addBtn = e.target.closest('.add-btn');
    const editBtn = e.target.closest('.card-edit-btn');
    const deleteBtn = e.target.closest('.card-delete-btn');
    
    if (addBtn) {
      e.stopPropagation();
      const dishId = parseInt(addBtn.dataset.addId);
      addToCart(dishId);
      
      addBtn.style.transform = 'scale(0.85)';
      setTimeout(() => { addBtn.style.transform = 'scale(1.08)'; }, 100);
      setTimeout(() => { addBtn.style.transform = 'scale(1)'; }, 250);
      return;
    }
    
    if (editBtn) {
      e.stopPropagation();
      const dishId = parseInt(editBtn.dataset.editId);
      openEditDishModal(dishId);
      return;
    }
    
    if (deleteBtn) {
      e.stopPropagation();
      const dishId = parseInt(deleteBtn.dataset.deleteId);
      deleteDish(dishId);
      return;
    }
    
    const card = e.target.closest('.food-card');
    if (card && !AppState.editMode) {
      const dishId = parseInt(card.dataset.dishId);
      showDishDetail(dishId);
    }
  };
  
  DOM.foodGrid.addEventListener('click', foodGridClickHandler);
}

// ==================== 分类/标签管理（一二级结构） ====================

/**
 * 异步获取标签对应的菜品数量
 * @param {string} tagName - 标签名称
 * @returns {Promise<number>} 菜品数量
 */
async function getTagDishCountAsync(tagName) {
  try {
    const data = await fetchDishes({ tag: tagName, page: 0, page_size: 1 });
    return data.total || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * 计算每个标签的菜品数量（同步版本，仅依赖已加载数据）
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
 * 异步更新所有分类的菜品数量
 */
async function updateCategoryCounts() {
  // 更新"全部菜品"总数 - 使用 allDishesTotal（不随标签变化）
  const allCountEl = document.getElementById('all-count');
  if (allCountEl) {
    if (AppState.allDishesTotal === 0) {
      // 首次加载时获取全部菜品总数
      allCountEl.textContent = '...';
      try {
        const data = await fetchDishes({ page: 0, page_size: 1 });
        AppState.allDishesTotal = data.total || 0;
      } catch (e) {
        AppState.allDishesTotal = 0;
      }
    }
    allCountEl.textContent = AppState.allDishesTotal;
  }
  
  // 异步更新每个二级标签的菜品数量
  const subCategories = document.querySelectorAll('.sub-category[data-tag]');
  for (const sub of subCategories) {
    const tagName = sub.dataset.tag;
    const countEl = sub.querySelector('.sub-category-count');
    if (countEl) {
      countEl.textContent = '...';
      const count = await getTagDishCountAsync(tagName);
      countEl.textContent = count;
    }
  }
  
  // 异步更新没有子标签的一级标签的菜品数量（如"饮品"等）
  const singleCategories = document.querySelectorAll('.category-header[data-tag-name]');
  for (const header of singleCategories) {
    const tagName = header.dataset.tagName;
    const countEl = header.querySelector('.category-count');
    if (countEl) {
      countEl.textContent = '...';
      const count = await getTagDishCountAsync(tagName);
      countEl.textContent = count;
    }
  }
}

/**
 * 渲染分类侧边栏（一二级结构）
 */
function renderCategories() {
  const tagTree = AppState.tagTree;
  
  // 生成分类HTML
  let categoryHtml = '';
  
  // 第一项：全部菜品 - 使用 allDishesTotal（不随标签变化）
  const allCount = AppState.allDishesTotal || AppState.totalDishes || AppState.dishes.length || 0;
  const isAllActive = !AppState.currentTag || AppState.currentTag === 'all';
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
    const isExpanded = AppState.expandedCategories[parent.id] !== false;
    
    // 如果没有子标签，一级标签本身可以直接作为筛选标签
    if (parent.children.length === 0) {
      const isActive = AppState.currentTag === parent.name;
      // 初始显示 0 或 '...'，updateCategoryCounts 会异步更新
      categoryHtml += `
        <div class="menu-category" style="animation-delay: ${0.05 * (pIndex + 2)}s">
          <div class="category-header ${isActive ? 'active' : ''}" data-tag-name="${parent.name}">
            <div class="category-left">
              <div class="category-icon">${getTagIcon(parent.name)}</div>
              <span class="category-name">${parent.name}</span>
            </div>
            <span class="category-count" data-tag-count="${parent.name}">…</span>
          </div>
        </div>
      `;
      return;
    }
    
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
  
  // 没有子标签的一级标签点击 - 直接筛选
  document.querySelectorAll('.category-header[data-tag-name]').forEach(header => {
    header.addEventListener('click', () => {
      const tagName = header.dataset.tagName;
      selectCategory(tagName);
    });
  });
  
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
  
  // 更新二级标签激活状态
  document.querySelectorAll('.sub-category').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sub-chip').forEach(c => c.classList.remove('active'));
  const activeSub = document.querySelector(`.sub-category[data-tag="${tag}"]`);
  if (activeSub) {
    activeSub.classList.add('active');
  }
  const activeChip = document.querySelector(`.sub-chip[data-mobile-tag="${tag}"]`);
  if (activeChip) {
    activeChip.classList.add('active');
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
  
  // 更新一级标签的激活状态
  updateParentCategoryActive(tag);
  
  // 移动端逻辑处理
  if (AppState.isMobile()) {
    if (tag === 'all') {
      // 点击全部菜品：隐藏二级面板，移除所有一级标签激活
      hideMobileSubPanel();
      document.querySelectorAll('.category-header').forEach(h => h.classList.remove('active'));
    } else {
      // 查找当前 tag 对应的一级分类
      const parent = findParentCategory(tag);
      if (parent) {
        if (parent.children && parent.children.length > 0) {
          // 有子标签的一级分类：显示二级面板
          showMobileSubPanel(parent.id);
          document.querySelectorAll('.category-header').forEach(h => h.classList.remove('active'));
          const activeHeader = document.querySelector(`.category-header[data-parent-id="${parent.id}"]`);
          if (activeHeader) activeHeader.classList.add('active');
        } else {
          // 没有子标签的一级分类：隐藏二级面板，将激活状态切换到该一级标签
          hideMobileSubPanel();
          document.querySelectorAll('.category-header').forEach(h => h.classList.remove('active'));
          const activeHeader = document.querySelector(`.category-header[data-tag-name="${parent.name}"]`);
          if (activeHeader) activeHeader.classList.add('active');
        }
      }
    }
  }
  
  // 筛选菜品
  filterDishes();
}

/**
 * 查找 tag 所属的一级分类
 * @param {string} tag - 标签名称
 * @returns {object|null} 一级分类对象
 */
function findParentCategory(tag) {
  // 先在 tagTree 的 children 中查找
  for (const parent of AppState.tagTree) {
    if (parent.name === tag) {
      return parent;
    }
    if (parent.children && parent.children.some(c => c.name === tag)) {
      return parent;
    }
  }
  return null;
}

/**
 * 更新一级标签的激活状态
 * @param {string} tag - 当前选中的标签
 */
function updateParentCategoryActive(tag) {
  // 移除所有一级标签的 active 状态
  document.querySelectorAll('.category-header[data-parent-id]').forEach(h => h.classList.remove('active'));
  document.querySelectorAll('.category-header[data-tag-name]').forEach(h => h.classList.remove('active'));
  
  if (tag === 'all') return;
  
  // 查找 tag 所属的一级分类
  const parent = findParentCategory(tag);
  if (!parent) return;
  
  if (parent.children && parent.children.length > 0) {
    // 有子标签的一级分类
    const activeHeader = document.querySelector(`.category-header[data-parent-id="${parent.id}"]`);
    if (activeHeader) activeHeader.classList.add('active');
  } else {
    // 没有子标签的一级分类
    const activeHeader = document.querySelector(`.category-header[data-tag-name="${parent.name}"]`);
    if (activeHeader) activeHeader.classList.add('active');
  }
}

/**
 * 根据当前条件筛选菜品（懒加载模式）
 */
async function filterDishes() {
  // 重置分页状态
  AppState.currentPage = 0;
  AppState.hasMoreDishes = true;
  AppState.filteredDishes = [];
  
  // 立即查询一次获取总数
  try {
    const params = {
      page: 0,
      page_size: AppState.pageSize
    };
    if (AppState.currentTag !== 'all') {
      params.tag = AppState.currentTag;
    }
    if (AppState.searchKeyword) {
      params.search = AppState.searchKeyword;
    }
    
    const data = await fetchDishes(params);
    AppState.filteredDishes = data.dishes || [];
    AppState.totalDishes = data.total || 0;
    AppState.hasMoreDishes = data.has_more || false;
    AppState.currentPage = 1;
    
    renderDishes(false);
  } catch (error) {
    console.error('筛选菜品失败:', error);
    DOM.foodGrid.innerHTML = '<div class="loading">加载失败，请重试</div>';
  }
}

/**
 * 加载更多菜品
 */
async function loadMoreDishes() {
  if (AppState.isLoadingDishes || !AppState.hasMoreDishes) {
    return;
  }
  
  AppState.isLoadingDishes = true;
  showLazyLoadIndicator(true);
  
  try {
    const params = {
      page: AppState.currentPage,
      page_size: AppState.pageSize
    };
    if (AppState.currentTag !== 'all') {
      params.tag = AppState.currentTag;
    }
    if (AppState.searchKeyword) {
      params.search = AppState.searchKeyword;
    }
    
    const data = await fetchDishes(params);
    const newDishes = data.dishes || [];
    AppState.filteredDishes = [...AppState.filteredDishes, ...newDishes];
    AppState.hasMoreDishes = data.has_more || false;
    AppState.currentPage += 1;
    
    renderDishes(true);
  } catch (error) {
    console.error('加载更多菜品失败:', error);
  } finally {
    AppState.isLoadingDishes = false;
    showLazyLoadIndicator(false);
  }
}

/**
 * 设置懒加载哨兵元素
 */
function setupLazyLoadSentinel() {
  // 移除旧的哨兵
  if (AppState.loadSentinel) {
    AppState.loadSentinel.remove();
    AppState.loadSentinel = null;
  }
  
  // 移除旧的完成提示
  const oldComplete = document.getElementById('load-complete');
  if (oldComplete) {
    oldComplete.remove();
  }
  
  if (!AppState.hasMoreDishes) {
    // 没有更多数据，显示完成提示
    if (AppState.filteredDishes.length > 0) {
      const complete = document.createElement('div');
      complete.id = 'load-complete';
      complete.className = 'load-complete';
      complete.textContent = '已经到底了';
      DOM.foodGrid.parentElement.appendChild(complete);
    }
    return;
  }
  
  // 创建新的哨兵元素
  const sentinel = document.createElement('div');
  sentinel.id = 'load-sentinel';
  sentinel.className = 'load-sentinel';
  sentinel.innerHTML = '<div class="lazy-load-indicator">加载中...</div>';
  DOM.foodGrid.parentElement.appendChild(sentinel);
  AppState.loadSentinel = sentinel;
  
  // 使用 IntersectionObserver 监听
  if (window.lazyLoadObserver) {
    window.lazyLoadObserver.disconnect();
  }
  
  window.lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !AppState.isLoadingDishes && AppState.hasMoreDishes) {
        loadMoreDishes();
      }
    });
  }, {
    rootMargin: '200px'
  });
  
  window.lazyLoadObserver.observe(sentinel);
}

/**
 * 显示/隐藏懒加载指示器
 */
function showLazyLoadIndicator(show) {
  if (AppState.loadSentinel) {
    const indicator = AppState.loadSentinel.querySelector('.lazy-load-indicator');
    if (indicator) {
      indicator.style.display = show ? 'block' : 'none';
    }
  }
}

// ==================== 搜索功能 ====================

/**
 * 打开搜索弹窗
 */
function openSearchModal() {
  DOM.searchModal.classList.add('active');
  setTimeout(() => {
    DOM.searchInput.value = AppState.searchKeyword;
    DOM.searchInput.focus();
  }, 100);
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
 * 查找菜品（优先从已加载的筛选结果中查找）
 * @param {number} dishId - 菜品ID
 * @returns {object|null} 菜品对象
 */
function findDish(dishId) {
  return AppState.filteredDishes.find(d => d.id === dishId);
}

/**
 * 显示菜品详情
 * @param {number} dishId - 菜品ID
 */
function showDishDetail(dishId) {
  const dish = findDish(dishId);
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
        // 如果后端session已失效（401错误），清除本地存储
        console.log('获取用户信息失败，可能是session已失效:', e.message);
        if (e.message && e.message.includes('401')) {
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
    
    // 渲染UI
    renderCategories();
    
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

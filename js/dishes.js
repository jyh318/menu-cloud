// ============ 菜品与分类模块 ============

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
  
  if (append) {
    // 追加模式：只渲染最近一次新增的菜品，避免重复
    // 找出当前已渲染的菜品数量
    const existingCount = DOM.foodGrid.querySelectorAll('.food-card').length;
    const newDishes = dishes.slice(existingCount);
    if (newDishes.length === 0) return;
    const cardsHtml = newDishes.map(dish => renderDishCard(dish)).join('');
    DOM.foodGrid.insertAdjacentHTML('beforeend', cardsHtml);
  } else {
    // 替换模式：清空后重新渲染
    const cardsHtml = dishes.map(dish => renderDishCard(dish)).join('');
    DOM.foodGrid.innerHTML = cardsHtml;
  }
  
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
    updateSearchClearVisibility();
  }, 100);
}

/**
 * 关闭搜索弹窗
 */
function closeSearchModal() {
  DOM.searchModal.classList.remove('active');
}

/**
 * 更新清除按钮的显示状态
 */
function updateSearchClearVisibility() {
  if (DOM.searchClear) {
    DOM.searchClear.style.display = DOM.searchInput.value.trim() ? 'flex' : 'none';
  }
}

/**
 * 清空搜索内容并刷新菜品
 */
function clearSearch() {
  DOM.searchInput.value = '';
  AppState.searchKeyword = '';
  updateSearchClearVisibility();
  filterDishes();
}

/**
 * 执行搜索
 * @param {string} keyword - 搜索关键词
 */
function performSearch(keyword) {
  AppState.searchKeyword = keyword.trim();
  updateSearchClearVisibility();
  filterDishes();
}
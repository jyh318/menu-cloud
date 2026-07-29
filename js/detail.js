// ============ 菜品详情与每日推荐模块 ============

// ==================== 菜品详情弹窗 ====================

/**
 * 查找菜品（优先从已加载的筛选结果中查找）
 * @param {number} dishId - 菜品ID
 * @returns {object|null} 菜品对象
 */
function findDish(dishId) {
  return AppState.filteredDishes.find(d => d.id === dishId) || AppState.dishes.find(d => d.id === dishId);
}

/**
 * 显示菜品详情
 * @param {number} dishId - 菜品ID
 */
async function showDishDetail(dishId) {
  let dish = findDish(dishId);
  
  if (!dish) {
    try {
      const resp = await fetch(`/api/dishes/${dishId}`);
      if (resp.ok) {
        const data = await resp.json();
        dish = data;
      }
    } catch (e) {
      console.error('获取菜品详情失败:', e.message);
      return;
    }
  }
  
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
 * 获取今日日期字符串（YYYY-MM-DD）
 */
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 基于字符串生成稳定的 hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 加载每日推荐
 * 优先从后端获取该日的手动推荐，无则使用日期 hash 随机选
 */
async function loadDailyRecommend() {
  const today = getTodayString();
  const dateEl = document.getElementById('daily-recommend-date');
  if (dateEl) dateEl.textContent = today;

  // 1. 优先从后端 API 加载该日的手动推荐
  try {
    const resp = await fetch(`/api/daily-recommend?date=${today}`);
    const data = await resp.json();
    if (data.success && data.dish) {
      renderDailyRecommend(data.dish);
      return;
    }
  } catch (e) {
    console.log('加载每日推荐API失败，将使用随机推荐:', e.message);
  }

  // 2. 否则从后端获取候选菜品并基于日期 hash 随机选
  try {
    const data = await fetchDishes({ page: 0, page_size: 50 });
    const candidates = data.dishes || [];
    if (candidates.length === 0) return;

    const seed = hashString(today);
    const index = seed % candidates.length;
    const dish = candidates[index];
    renderDailyRecommend(dish);
  } catch (e) {
    console.log('加载每日推荐失败:', e.message);
  }
}

/**
 * 渲染每日推荐卡片
 * @param {object} dish - 菜品对象
 */
function renderDailyRecommend(dish) {
  const container = document.getElementById('daily-recommend');
  const card = document.getElementById('daily-recommend-card');
  if (!container || !card || !dish) return;

  const imageSrc = getDishImage(dish.image);
  card.dataset.dishId = dish.id;
  
  // 构建菜品标签 HTML（彩色标签）
  let tagsHtml = '';
  const tagDetails = dish.tag_details || [];
  if (tagDetails.length > 0) {
    tagsHtml = '<div class="dr-tags">' + tagDetails.map(t => {
      const bg = t.background_color || '#999';
      const color = t.text_color || '#fff';
      return `<span class="dr-tag" style="background:${bg};color:${color}">${t.name}</span>`;
    }).join('') + '</div>';
  }
  
  // 详细描述（用 detail_description，fallback 到 description）
  const detailDesc = dish.detail_description || dish.description || '今日精选推荐';
  
  // 管理员模式下显示编辑按钮
  const editBtnHtml = AppState.editMode ? `
    <button class="dr-edit-btn" data-edit-daily="${dish.id}" aria-label="更换菜品" title="更换推荐菜品">
      <img src="img/icon/更换.png" alt="更换" width="18" height="18">
    </button>
  ` : '';
  
  card.innerHTML = `
    <div class="dr-image">
      ${imageSrc ? `<img src="${imageSrc}" alt="${dish.name}" loading="lazy">` : '<div class="dr-image-placeholder">暂无图片</div>'}
    </div>
    <div class="dr-info">
      <div class="dr-name-row">
        <div class="dr-name">${dish.name}</div>
        ${editBtnHtml}
      </div>
      ${tagsHtml}
      <div class="dr-detail">${detailDesc}</div>
      <div class="dr-price">¥${dish.price}</div>
    </div>
  `;

  // 点击推荐卡片查看详情
  card.onclick = (e) => {
    // 如果点的是管理员编辑按钮
    if (e.target.closest('.dr-edit-btn')) {
      e.stopPropagation();
      openDailyRecommendPicker();
      return;
    }
    if (!AppState.editMode) {
      showDishDetail(dish.id);
    }
  };

  container.style.display = 'block';
}

/**
 * 打开每日推荐菜品选择弹窗
 */
async function openDailyRecommendPicker() {
  if (!DOM.dailyPickerModal) return;
  DOM.dailyPickerModal.classList.add('active');
  if (DOM.dailyPickerSearch) {
    DOM.dailyPickerSearch.value = '';
  }
  await renderDailyPickerDishes('');
}

/**
 * 关闭每日推荐菜品选择弹窗
 */
function closeDailyRecommendPicker() {
  if (DOM.dailyPickerModal) {
    DOM.dailyPickerModal.classList.remove('active');
  }
}

/**
 * 渲染每日推荐选择弹窗的菜品列表
 * @param {string} keyword - 搜索关键词
 */
async function renderDailyPickerDishes(keyword) {
  if (!DOM.dailyPickerList) return;
  DOM.dailyPickerList.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const params = { page: 0, page_size: 50 };
    if (keyword && keyword.trim()) {
      params.search = keyword.trim();
    }
    const data = await fetchDishes(params);
    const dishes = data.dishes || [];
    if (dishes.length === 0) {
      DOM.dailyPickerList.innerHTML = '<div class="loading">没有匹配的菜品</div>';
      return;
    }
    DOM.dailyPickerList.innerHTML = dishes.map(d => {
      const imgSrc = getDishImage(d.image);
      return `
        <div class="daily-picker-item" data-pick-id="${d.id}">
          <div class="dpi-image">
            ${imgSrc ? `<img src="${imgSrc}" alt="${d.name}" loading="lazy">` : '<div class="dr-image-placeholder">暂无图片</div>'}
          </div>
          <div class="dpi-info">
            <div class="dpi-name">${d.name}</div>
            <div class="dpi-price">¥${d.price}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定选择事件
    DOM.dailyPickerList.querySelectorAll('.daily-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const dishId = parseInt(item.dataset.pickId);
        const dish = dishes.find(d => d.id === dishId);
        if (dish) {
          selectDailyRecommendDish(dish);
        }
      });
    });
  } catch (e) {
    DOM.dailyPickerList.innerHTML = '<div class="loading">加载失败，请重试</div>';
    console.log('加载菜品列表失败:', e.message);
  }
}

/**
 * 显示一个轻量级提示（toast），2.4 秒后自动消失
 * @param {string} message - 提示内容
 */
function showToast(message) {
  // 如果已有 toast，则先移除（避免叠加）
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.textContent = message;
  toast.style.cssText = [
    'position: fixed',
    'left: 50%',
    'bottom: 80px',
    'transform: translateX(-50%)',
    'background: rgba(44, 36, 24, 0.92)',
    'color: #fff',
    'padding: 10px 18px',
    'border-radius: 8px',
    'font-size: 14px',
    'line-height: 1.4',
    'z-index: 9999',
    'box-shadow: 0 6px 20px rgba(0,0,0,0.2)',
    'opacity: 0',
    'transition: opacity 0.2s ease, transform 0.2s ease',
    'pointer-events: none',
    'max-width: 80%',
    'text-align: center'
  ].join(';');

  document.body.appendChild(toast);

  // 触发淡入
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(-4px)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

/**
 * 选择菜品作为每日推荐
 * @param {object} dish - 菜品对象
 */
async function selectDailyRecommendDish(dish) {
  const today = getTodayString();

  // 立即关闭弹窗，提供即时反馈
  closeDailyRecommendPicker();

  // 重新渲染每日推荐（即时视觉反馈）
  renderDailyRecommend(dish);

  // 显示"保存中"提示
  showToast(`正在保存推荐：${dish.name}`);

  // 同步到后端
  try {
    const resp = await fetch('/api/daily-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        dish_id: dish.id,
        set_by: AppState.currentUser?.username || 'admin'
      })
    });
    const data = await resp.json();
    if (data.success) {
      showToast(`已保存推荐：${dish.name}`);
    } else {
      showToast(`保存失败：${data.message || '未知错误'}`);
    }
  } catch (e) {
    showToast(`网络错误：${e.message}`);
    console.error('保存每日推荐失败:', e);
  }
}

/**
 * 关闭菜品详情弹窗
 */
function closeDishModal() {
  DOM.dishModal.classList.remove('active');
}
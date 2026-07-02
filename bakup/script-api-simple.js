/**
 * @file script-api-simple.js
 * @description 菜单管理系统前端 API 交互脚本
 * @version 1.0.0
 * @author Menu Cloud Team
 * 
 * 该脚本负责与后端 API 进行交互，实现菜品展示、标签筛选、购物车管理、
 * 菜品编辑等功能。采用模块化设计，包含以下主要模块：
 * - 菜品数据获取与渲染
 * - 标签管理与筛选
 * - 购物车功能
 * - 菜品详情展示
 * - 菜品编辑功能
 */

// API 基础URL配置
const API_BASE_URL = '/api';

// ==================== 全局状态变量 ====================

/**
 * 所有菜品数据数组
 * @type {Array}
 */
let allDishes = [];

/**
 * 所有标签数据数组
 * @type {Array}
 */
let allTags = [];

/**
 * 是否正在加载中
 * @type {boolean}
 */
let isLoading = false;

/**
 * 是否还有更多菜品可加载
 * @type {boolean}
 */
let hasMoreDishes = true;

/**
 * 当前页码（用于分页加载）
 * @type {number}
 */
let currentPage = 0;

/**
 * 每页加载数量
 * @type {number}
 */
const pageSize = 12;

/**
 * 当前请求的 AbortController（用于取消请求）
 * @type {AbortController|null}
 */
let currentRequest = null;

/**
 * 是否处于卡片编辑模式
 * @type {boolean}
 */
window.isCardEditMode = false;

/**
 * 当前正在编辑的菜品ID
 * @type {number|null}
 */
let editingDishId = null;

// ==================== 菜品数据获取与渲染 ====================

/**
 * 获取菜品列表
 * @async
 * @param {string} [tagFilter=''] - 标签筛选条件
 * @param {string} [search=''] - 搜索关键词
 * @param {boolean} [append=false] - 是否追加到现有列表（用于滚动加载）
 * @returns {Promise<Array>} 菜品数组
 */
async function fetchDishes(tagFilter = '', search = '', append = false) {
    // 如果有正在进行的请求，先取消
    if (currentRequest) {
        currentRequest.abort();
    }
    
    // 如果正在加载中，直接返回
    if (isLoading) return;
    
    // 如果不是追加模式，重置分页状态
    if (!append) {
        currentPage = 0;
        hasMoreDishes = true;
    }
    
    // 如果没有更多数据且是追加模式，直接返回
    if (!hasMoreDishes && append) return;
    
    // 设置加载状态
    isLoading = true;
    showLoading(true);

    // 创建新的请求控制器
    const controller = new AbortController();
    currentRequest = controller;

    try {
        // 构建请求URL和参数
        let url = `${API_BASE_URL}/dishes`;
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('page_size', pageSize);

        if (tagFilter) params.append('tag', tagFilter);
        if (search) params.append('search', search);

        url += '?' + params.toString();

        // 发送请求
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('获取菜品失败');

        // 解析响应数据
        const data = await response.json();
        let dishes = data.dishes || data;
        
        // 判断是否还有更多数据
        if (dishes.length < pageSize) {
            hasMoreDishes = false;
        }

        // 处理数据追加或替换
        let newDishes = [];
        if (append) {
            const existingIds = new Set(allDishes.map(dish => dish.id));
            newDishes = dishes.filter(dish => !existingIds.has(dish.id));
            allDishes = [...allDishes, ...newDishes];
        } else {
            allDishes = dishes;
        }
        
        // 更新页码并渲染
        currentPage++;
        renderDishes(allDishes, append, newDishes);
        updateNoMoreDishesMessage();
        return allDishes;
    } catch (error) {
        console.error('Error fetching dishes:', error);
        return [];
    } finally {
        // 重置加载状态
        isLoading = false;
        showLoading(false);
    }
}

/**
 * 显示/隐藏加载指示器
 * @param {boolean} show - 是否显示加载指示器
 */
function showLoading(show) {
    const existingLoader = document.getElementById('loading-indicator');
    if (show) {
        if (!existingLoader) {
            const loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.innerHTML = '<div class="loading-spinner"></div><p>加载中...</p>';
            loader.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 15px 30px; border-radius: 8px; z-index: 1000; display: flex; align-items: center; gap: 10px;';
            document.body.appendChild(loader);
        }
    } else {
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

/**
 * 更新"没有更多菜品"提示信息
 */
function updateNoMoreDishesMessage() {
    const existingMsg = document.getElementById('no-more-dishes');
    if (!hasMoreDishes && allDishes.length > 0) {
        if (!existingMsg) {
            const msg = document.createElement('div');
            msg.id = 'no-more-dishes';
            msg.textContent = '到底啦！！';
            msg.style.cssText = 'text-align: center; color: #999; padding: 20px; font-size: 14px;';
            const menuGrid = document.getElementById('menu-grid');
            if (menuGrid && menuGrid.parentElement) {
                menuGrid.parentElement.appendChild(msg);
            }
        }
    } else {
        if (existingMsg) {
            existingMsg.remove();
        }
    }
}

// ==================== 标签管理 ====================

/**
 * 获取所有标签
 * @async
 * @returns {Promise<Array>} 标签数组
 */
async function fetchTags() {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        if (!response.ok) throw new Error('获取标签失败');

        allTags = await response.json();
        renderTags(allTags);
        return allTags;
    } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
    }
}

/**
 * 创建新标签
 * @async
 * @param {Object} tagData - 标签数据
 * @param {string} tagData.name - 标签名称
 * @param {string} [tagData.category] - 标签分类
 * @param {string} [tagData.color] - 标签颜色
 * @throws {Error} 创建失败时抛出错误
 */
async function createTag(tagData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData)
        });

        if (!response.ok) throw new Error('创建标签失败');

        // 刷新标签列表
        await fetchTags();
    } catch (error) {
        console.error('Error creating tag:', error);
        throw error;
    }
}

/**
 * 删除标签
 * @async
 * @param {number} tagId - 标签ID
 * @throws {Error} 删除失败时抛出错误
 */
async function deleteTag(tagId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除标签失败');

        // 刷新标签列表
        await fetchTags();
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
}

/**
 * 获取标签样式
 * @param {string} tagName - 标签名称
 * @param {Array} tagDetails - 标签详情数组
 * @returns {Object} 包含 backgroundColor 和 color 的样式对象
 */
function getTagStyle(tagName, tagDetails) {
    const tag = tagDetails.find(t => t.name === tagName.trim()) || allTags.find(t => t.name === tagName.trim());
    return {
        backgroundColor: tag?.background_color || '#999',
        color: tag?.text_color || 'white'
    };
}

// ==================== DOM渲染 ====================

/**
 * 渲染菜品列表
 * @param {Array} dishes - 菜品数组
 * @param {boolean} [append=false] - 是否追加渲染
 * @param {Array} [newDishes=[]] - 新添加的菜品（用于追加模式）
 */
function renderDishes(dishes, append = false, newDishes = []) {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    // 空数据处理
    if (dishes.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无菜品</p>';
        return;
    }

    /**
     * 生成单个菜品卡片HTML
     * @param {Object} dish - 菜品对象
     * @returns {string} HTML字符串
     */
    const generateDishHTML = (dish) => {
        const tags = dish.tags ? dish.tags.split(',') : [];
        const tagDetails = dish.tag_details || [];
        const displayedTags = tags.slice(0, 2); // 只显示前两个标签
        const moreTagsCount = tags.length - 2;

        return `
            <div class="dish-card" onclick="showDishDetail(${dish.id})" data-dish-id="${dish.id}">
                <div class="dish-image" style="background-color: #F2C76E;">
                    ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : dish.name.charAt(0)}
                    <div class="dish-actions">
                        ${window.isCardEditMode ? `
                            <button class="dish-action-btn" onclick="event.stopPropagation(); editDish(${dish.id})">
                                <img src="img/icon/编辑.png" alt="编辑" width="16" height="16">
                            </button>
                            <button class="dish-action-btn" onclick="event.stopPropagation(); removeDish(${dish.id})">
                                <img src="img/icon/删除.png" alt="删除" width="16" height="16">
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="dish-info">
                    <div class="dish-name">${dish.name}</div>
                    <div class="dish-price">¥${dish.price.toFixed(1)}<button class="add-to-cart-btn" onclick="event.stopPropagation(); changeQuantity(${dish.id}, 1)"><img src="img/icon/购物车.png" alt="加入购物车" width="18" height="18"></button></div>
                    <div class="dish-desc">${dish.description || ''}</div>
                    <div class="dish-tags">
                        ${displayedTags.map(tag => {
                            const style = getTagStyle(tag, tagDetails);
                            return `<span class="dish-tag ${tag.trim()}" style="background-color: ${style.backgroundColor}; color: ${style.color};">${tag.trim()}</span>`;
                        }).join('')}
                        ${moreTagsCount > 0 ? `<span class="dish-tag more">+${moreTagsCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    // 根据模式进行渲染
    if (append && newDishes.length > 0) {
        const newDishHTML = newDishes.map(generateDishHTML).join('');
        menuGrid.insertAdjacentHTML('beforeend', newDishHTML);
    } else {
        const dishHTML = dishes.map(generateDishHTML).join('');
        menuGrid.innerHTML = dishHTML;
    }
}

/**
 * 渲染标签列表（支持层级结构）
 * @param {Array} tags - 标签数组
 */
function renderTags(tags) {
    const primaryTagsContainer = document.getElementById('primary-tags-container');
    const secondaryTagsContainer = document.getElementById('secondary-tags-container');
    
    if (!primaryTagsContainer || !secondaryTagsContainer) return;

    // 分离一级标签和二级标签
    const primaryTags = tags.filter(tag => tag.parentid === null || tag.parentid === 0 || tag.parentid === 'null');
    const secondaryTags = tags.filter(tag => tag.parentid !== null && tag.parentid !== 0 && tag.parentid !== 'null');

    // 构建标签层级结构
    const tagHierarchy = {};
    primaryTags.forEach(tag => {
        tagHierarchy[tag.id] = {
            tag: tag,
            children: secondaryTags.filter(child => child.parentid == tag.id)
        };
    });

    const firstPrimaryTagId = primaryTags.length > 0 ? primaryTags[0].id : null;

    // 渲染一级标签
    primaryTagsContainer.innerHTML = `
        <div class="primary-tags-row">
            ${Object.values(tagHierarchy).map(({ tag }) => `
                <div class="tag-category" data-category="${tag.name}" data-tag-id="${tag.id}">
                    <div class="tag-category-title ${firstPrimaryTagId === tag.id ? 'active' : ''}" onclick="toggleTagCategory(this.parentElement)" style="background: ${tag.background_color || 'rgba(122, 119, 185, 0.15)'}; color: ${tag.text_color || 'white'};">
                        <span>${tag.name}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // 渲染二级标签
    secondaryTagsContainer.innerHTML = `
        <div class="secondary-tags-row">
            ${Object.values(tagHierarchy).map(({ tag, children }) => `
                <div class="tag-sub-container" data-category="${tag.name}" data-tag-id="${tag.id}" style="${firstPrimaryTagId === tag.id ? 'display: inline-flex; gap: 0.5rem;' : 'display: none;'}">
                    ${children.map(childTag => `
                        <span class="tag ${childTag.name}" data-tag="${childTag.name}" onclick="filterByTag('${childTag.name}')" style="background: ${childTag.background_color || 'rgba(122, 119, 185, 0.2)'}; color: ${childTag.text_color || 'white'};">
                            ${childTag.name}
                        </span>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * 切换标签分类显示
 * @param {HTMLElement} element - 标签分类元素
 */
function toggleTagCategory(element) {
    const tagId = element.dataset.tagId;
    
    // 移除所有一级标签的激活状态
    document.querySelectorAll('.tag-category-title').forEach(title => {
        title.classList.remove('active');
    });
    
    // 激活当前点击的标签
    const titleElement = element.querySelector('.tag-category-title');
    if (titleElement) {
        titleElement.classList.add('active');
    }
    
    // 隐藏所有二级标签容器
    document.querySelectorAll('.tag-sub-container').forEach(container => {
        container.style.display = 'none';
    });
    
    // 显示当前分类对应的二级标签
    const currentSecondaryTags = document.querySelector(`.tag-sub-container[data-tag-id="${tagId}"]`);
    if (currentSecondaryTags) {
        currentSecondaryTags.style.display = 'inline-flex';
        currentSecondaryTags.style.gap = '0.5rem';
    }
}

// ==================== 标签筛选 ====================

/**
 * 当前激活的筛选标签
 * @type {string}
 */
let activeTag = '';

/**
 * 根据标签筛选菜品
 * @param {string} tagName - 标签名称
 */
function filterByTag(tagName) {
    const tagElement = document.querySelector(`.tag[data-tag="${tagName}"]`);

    // 切换标签选中状态
    if (activeTag === tagName) {
        activeTag = '';
        if (tagElement) tagElement.classList.remove('active');
    } else {
        // 移除其他标签的激活状态
        document.querySelectorAll('.tag.active').forEach(el => el.classList.remove('active'));
        activeTag = tagName;
        if (tagElement) tagElement.classList.add('active');
    }

    // 获取搜索关键词并重新加载菜品
    const searchValue = document.getElementById('search-input')?.value || '';
    fetchDishes(activeTag, searchValue);
}

// ==================== 购物车管理 ====================

/**
 * 购物车数组
 * @type {Array}
 */
let cart = [];

/**
 * 获取购物车中菜品数量
 * @param {number} dishId - 菜品ID
 * @returns {number} 数量
 */
function getCartQuantity(dishId) {
    const item = cart.find(item => item.id === dishId);
    return item ? item.quantity : 0;
}

/**
 * 从购物车中移除菜品
 * @param {number} dishId - 菜品ID
 */
function removeFromCart(dishId) {
    cart = cart.filter(item => item.id !== dishId);
    updateCartDisplay();
}

// ==================== 菜品编辑 ====================

/**
 * 切换编辑模式
 */
function toggleEditMode() {
    window.isCardEditMode = !window.isCardEditMode;
    renderDishes(allDishes, false);
}

/**
 * 编辑菜品
 * @param {number} dishId - 菜品ID
 */
function editDish(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    editingDishId = dishId;

    // 填充表单数据
    document.getElementById('edit-dish-name').value = dish.name;
    document.getElementById('edit-dish-price').value = dish.price;
    document.getElementById('edit-dish-image').value = dish.image || '';
    document.getElementById('edit-dish-desc').value = dish.description || '';
    document.getElementById('edit-dish-detail-desc').value = dish.detail_desc || '';
    document.getElementById('edit-dish-method').value = dish.method || '';
    document.getElementById('edit-dish-ingredients').value = dish.ingredients || '';
    document.getElementById('edit-dish-tags').value = dish.tags || '';

    // 显示编辑面板
    document.getElementById('edit-panel').classList.add('active');
}

/**
 * 删除菜品（带确认）
 * @param {number} dishId - 菜品ID
 */
function removeDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？')) return;

    deleteDishFromDB(dishId)
        .then(() => {
            alert('删除成功');
            fetchDishes(activeTag, '');
        })
        .catch(() => alert('删除失败'));
}

/**
 * 从数据库删除菜品
 * @async
 * @param {number} dishId - 菜品ID
 * @returns {Promise<Object>} 删除结果
 * @throws {Error} 删除失败时抛出错误
 */
async function deleteDishFromDB(dishId) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除菜品失败');

        // 同步更新本地数据
        allDishes = allDishes.filter(d => d.id !== dishId);
        return response.json();
    } catch (error) {
        console.error('Error deleting dish:', error);
        throw error;
    }
}

/**
 * 更新菜品到数据库
 * @async
 * @param {number} dishId - 菜品ID
 * @param {Object} dishData - 菜品数据
 * @returns {Promise<Object>} 更新结果
 * @throws {Error} 更新失败时抛出错误
 */
async function updateDishInDB(dishId, dishData) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dishData)
        });

        if (!response.ok) throw new Error('更新菜品失败');

        // 同步更新本地数据
        const index = allDishes.findIndex(d => d.id === dishId);
        if (index !== -1) {
            allDishes[index] = { ...allDishes[index], ...dishData };
        }
        return response.json();
    } catch (error) {
        console.error('Error updating dish:', error);
        throw error;
    }
}

// ==================== 购物车操作 ====================

/**
 * 修改购物车中菜品数量
 * @param {number} dishId - 菜品ID
 * @param {number} delta - 数量变化值（+1或-1）
 */
function changeQuantity(dishId, delta) {
    const existingItem = cart.find(item => item.id === dishId);

    if (existingItem) {
        existingItem.quantity += delta;
        // 如果数量<=0，从购物车移除
        if (existingItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== dishId);
        }
    } else if (delta > 0) {
        // 添加新菜品到购物车
        const dish = allDishes.find(d => d.id === dishId);
        if (dish) {
            cart.push({ id: dish.id, name: dish.name, price: dish.price, image: dish.image, quantity: 1 });
        }
    }

    // 持久化到本地存储并更新显示
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    
    // 更新详情模态框中的数量显示
    const modalQuantityEl = document.getElementById(`modal-quantity-${dishId}`);
    if (modalQuantityEl) {
        modalQuantityEl.textContent = getCartQuantity(dishId);
    }
}

/**
 * 更新购物车显示
 */
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const cartBadge = document.getElementById('cart-badge');
    const cartButton = document.getElementById('cart-button');

    // 计算总价和总数量
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 更新购物车徽章
    if (cartBadge) {
        cartBadge.textContent = totalQuantity;
    }
    
    // 显示购物车按钮
    if (cartButton) {
        cartButton.style.display = 'flex';
    }

    // 更新总价显示
    if (totalPriceEl) {
        totalPriceEl.textContent = `¥${totalPrice.toFixed(2)}`;
    }

    const totalAmountEl = document.getElementById('total-amount');
    if (totalAmountEl) {
        totalAmountEl.textContent = `¥${totalPrice.toFixed(2)}`;
    }

    if (!cartItems) return;

    // 渲染购物车项目
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'img/icon/default-dish.png'}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">¥${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
            </div>
            <button class="cart-item-delete" onclick="removeFromCart(${item.id})">
                <img src="img/icon/删除.png" alt="删除" width="20" height="20">
            </button>
        </div>
    `).join('');

    // 空购物车提示
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">购物车为空</p>';
    }
}

/**
 * 打开购物车侧边栏
 */
function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.add('active');
    }
}

/**
 * 关闭购物车侧边栏
 */
function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.remove('active');
    }
}

/**
 * 结算功能
 * 调用后端API创建订单并结算
 */
window.currentUser = null;

async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/check_login`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.logged_in) {
            const userResponse = await fetch(`${API_BASE_URL}/user`, {
                credentials: 'include'
            });
            const userData = await userResponse.json();
            if (userData.success) {
                window.currentUser = userData.user;
            }
        }
        return data.logged_in;
    } catch (error) {
        console.error('检查登录状态失败:', error);
        return false;
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            window.currentUser = data.user;
            updateUserPanel();
        }
        return data;
    } catch (error) {
        console.error('登录失败:', error);
        return { success: false, message: '登录失败' };
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.currentUser = null;
        document.getElementById('user-panel').classList.remove('active');
        updateAdminButton();
    } catch (error) {
        console.error('登出失败:', error);
    }
}

async function fetchUserOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders?page_size=5`, {
            credentials: 'include'
        });
        const data = await response.json();
        return data.orders || [];
    } catch (error) {
        console.error('获取用户订单失败:', error);
        return [];
    }
}

function formatOrderDate(dateStr) {
    if (!dateStr) return '';

    // 格式: Sun, 24 May 2026 08:41:14 GMT
    const monthMap = {'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                     'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'};
    const match = dateStr.match(/^\w{3},\s*(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+GMT$/);
    if (match) {
        const year = match[3];
        const month = monthMap[match[2]] || match[2];
        const day = String(match[1]).padStart(2, '0');
        const hours = match[4];
        const minutes = match[5];
        const seconds = match[6];
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    return dateStr;
}

function formatAvatarText(name) {
    if (!name) return '用户';
    
    // 检查是否为英文（只包含英文字母和数字）
    const isEnglish = /^[a-zA-Z0-9\s]+$/.test(name);
    
    if (isEnglish) {
        return name;
    }
    
    // 中文处理
    if (name.length === 2) {
        return name;
    } else if (name.length >= 3) {
        return name.slice(-2);
    }
    
    return name;
}

async function showUserOrderDetail(orderNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/order/${orderNumber}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        const order = data.order;
        const items = data.items;
        const modalBody = document.getElementById('user-order-detail-body');

        let noteHtml = '';
        const note = order.remark || '';
        if (note) {
            noteHtml = `
                <div class="order-detail-note">
                    <span class="order-detail-note-label">备注</span>
                    <span class="order-detail-note-value">${note}</span>
                </div>
            `;
        }

        modalBody.innerHTML = `
            <div class="order-detail-info">
                <div class="order-detail-info-row">
                    <span class="order-detail-info-label">订单编号</span>
                    <span class="order-detail-info-value">${order.odnum}</span>
                </div>
                <div class="order-detail-info-row">
                    <span class="order-detail-info-label">下单时间</span>
                    <span class="order-detail-info-value">${formatOrderDate(order.oddate)}</span>
                </div>
            </div>

            <div class="order-detail-items">
                <h3>菜品明细</h3>
                ${items.map(item => `
                    <div class="order-detail-item">
                        <div>
                            <div class="order-detail-item-name">${item.dish_name || `菜品ID: ${item.disid}`}</div>
                            <div style="font-size: 0.8rem; color: #999;">单价: ¥${item.danjia} x ${item.coun}</div>
                        </div>
                        <div class="order-detail-item-price">¥${item.danjia * item.coun}</div>
                    </div>
                `).join('')}
            </div>

            ${noteHtml}

            <div class="order-detail-total">
                <span class="order-detail-total-label">合计金额</span>
                <span class="order-detail-total-value">¥${order.heji}</span>
            </div>
        `;

        document.getElementById('user-order-detail-modal').classList.add('active');
    } catch (error) {
        console.error('获取订单详情失败:', error);
        alert('获取订单详情失败');
    }
}

function closeUserOrderModal() {
    document.getElementById('user-order-detail-modal').classList.remove('active');
}

async function updateUserPanel() {
    if (window.currentUser) {
        const username = window.currentUser.username;
        document.getElementById('user-name').textContent = username;
        document.getElementById('user-balance').textContent = `¥${window.currentUser.balance.toFixed(2)}`;
        
        // 设置头像文字
        const avatarText = formatAvatarText(username);
        const avatarSpan = document.querySelector('.avatar-text');
        avatarSpan.textContent = avatarText;
        
        // 检查是否为英文，决定是否需要缩小字体
        const isEnglish = /^[a-zA-Z0-9\s]+$/.test(username);
        if (isEnglish && avatarText.length > 3) {
            avatarSpan.style.fontSize = '0.9rem';
        } else {
            avatarSpan.style.fontSize = '';
        }
        
        const orders = await fetchUserOrders();
        const userOrdersContainer = document.getElementById('user-orders');
        
        if (orders.length === 0) {
            userOrdersContainer.innerHTML = '<div class="empty">暂无订单</div>';
        } else {
            userOrdersContainer.innerHTML = orders.map(order => `
                <div class="user-order-item">
                    <div class="user-order-header">
                        <span class="user-order-number">${order.odnum}</span>
                        <span class="user-order-total">¥${order.heji}</span>
                    </div>
                    <div class="user-order-date">
                        ${formatOrderDate(order.oddate)}
                        <span class="order-detail-link" onclick="showUserOrderDetail('${order.odnum}')">订单详情&gt;&gt;</span>
                    </div>
                </div>
            `).join('');
        }
    }
}

function updateAdminButton() {
    const adminToggle = document.getElementById('admin-toggle');
    if (window.currentUser) {
        adminToggle.title = '个人中心';
    } else {
        adminToggle.title = '登录';
    }
}

async function checkout() {
    if (cart.length === 0) {
        alert('购物车是空的');
        return;
    }

    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
        alert('请先登录');
        document.getElementById('login-modal').classList.add('active');
        return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (window.currentUser && window.currentUser.balance < totalPrice) {
        alert('余额不足，请先充值');
        return;
    }

    try {
        const checkoutBtn = document.getElementById('checkout-button');
        const originalText = checkoutBtn?.textContent;
        checkoutBtn.textContent = '处理中...';
        checkoutBtn.disabled = true;

        const noteInput = document.getElementById('cart-note-input');
        const note = noteInput?.value?.trim() || '';

        const createResponse = await fetch(`${API_BASE_URL}/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                total: totalPrice,
                note: note
            })
        });

        if (!createResponse.ok) {
            throw new Error('创建订单失败');
        }

        const createResult = await createResponse.json();
        const orderId = createResult.order_id;

        const deductResponse = await fetch(`${API_BASE_URL}/user/deduct_balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: window.currentUser.id,
                amount: totalPrice
            })
        });

        if (!deductResponse.ok) {
            const deductResult = await deductResponse.json();
            throw new Error(deductResult.message || '余额扣除失败');
        }

        const deductResult = await deductResponse.json();
        window.currentUser.balance = deductResult.balance;

        const checkoutResponse = await fetch(`${API_BASE_URL}/order/${orderId}/checkout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!checkoutResponse.ok) {
            throw new Error('结算失败');
        }

        const orderData = {
            '订单ID': orderId,
            '订单详情': cart.map(item => ({
                '名称': item.name,
                '单价': item.price,
                '数量': item.quantity,
                '小计金额': item.price * item.quantity
            })),
            '备注': note,
            '合计金额': totalPrice.toFixed(2)
        };

        const orderJson = encodeURIComponent(JSON.stringify(orderData));
        window.location.href = `receipt.html?order=${orderJson}`;

        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
        closeCart();

    } catch (error) {
        console.error('结算失败:', error);
        alert('结算失败，请重试');
    } finally {
        // 恢复按钮状态
        const checkoutBtn = document.getElementById('checkout-button');
        checkoutBtn.textContent = '去结算';
        checkoutBtn.disabled = false;
    }
}

// ==================== 菜品详情 ====================

/**
 * 显示菜品详情模态框
 * @param {number} dishId - 菜品ID
 */
function showDishDetail(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    const modal = document.getElementById('dish-modal');
    const dishDetail = document.getElementById('dish-detail');

    const tags = dish.tags ? dish.tags.split(',') : [];
    const tagDetails = dish.tag_details || [];

    // 渲染菜品详情
    dishDetail.innerHTML = `
        <div class="dish-detail-image">
            ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;">` : dish.name.charAt(0)}
        </div>
        <div class="dish-detail-name">${dish.name}</div>
        <div class="dish-detail-price">¥${dish.price.toFixed(1)}</div>
        <div class="dish-detail-tags">
            ${tags.map(tag => {
                const style = getTagStyle(tag, tagDetails);
                return `<span class="dish-tag ${tag.trim()}" style="background-color: ${style.backgroundColor}; color: ${style.color};">${tag.trim()}</span>`;
            }).join('')}
        </div>
        <div class="dish-detail-section">
            <h4>菜品简介</h4>
            <p>${dish.description || '暂无简介'}</p>
        </div>
        <div class="dish-detail-section">
            <h4>详细描述</h4>
            <p>${dish.detail_desc || '暂无详细描述'}</p>
        </div>
        <div class="dish-detail-section">
            <h4>用料</h4>
            <p>${dish.ingredients || '暂无用料信息'}</p>
        </div>
        <div class="dish-detail-section">
            <h4>制作方法</h4>
            <p>${dish.method || '暂无制作方法'}</p>
        </div>
    `;

    // 显示模态框
    modal.classList.add('active');
}

/**
 * 是否处于管理员模式
 * @type {boolean}
 */
window.isAdminMode = false;

// ==================== 无限滚动 ====================

/**
 * 设置无限滚动
 */
function setupInfiniteScroll() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    // 创建 IntersectionObserver 监听滚动
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 当哨兵元素进入视口且不是加载状态且还有更多数据时触发加载
            if (entry.isIntersecting && !isLoading && hasMoreDishes) {
                const tagFilter = activeTag;
                const search = document.getElementById('search-input')?.value || '';
                fetchDishes(tagFilter, search, true);
            }
        });
    }, {
        rootMargin: '200px' // 在哨兵元素进入视口前200px触发
    });

    // 创建哨兵元素
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.cssText = 'height: 1px; width: 100%;';
    menuGrid.parentElement.appendChild(sentinel);
    observer.observe(sentinel);
}

// ==================== 页面初始化 ====================

/**
 * DOM加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化数据
    await fetchTags();
    await fetchDishes();
    updateCartDisplay();
    setupInfiniteScroll();

    // 检查登录状态
    await checkLoginStatus();
    updateAdminButton();

    // 获取DOM元素引用
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const adminClose = document.getElementById('admin-close');
    const modal = document.getElementById('dish-modal');
    const modalClose = document.getElementById('modal-close');
    const cartButton = document.getElementById('cart-button');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartClose = document.getElementById('cart-close');
    const checkoutButton = document.getElementById('checkout-button');
    const searchInput = document.getElementById('search-input');
    const searchToggle = document.getElementById('search-toggle');
    const searchModal = document.getElementById('search-modal');
    const searchClose = document.getElementById('search-close');

    // 搜索模态框事件
    searchToggle?.addEventListener('click', () => {
        searchModal.classList.add('active');
    });

    searchClose?.addEventListener('click', () => {
        searchModal.classList.remove('active');
        searchInput.value = '';
    });

    // 点击模态框外部关闭
    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('active');
            searchInput.value = '';
        }
    });

    // 搜索输入（带防抖）
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchValue = e.target.value.trim();
            fetchDishes(activeTag, searchValue);
        }, 300);
    });

    // 登录/个人中心切换
    adminToggle?.addEventListener('click', async () => {
        if (window.currentUser) {
            await updateUserPanel();
            document.getElementById('user-panel').classList.add('active');
        } else {
            document.getElementById('login-modal').classList.add('active');
        }
    });

    // 登录弹窗关闭
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    loginClose?.addEventListener('click', () => {
        loginModal.classList.remove('active');
        document.getElementById('login-error').classList.remove('show');
    });

    loginModal?.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
            document.getElementById('login-error').classList.remove('show');
        }
    });

    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        const result = await login(username, password);
        if (result.success) {
            loginModal.classList.remove('active');
            errorDiv.classList.remove('show');
            document.getElementById('login-form').reset();
            updateAdminButton();
            await updateUserPanel();
            document.getElementById('user-panel').classList.add('active');
        } else {
            errorDiv.textContent = result.message;
            errorDiv.classList.add('show');
        }
    });

    // 个人中心关闭
    const userPanel = document.getElementById('user-panel');
    const userClose = document.getElementById('user-close');
    userClose?.addEventListener('click', () => {
        userPanel.classList.remove('active');
    });

    // 退出登录
    const logoutButton = document.getElementById('logout-button');
    logoutButton?.addEventListener('click', async () => {
        await logout();
    });
    
    // 订单详情弹窗关闭
    const userOrderDetailModal = document.getElementById('user-order-detail-modal');
    const userOrderDetailClose = document.getElementById('user-order-detail-close');
    userOrderDetailClose?.addEventListener('click', () => {
        userOrderDetailModal.classList.remove('active');
    });
    
    userOrderDetailModal?.addEventListener('click', (e) => {
        if (e.target === userOrderDetailModal) {
            userOrderDetailModal.classList.remove('active');
        }
    });

    // 编辑面板关闭
    const editPanel = document.getElementById('edit-panel');
    const editClose = document.getElementById('edit-close');
    
    editClose?.addEventListener('click', () => {
        editPanel.classList.remove('active');
        editingDishId = null;
    });

    // 菜品详情模态框关闭
    modalClose?.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // 购物车事件
    cartButton?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    checkoutButton?.addEventListener('click', checkout);

    // 菜品编辑表单提交
    document.getElementById('edit-dish-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!editingDishId) return;

        // 收集表单数据
        const dishData = {
            name: document.getElementById('edit-dish-name').value,
            price: parseFloat(document.getElementById('edit-dish-price').value),
            image: document.getElementById('edit-dish-image').value,
            description: document.getElementById('edit-dish-desc').value,
            detail_desc: document.getElementById('edit-dish-detail-desc').value,
            method: document.getElementById('edit-dish-method').value,
            ingredients: document.getElementById('edit-dish-ingredients').value,
            tags: document.getElementById('edit-dish-tags').value
        };

        try {
            await updateDishInDB(editingDishId, dishData);
            alert('菜单更新成功');
            editPanel.classList.remove('active');
            editingDishId = null;
            fetchDishes(activeTag, '');
        } catch (error) {
            alert('更新失败');
        }
    });

    // 标签创建表单提交
    document.getElementById('tag-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tagData = {
            name: document.getElementById('tag-name').value,
            category: document.getElementById('tag-category')?.value || '其他',
            color: document.getElementById('tag-color')?.value || '#7A77B9'
        };

        try {
            await createTag(tagData);
            alert('标签创建成功');
            e.target.reset();
        } catch (error) {
            alert('创建失败');
        }
    });
});

// ==================== 全局暴露函数 ====================

/**
 * 暴露到全局的函数，供HTML调用
 */
window.changeQuantity = changeQuantity;
window.showDishDetail = showDishDetail;
window.showUserOrderDetail = showUserOrderDetail;
window.closeUserOrderModal = closeUserOrderModal;
window.filterByTag = filterByTag;
window.getCartQuantity = getCartQuantity;
window.toggleTagCategory = toggleTagCategory;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.toggleEditMode = toggleEditMode;
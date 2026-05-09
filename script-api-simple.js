const API_BASE_URL = 'http://localhost:5000/api';

let allDishes = [];
let allTags = [];
let isLoading = false;
let hasMoreDishes = true;
let currentPage = 0;
const pageSize = 12;
let currentRequest = null;

async function fetchDishes(tagFilter = '', search = '', append = false) {
    // 取消之前的请求
    if (currentRequest) {
        currentRequest.abort();
    }
    
    if (isLoading) return;
    if (!append) {
        currentPage = 0;
        hasMoreDishes = true;
    }
    
    if (!hasMoreDishes && append) return;
    
    isLoading = true;
    showLoading(true);

    // 创建新的请求控制器
    const controller = new AbortController();
    currentRequest = controller;

    try {
        let url = `${API_BASE_URL}/dishes`;
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('page_size', pageSize);

        if (tagFilter) params.append('tag', tagFilter);
        if (search) params.append('search', search);

        url += '?' + params.toString();

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('获取菜品失败');

        const data = await response.json();
        let dishes = data.dishes || data;
        
        if (dishes.length < pageSize) {
            hasMoreDishes = false;
        }

        let newDishes = [];
        if (append) {
            // 去重：避免重复加载相同的菜品
            const existingIds = new Set(allDishes.map(dish => dish.id));
            newDishes = dishes.filter(dish => !existingIds.has(dish.id));
            allDishes = [...allDishes, ...newDishes];
        } else {
            allDishes = dishes;
        }
        
        currentPage++;
        renderDishes(allDishes, append, newDishes);
        updateNoMoreDishesMessage();
        return allDishes;
    } catch (error) {
        console.error('Error fetching dishes:', error);
        return [];
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

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

function updateNoMoreDishesMessage() {
    const existingMsg = document.getElementById('no-more-dishes');
    if (!hasMoreDishes && allDishes.length > 0) {
        if (!existingMsg) {
            const msg = document.createElement('div');
            msg.id = 'no-more-dishes';
            msg.textContent = '没有更多菜品了';
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

async function createDish(dishData) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dishData)
        });

        if (!response.ok) throw new Error('创建菜品失败');

        const result = await response.json();
        await fetchDishes();
        return result;
    } catch (error) {
        console.error('Error creating dish:', error);
        throw error;
    }
}

async function updateDish(dishId, dishData) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dishData)
        });

        if (!response.ok) throw new Error('更新菜品失败');

        const result = await response.json();
        await fetchDishes();
        return result;
    } catch (error) {
        console.error('Error updating dish:', error);
        throw error;
    }
}

async function deleteDish(dishId) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除菜品失败');

        const result = await response.json();
        await fetchDishes();
        return result;
    } catch (error) {
        console.error('Error deleting dish:', error);
        throw error;
    }
}

async function createTag(tagData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData)
        });

        if (!response.ok) throw new Error('创建标签失败');

        const result = await response.json();
        await fetchTags();
        return result;
    } catch (error) {
        console.error('Error creating tag:', error);
        throw error;
    }
}

async function deleteTag(tagId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除标签失败');

        const result = await response.json();
        await fetchTags();
        return result;
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
}

function renderDishes(dishes, append = false, newDishes = []) {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    if (dishes.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无菜品</p>';
        return;
    }

    if (append) {
        // 只插入新添加的菜品，而不是所有菜品
        if (newDishes.length > 0) {
            const newDishHTML = newDishes.map(dish => {
                const tags = dish.tags ? dish.tags.split(',') : [];
                const tagDetails = dish.tag_details || [];
                const displayedTags = tags.slice(0, 2);
                const moreTagsCount = tags.length - 2;

                function getTagStyle(tagName) {
                    const tag = tagDetails.find(t => t.name === tagName.trim()) || 
                               allTags.find(t => t.name === tagName.trim());
                    return {
                        backgroundColor: tag?.background_color || '#999',
                        color: tag?.text_color || 'white'
                    };
                }

                return `
                    <div class="dish-card" onclick="showDishDetail(${dish.id})" data-dish-id="${dish.id}">
                        <div class="dish-image" style="background-color: #F2C76E;">
                            ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : dish.name.charAt(0)}
                            <div class="dish-actions">
                                ${window.isAdminMode ? `
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
                            <div class="dish-price">¥${dish.price.toFixed(1)}</div>
                            <div class="dish-desc">${dish.description || ''}</div>
                            <div class="dish-tags">
                                ${displayedTags.map(tag => {
                                    const style = getTagStyle(tag);
                                    return `<span class="dish-tag ${tag.trim()}" style="background-color: ${style.backgroundColor}; color: ${style.color};">${tag.trim()}</span>`;
                                }).join('')}
                                ${moreTagsCount > 0 ? `<span class="dish-tag more">+${moreTagsCount}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            menuGrid.insertAdjacentHTML('beforeend', newDishHTML);
        }
    } else {
        const dishHTML = dishes.map(dish => {
            const tags = dish.tags ? dish.tags.split(',') : [];
            const tagDetails = dish.tag_details || [];
            const displayedTags = tags.slice(0, 2);
            const moreTagsCount = tags.length - 2;

            function getTagStyle(tagName) {
                const tag = tagDetails.find(t => t.name === tagName.trim()) || 
                           allTags.find(t => t.name === tagName.trim());
                return {
                    backgroundColor: tag?.background_color || '#999',
                    color: tag?.text_color || 'white'
                };
            }

            return `
                <div class="dish-card" onclick="showDishDetail(${dish.id})" data-dish-id="${dish.id}">
                    <div class="dish-image" style="background-color: #F2C76E;">
                        ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : dish.name.charAt(0)}
                        <div class="dish-actions">
                            ${window.isAdminMode ? `
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
                            <div class="dish-price">¥${dish.price.toFixed(1)}</div>
                            <div class="dish-desc">${dish.description || ''}</div>
                            <div class="dish-tags">
                                ${displayedTags.map(tag => {
                                    const style = getTagStyle(tag);
                                    return `<span class="dish-tag ${tag.trim()}" style="background-color: ${style.backgroundColor}; color: ${style.color};">${tag.trim()}</span>`;
                                }).join('')}
                                ${moreTagsCount > 0 ? `<span class="dish-tag more">+${moreTagsCount}</span>` : ''}
                            </div>
                        </div>
                </div>
            `;
        }).join('');
        menuGrid.innerHTML = dishHTML;
    }
}

function renderTags(tags) {
    const primaryTagsContainer = document.getElementById('primary-tags-container');
    const secondaryTagsContainer = document.getElementById('secondary-tags-container');
    
    if (!primaryTagsContainer || !secondaryTagsContainer) return;

    const primaryTags = tags.filter(tag => tag.parentid === null || tag.parentid === 0 || tag.parentid === 'null');
    const secondaryTags = tags.filter(tag => tag.parentid !== null && tag.parentid !== 0 && tag.parentid !== 'null');

    const tagHierarchy = {};
    primaryTags.forEach(tag => {
        tagHierarchy[tag.id] = {
            tag: tag,
            children: secondaryTags.filter(child => child.parentid == tag.id)
        };
    });

    // 获取第一个一级标签的ID，用于默认显示其子标签
    const firstPrimaryTagId = primaryTags.length > 0 ? primaryTags[0].id : null;

    // 渲染一级标签
    primaryTagsContainer.innerHTML = `
        <div class="primary-tags-row">
            ${Object.values(tagHierarchy).map(({ tag, children }) => `
                <div class="tag-category" data-category="${tag.name}" data-tag-id="${tag.id}">
                    <div class="tag-category-title ${firstPrimaryTagId === tag.id ? 'active' : ''}" onclick="toggleTagCategory(this.parentElement)" style="background: ${tag.background_color || 'rgba(122, 119, 185, 0.15)'};">
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
                        <span class="tag ${childTag.name}" data-tag="${childTag.name}" onclick="filterByTag('${childTag.name}')" style="background: ${childTag.background_color || 'rgba(122, 119, 185, 0.2)'};">
                            ${childTag.name}
                        </span>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

function toggleTagCategory(element) {
    const categoryName = element.dataset.category;
    const tagId = element.dataset.tagId;
    
    // 移除所有一级标签的active状态
    document.querySelectorAll('.tag-category-title').forEach(title => {
        title.classList.remove('active');
    });
    
    // 为当前点击的一级标签添加active状态
    const titleElement = element.querySelector('.tag-category-title');
    if (titleElement) {
        titleElement.classList.add('active');
    }
    
    // 隐藏所有二级标签容器
    document.querySelectorAll('.tag-sub-container').forEach(container => {
        container.style.display = 'none';
    });
    
    // 显示当前一级标签对应的二级标签
    const currentSecondaryTags = document.querySelector(`.tag-sub-container[data-tag-id="${tagId}"]`);
    if (currentSecondaryTags) {
        currentSecondaryTags.style.display = 'inline-flex';
        currentSecondaryTags.style.gap = '0.5rem';
    }
}

let activeTag = '';
// currentRequest 已在文件顶部声明，此处无需重复声明

function filterByTag(tagName) {
    const tagElement = document.querySelector(`.tag[data-tag="${tagName}"]`);

    if (activeTag === tagName) {
        activeTag = '';
        if (tagElement) tagElement.classList.remove('active');
    } else {
        document.querySelectorAll('.tag.active').forEach(el => el.classList.remove('active'));
        activeTag = tagName;
        if (tagElement) tagElement.classList.add('active');
    }

    const searchValue = document.getElementById('search-input')?.value || '';
    fetchDishes(activeTag, searchValue);
}

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function getCartQuantity(dishId) {
    const item = cart.find(item => item.id === dishId);
    return item ? item.quantity : 0;
}

function changeQuantity(dishId, delta) {
    const existingItem = cart.find(item => item.id === dishId);

    if (existingItem) {
        existingItem.quantity += delta;
        if (existingItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== dishId);
        }
    } else if (delta > 0) {
        const dish = allDishes.find(d => d.id === dishId);
        if (dish) {
            cart.push({ id: dish.id, name: dish.name, price: dish.price, quantity: 1 });
        }
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    renderDishes(allDishes, false);
}

function addToCart(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    const existingItem = cart.find(item => item.id === dishId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id: dish.id, name: dish.name, price: dish.price, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    renderDishes(allDishes, false);
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const cartBadge = document.getElementById('cart-badge');

    if (!cartItems) return;

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cartBadge) {
        cartBadge.textContent = totalQuantity;
        cartBadge.style.display = totalQuantity > 0 ? 'flex' : 'none';
    }

    if (totalPriceEl) {
        totalPriceEl.textContent = `¥${totalPrice.toFixed(2)}`;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">¥${item.price.toFixed(1)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join('');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">购物车为空</p>';
    }
}

function showDishDetail(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    const modal = document.getElementById('dish-modal');
    const dishDetail = document.getElementById('dish-detail');

    const tags = dish.tags ? dish.tags.split(',') : [];
    const tagDetails = dish.tag_details || [];

    function getTagStyle(tagName) {
        const tag = tagDetails.find(t => t.name === tagName.trim()) || 
                   allTags.find(t => t.name === tagName.trim());
        return {
            backgroundColor: tag?.background_color || '#999',
            color: tag?.text_color || 'white'
        };
    }

    dishDetail.innerHTML = `
        <div class="dish-detail-image">
            ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" style="width: 100%; height: 100%; object-fit: cover;">` : dish.name.charAt(0)}
        </div>
        <div class="dish-detail-name">${dish.name}</div>
        <div class="dish-detail-price-section" style="display: flex; align-items: center; justify-content: space-between;">
            <div class="dish-detail-price">¥${dish.price.toFixed(1)}</div>
            ${!window.isAdminMode ? `
                <div class="dish-detail-quantity">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="changeQuantity(${dish.id}, -1)">-</button>
                        <span class="quantity" id="modal-quantity-${dish.id}">${getCartQuantity(dish.id)}</span>
                        <button class="quantity-btn" onclick="changeQuantity(${dish.id}, 1)">+</button>
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="dish-detail-tags">
            ${tags.map(tag => {
                const style = getTagStyle(tag);
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

    modal.classList.add('active');
}

function removeDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？')) return;

    deleteDish(dishId)
        .then(() => alert('删除成功'))
        .catch(() => alert('删除失败'));
}

let editingDishId = null;

function editDish(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    editingDishId = dishId;

    document.getElementById('edit-dish-name').value = dish.name;
    document.getElementById('edit-dish-price').value = dish.price;
    document.getElementById('edit-dish-image').value = dish.image || '';
    document.getElementById('edit-dish-desc').value = dish.description || '';
    document.getElementById('edit-dish-detail-desc').value = dish.detail_desc || '';
    document.getElementById('edit-dish-method').value = dish.method || '';
    document.getElementById('edit-dish-ingredients').value = dish.ingredients || '';
    document.getElementById('edit-dish-tags').value = dish.tags || '';

    document.getElementById('edit-panel').classList.add('active');
}

window.isAdminMode = false;

function setupInfiniteScroll() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMoreDishes) {
                const tagFilter = activeTag;
                const search = document.getElementById('search-input')?.value || '';
                fetchDishes(tagFilter, search, true);
            }
        });
    }, {
        rootMargin: '200px'
    });

    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.cssText = 'height: 1px; width: 100%;';
    menuGrid.parentElement.appendChild(sentinel);
    observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchTags();
    await fetchDishes();
    updateCartDisplay();
    setupInfiniteScroll();

    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const adminClose = document.getElementById('admin-close');
    const editPanel = document.getElementById('edit-panel');
    const editClose = document.getElementById('edit-close');
    const modal = document.getElementById('dish-modal');
    const modalClose = document.getElementById('modal-close');
    const cartContainer = document.getElementById('cart-container');
    const cartToggle = document.getElementById('cart-toggle');
    const searchInput = document.getElementById('search-input');
    const searchToggle = document.getElementById('search-toggle');
    const searchModal = document.getElementById('search-modal');
    const searchClose = document.getElementById('search-close');

    // 搜索弹窗功能
    searchToggle?.addEventListener('click', () => {
        searchModal.classList.add('active');
    });

    searchClose?.addEventListener('click', () => {
        searchModal.classList.remove('active');
        searchInput.value = '';
    });

    // 点击弹窗外部关闭
    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('active');
            searchInput.value = '';
        }
    });

    // 搜索输入处理
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchValue = e.target.value.trim();
            fetchDishes(activeTag, searchValue);
        }, 300);
    });

    adminToggle?.addEventListener('click', () => {
        window.isAdminMode = !window.isAdminMode;
        adminPanel.classList.toggle('active');
        cartContainer.classList.toggle('active', !window.isAdminMode);
        renderDishes(allDishes, false);
    });

    adminClose?.addEventListener('click', () => {
        adminPanel.classList.remove('active');
        window.isAdminMode = false;
        renderDishes(allDishes, false);
    });

    editClose?.addEventListener('click', () => {
        editPanel.classList.remove('active');
        editingDishId = null;
    });

    modalClose?.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    cartToggle?.addEventListener('click', () => {
        cartContainer.classList.toggle('active');
    });

    // searchTimeout 已在上方声明，此处无需重复声明
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchDishes(activeTag, e.target.value);
        }, 300);
    });

    document.getElementById('dish-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dishData = {
            name: document.getElementById('dish-name').value,
            price: parseFloat(document.getElementById('dish-price').value),
            image: document.getElementById('dish-image').value,
            description: document.getElementById('dish-desc').value,
            detail_desc: document.getElementById('dish-detail-desc').value,
            method: document.getElementById('dish-method').value,
            ingredients: document.getElementById('dish-ingredients').value,
            tags: document.getElementById('dish-tags').value
        };

        try {
            await createDish(dishData);
            alert('菜品创建成功');
            e.target.reset();
        } catch (error) {
            alert('创建失败');
        }
    });

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

    document.getElementById('edit-dish-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!editingDishId) return;

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
            await updateDish(editingDishId, dishData);
            alert('菜单更新成功');
            editPanel.classList.remove('active');
            editingDishId = null;
        } catch (error) {
            alert('更新失败');
        }
    });

    document.querySelector('.checkout-button')?.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('购物车是空的');
            return;
        }

        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const orderData = {
            '订单详情': cart.map(item => ({
                '名称': item.name,
                '单价': item.price,
                '数量': item.quantity,
                '小计金额': item.price * item.quantity
            })),
            '合计金额': totalPrice.toFixed(2)
        };

        const orderJson = encodeURIComponent(JSON.stringify(orderData));
        window.location.href = `receipt.html?order=${orderJson}`;

        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
        cartContainer.classList.remove('active');
    });
});

window.changeQuantity = changeQuantity;
window.addToCart = addToCart;
window.showDishDetail = showDishDetail;
window.removeDish = removeDish;
window.editDish = editDish;
window.filterByTag = filterByTag;
window.getCartQuantity = getCartQuantity;
window.toggleTagCategory = toggleTagCategory;

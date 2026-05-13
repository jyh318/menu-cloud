const API_BASE_URL = '/api';

let allDishes = [];
let allTags = [];
let isLoading = false;
let hasMoreDishes = true;
let currentPage = 0;
const pageSize = 12;
let currentRequest = null;
window.isCardEditMode = false;
let editingDishId = null;

async function fetchDishes(tagFilter = '', search = '', append = false) {
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

async function createTag(tagData) {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData)
        });

        if (!response.ok) throw new Error('创建标签失败');

        await fetchTags();
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

        await fetchTags();
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
}

function getTagStyle(tagName, tagDetails) {
    const tag = tagDetails.find(t => t.name === tagName.trim()) || allTags.find(t => t.name === tagName.trim());
    return {
        backgroundColor: tag?.background_color || '#999',
        color: tag?.text_color || 'white'
    };
}

function renderDishes(dishes, append = false, newDishes = []) {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    if (dishes.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无菜品</p>';
        return;
    }

    const generateDishHTML = (dish) => {
        const tags = dish.tags ? dish.tags.split(',') : [];
        const tagDetails = dish.tag_details || [];
        const displayedTags = tags.slice(0, 2);
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

    if (append && newDishes.length > 0) {
        const newDishHTML = newDishes.map(generateDishHTML).join('');
        menuGrid.insertAdjacentHTML('beforeend', newDishHTML);
    } else {
        const dishHTML = dishes.map(generateDishHTML).join('');
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

    const firstPrimaryTagId = primaryTags.length > 0 ? primaryTags[0].id : null;

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

function toggleTagCategory(element) {
    const tagId = element.dataset.tagId;
    
    document.querySelectorAll('.tag-category-title').forEach(title => {
        title.classList.remove('active');
    });
    
    const titleElement = element.querySelector('.tag-category-title');
    if (titleElement) {
        titleElement.classList.add('active');
    }
    
    document.querySelectorAll('.tag-sub-container').forEach(container => {
        container.style.display = 'none';
    });
    
    const currentSecondaryTags = document.querySelector(`.tag-sub-container[data-tag-id="${tagId}"]`);
    if (currentSecondaryTags) {
        currentSecondaryTags.style.display = 'inline-flex';
        currentSecondaryTags.style.gap = '0.5rem';
    }
}

let activeTag = '';

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

let cart = [];

function getCartQuantity(dishId) {
    const item = cart.find(item => item.id === dishId);
    return item ? item.quantity : 0;
}

function removeFromCart(dishId) {
    cart = cart.filter(item => item.id !== dishId);
    updateCartDisplay();
}

function toggleEditMode() {
    window.isCardEditMode = !window.isCardEditMode;
    renderDishes(allDishes, false);
}

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

function removeDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？')) return;

    deleteDishFromDB(dishId)
        .then(() => {
            alert('删除成功');
            fetchDishes(activeTag, '');
        })
        .catch(() => alert('删除失败'));
}

async function deleteDishFromDB(dishId) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除菜品失败');

        allDishes = allDishes.filter(d => d.id !== dishId);
        return response.json();
    } catch (error) {
        console.error('Error deleting dish:', error);
        throw error;
    }
}

async function updateDishInDB(dishId, dishData) {
    try {
        const response = await fetch(`${API_BASE_URL}/dishes/${dishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dishData)
        });

        if (!response.ok) throw new Error('更新菜品失败');

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
            cart.push({ id: dish.id, name: dish.name, price: dish.price, image: dish.image, quantity: 1 });
        }
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    
    const modalQuantityEl = document.getElementById(`modal-quantity-${dishId}`);
    if (modalQuantityEl) {
        modalQuantityEl.textContent = getCartQuantity(dishId);
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const cartBadge = document.getElementById('cart-badge');
    const cartButton = document.getElementById('cart-button');

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cartBadge) {
        cartBadge.textContent = totalQuantity;
    }
    
    if (cartButton) {
        cartButton.style.display = 'flex';
    }

    if (totalPriceEl) {
        totalPriceEl.textContent = `¥${totalPrice.toFixed(2)}`;
    }

    const totalAmountEl = document.getElementById('total-amount');
    if (totalAmountEl) {
        totalAmountEl.textContent = `¥${totalPrice.toFixed(2)}`;
    }

    if (!cartItems) return;

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

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">购物车为空</p>';
    }
}

function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.add('active');
    }
}

function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.remove('active');
    }
}

function checkout() {
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
    closeCart();
}

function showDishDetail(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;

    const modal = document.getElementById('dish-modal');
    const dishDetail = document.getElementById('dish-detail');

    const tags = dish.tags ? dish.tags.split(',') : [];
    const tagDetails = dish.tag_details || [];

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

    modal.classList.add('active');
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
    // editPanel 已在上面声明，无需重复声明
    //const editClose = document.getElementById('edit-close');
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

    searchToggle?.addEventListener('click', () => {
        searchModal.classList.add('active');
    });

    searchClose?.addEventListener('click', () => {
        searchModal.classList.remove('active');
        searchInput.value = '';
    });

    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('active');
            searchInput.value = '';
        }
    });

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
        renderDishes(allDishes, false);
    });

    adminClose?.addEventListener('click', () => {
        adminPanel.classList.remove('active');
        window.isAdminMode = false;
        renderDishes(allDishes, false);
    });

    const editPanel = document.getElementById('edit-panel');
    const editClose = document.getElementById('edit-close');
    
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

    cartButton?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    checkoutButton?.addEventListener('click', checkout);

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
            await updateDishInDB(editingDishId, dishData);
            alert('菜单更新成功');
            editPanel.classList.remove('active');
            editingDishId = null;
            fetchDishes(activeTag, '');
        } catch (error) {
            alert('更新失败');
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


});

window.changeQuantity = changeQuantity;
window.showDishDetail = showDishDetail;
window.filterByTag = filterByTag;
window.getCartQuantity = getCartQuantity;
window.toggleTagCategory = toggleTagCategory;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
window.toggleEditMode = toggleEditMode;
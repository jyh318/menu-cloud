// ============ API 请求模块 ============

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
      const err = new Error(data.message || data.error || '请求失败');
      err.status = response.status;
      err.errors = data.errors || null;
      err.success = data.success;
      throw err;
    }
    return data;
  } catch (error) {
      if (!error.status || error.status !== 401) {
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
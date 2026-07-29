// ============ 配置与工具模块 ============

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
  searchClear: document.getElementById('search-clear'),
  searchClose: document.getElementById('search-close'),
  dishModal: document.getElementById('dish-modal'),
  dishDetail: document.getElementById('dish-detail'),
  modalClose: document.getElementById('modal-close'),
  dailyPickerModal: document.getElementById('daily-picker-modal'),
  dailyPickerSearch: document.getElementById('daily-picker-search'),
  dailyPickerList: document.getElementById('daily-picker-list'),
  dailyPickerClose: document.getElementById('daily-picker-close'),
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
  openChangePasswordBtn: document.getElementById('open-change-password-btn'),
  changePasswordModal: document.getElementById('change-password-modal'),
  changePasswordClose: document.getElementById('change-password-close'),
  changePasswordCancel: document.getElementById('change-password-cancel'),
  changePasswordForm: document.getElementById('change-password-form'),
  oldPasswordInput: document.getElementById('old-password'),
  newPasswordInput: document.getElementById('new-password'),
  confirmPasswordInput: document.getElementById('confirm-password'),
  oldPasswordError: document.getElementById('old-password-error'),
  newPasswordError: document.getElementById('new-password-error'),
  confirmPasswordError: document.getElementById('confirm-password-error'),
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
  confirmCancel: document.getElementById('confirm-cancel'),
  opsBtn: document.getElementById('ops-btn'),
  opsModal: document.getElementById('ops-modal'),
  opsClose: document.getElementById('ops-close'),
  opsTabs: document.querySelectorAll('.ops-tab'),
  opsPanels: document.querySelectorAll('.ops-panel'),
  dbTestBtn: document.getElementById('db-test-btn'),
  dbTestResult: document.getElementById('db-test-result'),
  dbTestStatus: document.getElementById('db-test-status'),
  dbTestBody: document.getElementById('db-test-body'),
  opsUserSelect: document.getElementById('ops-user-select'),
  opsNewPassword: document.getElementById('ops-new-password'),
  opsResetPwdBtn: document.getElementById('ops-reset-pwd-btn'),
  opsResetPwdResult: document.getElementById('ops-reset-pwd-result'),
  opsResetPwdStatus: document.getElementById('ops-reset-pwd-status'),
  opsResetPwdBody: document.getElementById('ops-reset-pwd-body'),
  opsApiMethod: document.getElementById('ops-api-method'),
  opsApiUrl: document.getElementById('ops-api-url'),
  opsApiBody: document.getElementById('ops-api-body'),
  opsApiTestBtn: document.getElementById('ops-api-test-btn'),
  opsApiResult: document.getElementById('ops-api-result'),
  opsApiStatus: document.getElementById('ops-api-status'),
  opsApiElapsed: document.getElementById('ops-api-elapsed'),
  opsApiBodyResult: document.getElementById('ops-api-body-result')
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
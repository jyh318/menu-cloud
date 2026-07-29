// ============ 运维管理模块 ============

// ==================== 运维管理功能 ====================

function openOpsModal() {
  if (!DOM.opsModal) return;
  DOM.opsModal.classList.add('active');
  switchOpsTab('db');
  loadUserList();
}

function closeOpsModal() {
  if (!DOM.opsModal) return;
  DOM.opsModal.classList.remove('active');
}

function switchOpsTab(tab) {
  if (!DOM.opsTabs || !DOM.opsPanels) return;
  DOM.opsTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  DOM.opsPanels.forEach(p => p.classList.toggle('active', p.id === `ops-${tab}`));
}

async function testDatabase() {
  if (!DOM.dbTestBtn) return;
  DOM.dbTestBtn.disabled = true;
  DOM.dbTestBtn.querySelector('span:last-child').textContent = '测试中...';
  
  try {
    const data = await apiRequest('/api/ops/db-test', { method: 'POST' });
    
    DOM.dbTestResult.style.display = 'block';
    DOM.dbTestStatus.className = 'result-status success';
    DOM.dbTestStatus.textContent = '✓ 连接成功';
    
    let html = '';
    if (data.connection_time !== undefined) {
      html += `<div>数据库: ${data.database || '-'}</div>`;
      html += `<div>主机: ${data.host || '-'}</div>`;
      html += `<div>耗时: ${data.connection_time}ms</div>`;
    }
    DOM.dbTestBody.innerHTML = html;
  } catch (e) {
    DOM.dbTestResult.style.display = 'block';
    DOM.dbTestStatus.className = 'result-status error';
    DOM.dbTestStatus.textContent = '✗ 连接失败';
    DOM.dbTestBody.textContent = e.message || '未知错误';
  } finally {
    DOM.dbTestBtn.disabled = false;
    DOM.dbTestBtn.querySelector('span:last-child').textContent = '测试数据库连接';
  }
}

async function loadUserList() {
  if (!DOM.opsUserSelect) return;
  
  try {
    const data = await apiRequest('/api/ops/users');
    if (data.success && data.users) {
      DOM.opsUserSelect.innerHTML = '<option value="">-- 请选择用户 --</option>';
      data.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.username}${u.is_admin ? ' (管理员)' : ''} - ID: ${u.id}`;
        DOM.opsUserSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('加载用户列表失败:', e);
  }
}

async function resetUserPassword() {
  if (!DOM.opsResetPwdBtn || !DOM.opsUserSelect || !DOM.opsNewPassword) return;
  
  const userId = DOM.opsUserSelect.value;
  const newPwd = DOM.opsNewPassword.value.trim();
  
  if (!userId) {
    showOpsResult('ops-reset-pwd', false, '请选择要重置密码的用户', '');
    return;
  }
  if (!newPwd) {
    showOpsResult('ops-reset-pwd', false, '请输入新密码', '');
    return;
  }
  if (newPwd.length < 4) {
    showOpsResult('ops-reset-pwd', false, '新密码至少需要 4 位', '');
    return;
  }
  
  DOM.opsResetPwdBtn.disabled = true;
  DOM.opsResetPwdBtn.querySelector('span:last-child').textContent = '重置中...';
  
  try {
    const data = await apiRequest('/api/ops/reset-password', {
      method: 'POST',
      body: JSON.stringify({ user_id: parseInt(userId), new_password: newPwd })
    });
    showOpsResult('ops-reset-pwd', true, '✓ 重置成功', data.message || '');
    DOM.opsNewPassword.value = '';
    showToast('密码重置成功');
  } catch (e) {
    showOpsResult('ops-reset-pwd', false, '✗ 重置失败', e.message || '未知错误');
  } finally {
    DOM.opsResetPwdBtn.disabled = false;
    DOM.opsResetPwdBtn.querySelector('span:last-child').textContent = '重置密码';
  }
}

async function testApi() {
  if (!DOM.opsApiTestBtn || !DOM.opsApiUrl) return;
  
  const url = DOM.opsApiUrl.value.trim();
  const method = DOM.opsApiMethod.value;
  const bodyText = DOM.opsApiBody.value.trim();
  
  if (!url) {
    showOpsResult('ops-api', false, '请输入接口地址', '');
    return;
  }
  
  let body = null;
  if (bodyText && ['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      showOpsResult('ops-api', false, '请求体格式错误，必须是有效的 JSON', '');
      return;
    }
  }
  
  DOM.opsApiTestBtn.disabled = true;
  DOM.opsApiTestBtn.querySelector('span:last-child').textContent = '请求中...';
  
  try {
    const payload = { url, method };
    if (body) payload.body = body;
    
    const data = await apiRequest('/api/ops/api-test', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    DOM.opsApiResult.style.display = 'block';
    DOM.opsApiStatus.className = 'result-status ' + (data.success ? 'success' : 'error');
    DOM.opsApiStatus.textContent = data.success ? `✓ ${data.status_code}` : '✗ 请求失败';
    DOM.opsApiElapsed.textContent = data.elapsed ? `${data.elapsed}ms` : '';
    
    let resultText = '';
    if (data.data !== undefined) {
      resultText = typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2);
    } else if (data.message) {
      resultText = data.message;
    }
    DOM.opsApiBodyResult.textContent = resultText;
  } catch (e) {
    DOM.opsApiResult.style.display = 'block';
    DOM.opsApiStatus.className = 'result-status error';
    DOM.opsApiStatus.textContent = '✗ 请求失败';
    DOM.opsApiElapsed.textContent = '';
    DOM.opsApiBodyResult.textContent = e.message || '未知错误';
  } finally {
    DOM.opsApiTestBtn.disabled = false;
    DOM.opsApiTestBtn.querySelector('span:last-child').textContent = '发送请求';
  }
}

function showOpsResult(prefix, success, statusText, bodyText) {
  const resultEl = document.getElementById(`${prefix}-result`);
  const statusEl = document.getElementById(`${prefix}-status`);
  const bodyEl = document.getElementById(`${prefix}-body`);
  
  if (!resultEl || !statusEl) return;
  
  resultEl.style.display = 'block';
  statusEl.className = 'result-status ' + (success ? 'success' : 'error');
  statusEl.textContent = statusText;
  
  if (bodyEl) {
    bodyEl.textContent = bodyText;
  }
}
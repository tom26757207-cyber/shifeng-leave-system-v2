// ==================== 配置區 ====================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4VijMOiZNKOjeZXjrub2ra5tx3TbrTko4HBUm-Ln3GjmTX70dfdTNem11pya54ZuEsQ/exec';

// ==================== 全域變數 ====================
let employeeData = []; // 員工資料
let currentMode = 'continuous'; // 當前請假模式
let isConnected = false; // 連線狀態

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 檢查連線狀態
    checkConnection();
    
    // 載入員工資料
    loadEmployeeData();
    
    // 初始化事件監聽
    initializeEventListeners();
    
    // 初始化日期
    initializeDates();
    
    // 初始化字數計數
    initializeCharCounters();
}

// ==================== 檢查連線狀態 ====================
async function checkConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const statusText = statusElement.querySelector('.status-text');
    
    try {
        // 測試連線到 Google Sheets
        const response = await fetch(`${SCRIPT_URL}?action=ping`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            isConnected = true;
            statusElement.classList.add('connected');
            statusElement.classList.remove('disconnected');
            statusText.textContent = '已連線到 Google Sheets';
            console.log('✅ 成功連線到 Google Sheets');
        } else {
            throw new Error('連線失敗');
        }
    } catch (error) {
        isConnected = false;
        statusElement.classList.add('disconnected');
        statusElement.classList.remove('connected');
        statusText.textContent = '無法連線到 Google Sheets';
        console.error('❌ 連線失敗:', error);
    }
}

// ==================== 載入員工資料 ====================
async function loadEmployeeData() {
    try {
        console.log('🔄 開始載入員工資料...');
        const response = await fetch(`${SCRIPT_URL}?action=getEmployees`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const text = await response.text();
            console.log('📥 收到回應:', text);
            
            try {
                employeeData = JSON.parse(text);
                console.log('✅ 員工資料載入成功:', employeeData.length, '筆');
                console.log('📋 員工資料:', employeeData);
            } catch (parseError) {
                console.error('❌ JSON 解析失敗:', parseError);
                console.log('收到的內容:', text);
                employeeData = [];
            }
        } else {
            throw new Error('HTTP ' + response.status);
        }
    } catch (error) {
        console.error('❌ 員工資料載入失敗:', error);
        employeeData = [];
    }
}

// ==================== 事件監聽初始化 ====================
function initializeEventListeners() {
    // 模式切換
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            switchMode(this.dataset.mode);
        });
    });
    
    // 員工姓名自動完成
    const employeeNameInput = document.getElementById('employeeName');
    employeeNameInput.addEventListener('input', handleEmployeeNameInput);
    employeeNameInput.addEventListener('focus', handleEmployeeNameInput);
    employeeNameInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideAutocomplete();
        }, 200);
    });
    
    // 表單送出
    const form = document.getElementById('leaveForm');
    form.addEventListener('submit', handleFormSubmit);
}

// ==================== 日期初始化 ====================
function initializeDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
    document.getElementById('singleDate').value = today;
}

// ==================== 字數計數器 ====================
function initializeCharCounters() {
    const counters = [
        { input: 'reason', counter: 'reasonCount' },
        { input: 'affectedCases', counter: 'affectedCount' },
        { input: 'remarks', counter: 'remarksCount' }
    ];
    
    counters.forEach(({ input, counter }) => {
        const inputElement = document.getElementById(input);
        const counterElement = document.getElementById(counter);
        
        inputElement.addEventListener('input', function() {
            counterElement.textContent = this.value.length;
        });
    });
}

// ==================== 模式切換 ====================
function switchMode(mode) {
    currentMode = mode;
    
    // 更新按鈕狀態
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });
    
    // 切換顯示的模式
    const continuousMode = document.getElementById('continuousMode');
    const singleMode = document.getElementById('singleMode');
    
    if (mode === 'continuous') {
        continuousMode.classList.remove('hidden');
        singleMode.classList.add('hidden');
    } else {
        continuousMode.classList.add('hidden');
        singleMode.classList.remove('hidden');
    }
}

// ==================== 員工姓名自動完成 ====================
function handleEmployeeNameInput(e) {
    const input = e.target.value.trim();
    const dropdown = document.getElementById('autocompleteDropdown');
    
    console.log('🔍 搜尋員工:', input);
    console.log('📊 員工資料總數:', employeeData.length);
    
    if (!input) {
        hideAutocomplete();
        return;
    }
    
    if (employeeData.length === 0) {
        console.log('⚠️ 無員工資料，無法顯示自動完成');
        hideAutocomplete();
        return;
    }
    
    // 過濾符合的員工（模糊搜尋）
    const filtered = employeeData.filter(emp => {
        const nameMatch = emp.name && emp.name.includes(input);
        const idMatch = emp.id && emp.id.includes(input);
        return nameMatch || idMatch;
    });
    
    console.log('🎯 找到', filtered.length, '筆符合的員工');
    
    if (filtered.length === 0) {
        hideAutocomplete();
        return;
    }
    
    // 顯示下拉選單
    dropdown.innerHTML = '';
    filtered.forEach(emp => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <span>${emp.name}</span>
            <span class="employee-id">${emp.id}</span>
        `;
        item.addEventListener('click', () => selectEmployee(emp));
        dropdown.appendChild(item);
    });
    
    dropdown.classList.add('active');
    console.log('✅ 顯示自動完成下拉選單');
}

function selectEmployee(employee) {
    console.log('✅ 選擇員工:', employee);
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('employeeId').value = employee.id;
    hideAutocomplete();
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.classList.remove('active');
}

// ==================== 表單送出 ====================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    
    // 禁用按鈕
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rotating">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        送出中...
    `;
    
    try {
        // 收集表單資料
        const formData = collectFormData();
        
        // 驗證資料
        if (!validateFormData(formData)) {
            throw new Error('請填寫所有必填欄位');
        }
        
        console.log('📤 送出資料:', formData);
        
        // 送出到後端
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // 顯示成功訊息
        showMessage('請假單已成功送出！', 'success');
        
        // 重置表單
        setTimeout(() => {
            resetForm();
        }, 2000);
        
    } catch (error) {
        console.error('❌ 送出失敗:', error);
        showMessage(error.message || '送出失敗，請稍後再試', 'error');
    } finally {
        // 恢復按鈕
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ==================== 收集表單資料 ====================
function collectFormData() {
    const data = {
        employeeId: document.getElementById('employeeId').value.trim(),
        employeeName: document.getElementById('employeeName').value.trim(),
        leaveType: document.getElementById('leaveType').value,
        reason: document.getElementById('reason').value.trim(),
        affectedCases: document.getElementById('affectedCases').value.trim() || '無',
        handoverComplete: document.getElementById('handoverComplete').value,
        remarks: document.getElementById('remarks').value.trim() || '無',
        days: parseFloat(document.getElementById('manualDays').value) || 0,
        hours: parseFloat(document.getElementById('manualHours').value) || 0,
        timeMode: currentMode
    };
    
    // 根據模式添加日期時間資料
    if (currentMode === 'continuous') {
        const startDate = document.getElementById('startDate').value;
        const startTime = document.getElementById('startTime').value;
        const endDate = document.getElementById('endDate').value;
        const endTime = document.getElementById('endTime').value;
        
        data.startDate = `${startDate} ${startTime}`;
        data.endDate = `${endDate} ${endTime}`;
    } else {
        const singleDate = document.getElementById('singleDate').value;
        const startTime = document.getElementById('singleStartTime').value;
        const endTime = document.getElementById('singleEndTime').value;
        
        data.startDate = `${singleDate} ${startTime}`;
        data.endDate = `${singleDate} ${endTime}`;
    }
    
    return data;
}

// ==================== 驗證表單資料 ====================
function validateFormData(data) {
    // 必填欄位檢查
    const required = ['employeeId', 'employeeName', 'leaveType', 'reason', 'handoverComplete'];
    
    for (const field of required) {
        if (!data[field]) {
            showMessage(`請填寫：${getFieldName(field)}`, 'error');
            return false;
        }
    }
    
    // 天數與時數檢查
    if (data.days <= 0 || data.hours <= 0) {
        showMessage('請填寫天數與時數', 'error');
        return false;
    }
    
    return true;
}

function getFieldName(field) {
    const names = {
        employeeId: '員工編號',
        employeeName: '員工姓名',
        leaveType: '請假類別',
        reason: '請假事由',
        handoverComplete: '交接狀態'
    };
    return names[field] || field;
}

// ==================== 重置表單 ====================
function resetForm() {
    document.getElementById('leaveForm').reset();
    
    // 重置日期
    initializeDates();
    
    // 重置模式
    switchMode('continuous');
    
    // 重置計數器
    document.getElementById('reasonCount').textContent = '0';
    document.getElementById('affectedCount').textContent = '0';
    document.getElementById('remarksCount').textContent = '0';
    
    // 清空員工編號
    document.getElementById('employeeId').value = '';
    
    // 清空天數時數
    document.getElementById('manualDays').value = '';
    document.getElementById('manualHours').value = '';
    
    // 隱藏訊息
    hideMessage();
}

// ==================== 顯示訊息 ====================
function showMessage(message, type) {
    const messageElement = document.getElementById('statusMessage');
    messageElement.textContent = message;
    messageElement.className = `status-message ${type} show`;
    
    // 5 秒後自動隱藏
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    const messageElement = document.getElementById('statusMessage');
    messageElement.classList.remove('show');
}

// ==================== 旋轉動畫 ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .rotating {
        animation: rotate 1s linear infinite;
    }
`;
document.head.appendChild(style);

// ==================== 全域函式（供 HTML 呼叫）====================
window.resetForm = resetForm;

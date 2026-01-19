// ==================== 設定區 ====================
// ⚠️ 請在下面這行填入你的 Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfp1Tj9qlNlxjujJbkDMJoP5D5fvrodAfmz4MnPkPBcfmjK7B9oMyFtK1ZBObeV4cx3g/exec';

// 例如：
// const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfp1Tj9qlNlxjujJbkDMJoP5D5fvrodAfmz4MnPkPBcfmjK7B9oMyFtK1ZBObeV4cx3g/exec';

// GitHub Pages 網址（用於 CORS 驗證）
const FRONTEND_URL = 'https://tom26757207.github.io/shifeng-leave-system';

// ==================== 以下程式碼不要改 ====================

// 全域變數
let employeeList = []; // 員工清單
let selectedEmployee = null; // 已選擇的員工

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('表單初始化中...');
    
    // 載入員工清單
    loadEmployeeList();
    
    // 設定日期欄位最小值為今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').setAttribute('min', today);
    document.getElementById('endDate').setAttribute('min', today);
    
    // 監聽起始日期變更
    document.getElementById('startDate').addEventListener('change', function() {
        const startDate = this.value;
        document.getElementById('endDate').setAttribute('min', startDate);
        calculateDays();
    });
    
    // 監聽結束日期變更
    document.getElementById('endDate').addEventListener('change', function() {
        calculateDays();
    });
    
    // 監聽員工姓名輸入（自動完成）
    const employeeNameInput = document.getElementById('employeeName');
    employeeNameInput.addEventListener('input', handleEmployeeInput);
    employeeNameInput.addEventListener('focus', handleEmployeeInput);
    
    // 點擊其他地方關閉下拉選單
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideAutocomplete();
        }
    });
    
    // 表單送出處理
    document.getElementById('leaveForm').addEventListener('submit', handleSubmit);
});

// 載入員工清單
async function loadEmployeeList() {
    try {
        console.log('正在載入員工清單...');
        
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getEmployees`);
        
        if (!response.ok) {
            throw new Error('載入員工清單失敗');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            employeeList = data.employees;
            console.log(`成功載入 ${employeeList.length} 位員工`);
        } else {
            throw new Error(data.message || '載入失敗');
        }
        
    } catch (error) {
        console.error('載入員工清單錯誤:', error);
        console.log('將使用離線模式，允許手動輸入員工資訊');
        employeeList = [];
    }
}

// 處理員工姓名輸入
function handleEmployeeInput(e) {
    const input = e.target.value.trim();
    const autocompleteList = document.getElementById('autocompleteList');
    
    if (selectedEmployee) {
        hideAutocomplete();
        return;
    }
    
    autocompleteList.innerHTML = '';
    
    if (input.length === 0) {
        hideAutocomplete();
        return;
    }
    
    if (employeeList.length === 0) {
        autocompleteList.innerHTML = `
            <div class="autocomplete-no-result">
                ℹ️ 系統尚未載入員工資料，請直接輸入完整姓名
            </div>
        `;
        showAutocomplete();
        return;
    }
    
    const matches = employeeList.filter(emp => 
        emp.emp_name.includes(input) || 
        emp.emp_id.includes(input)
    );
    
    if (matches.length > 0) {
        matches.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="autocomplete-item-main">${emp.emp_name}</div>
                <div class="autocomplete-item-sub">員工編號：${emp.emp_id}</div>
            `;
            item.addEventListener('click', () => selectEmployee(emp));
            autocompleteList.appendChild(item);
        });
        showAutocomplete();
    } else {
        autocompleteList.innerHTML = `
            <div class="autocomplete-no-result">
                找不到符合的員工，請確認姓名是否正確
            </div>
        `;
        showAutocomplete();
    }
}

// 選擇員工
function selectEmployee(emp) {
    selectedEmployee = emp;
    
    const employeeNameInput = document.getElementById('employeeName');
    employeeNameInput.value = emp.emp_name;
    employeeNameInput.setAttribute('readonly', true);
    employeeNameInput.classList.add('bg-gray-100');
    
    document.getElementById('employeeId').value = emp.emp_id;
    
    document.getElementById('displayEmpId').textContent = emp.emp_id;
    document.getElementById('displayEmpName').textContent = emp.emp_name;
    document.getElementById('employeeDisplay').classList.add('active');
    
    hideAutocomplete();
    
    console.log('已選擇員工:', emp);
}

// 清除已選擇的員工
function clearEmployee() {
    selectedEmployee = null;
    
    const employeeNameInput = document.getElementById('employeeName');
    employeeNameInput.value = '';
    employeeNameInput.removeAttribute('readonly');
    employeeNameInput.classList.remove('bg-gray-100');
    employeeNameInput.focus();
    
    document.getElementById('employeeId').value = '';
    document.getElementById('employeeDisplay').classList.remove('active');
}

// 顯示/隱藏下拉選單
function showAutocomplete() {
    document.getElementById('autocompleteList').classList.add('active');
}

function hideAutocomplete() {
    document.getElementById('autocompleteList').classList.remove('active');
}

// 自動計算天數
function calculateDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays >= 0) {
            document.getElementById('days').value = diffDays;
            document.getElementById('hours').value = diffDays * 8;
        } else {
            alert('結束日期不能早於起始日期');
            document.getElementById('endDate').value = '';
        }
    }
}

// 表單送出處理
async function handleSubmit(event) {
    event.preventDefault();
    
    const employeeName = document.getElementById('employeeName').value.trim();
    const employeeId = document.getElementById('employeeId').value.trim();
    
    if (!employeeName) {
        alert('請輸入您的姓名');
        document.getElementById('employeeName').focus();
        return;
    }
    
    let empData;
    if (selectedEmployee) {
        empData = {
            emp_id: selectedEmployee.emp_id,
            emp_name: selectedEmployee.emp_name
        };
    } else {
        empData = {
            emp_id: 'TEMP_' + employeeName,
            emp_name: employeeName
        };
        console.log('使用離線模式，臨時員工編號:', empData.emp_id);
    }
    
    document.getElementById('loading').classList.add('active');
    
    try {
        const formData = getFormData(empData);
        
        if (!validateFormData(formData)) {
            throw new Error('表單資料驗證失敗');
        }
        
        console.log('準備送出資料:', formData);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submitLeave',
                data: formData,
                origin: FRONTEND_URL
            })
        });
        
        console.log('請假申請已送出');
        
        const tempLeaveId = generateTempLeaveId();
        showSuccessModal(tempLeaveId);
        
        document.getElementById('leaveForm').reset();
        clearEmployee();
        
    } catch (error) {
        console.error('送出失敗:', error);
        alert('送出失敗，請檢查網路連線或聯繫管理者\n\n錯誤訊息：' + error.message);
    } finally {
        document.getElementById('loading').classList.remove('active');
    }
}

// 取得表單資料
function getFormData(empData) {
    return {
        emp_id: empData.emp_id,
        emp_name: empData.emp_name,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        days: parseFloat(document.getElementById('days').value),
        hours: parseFloat(document.getElementById('hours').value),
        leave_type: document.getElementById('leaveType').value,
        reason: document.getElementById('reason').value.trim(),
        affected_cases: document.getElementById('affectedCases').value.trim() || '無',
        handover_status: document.querySelector('input[name="handoverStatus"]:checked').value,
        notes: document.getElementById('notes').value.trim() || '無',
        submit_time: new Date().toISOString()
    };
}

// 驗證表單資料
function validateFormData(data) {
    if (!data.emp_name) {
        alert('請輸入姓名');
        return false;
    }
    
    if (!data.start_date || !data.end_date) {
        alert('請填寫請假日期');
        return false;
    }
    
    if (!data.days || !data.hours) {
        alert('請填寫天數和時數');
        return false;
    }
    
    if (!data.leave_type) {
        alert('請選擇請假類別');
        return false;
    }
    
    if (!data.reason) {
        alert('請填寫請假事由');
        return false;
    }
    
    if (!data.handover_status) {
        alert('請選擇交接狀態');
        return false;
    }
    
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    
    if (endDate < startDate) {
        alert('結束日期不能早於起始日期');
        return false;
    }
    
    return true;
}

// 生成臨時請假單編號
function generateTempLeaveId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-4);
    return `LV${dateStr}${timeStr}`;
}

// 顯示成功訊息
function showSuccessModal(leaveId) {
    document.getElementById('leaveIdDisplay').textContent = leaveId;
    document.getElementById('successModal').classList.remove('hidden');
}

// 關閉成功訊息
function closeSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
}

// 錯誤處理
window.addEventListener('error', function(event) {
    console.error('全域錯誤:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未處理的 Promise 錯誤:', event.reason);
});
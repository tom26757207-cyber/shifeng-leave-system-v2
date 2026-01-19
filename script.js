// Apps Script 網址（請在部署後填入）
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZmKfzEDwB87tcWffoOLkKYINSRV4LFeHtZJ-Y4cGO-JKyx-p5viZGVVSdX059QXzMUA/exec';

// 全域變數
let employeesData = [];
let leaveTypesData = [];

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    loadLeaveTypes();
    setupAutocomplete();
    setupDateCalculation();
    setupTimeModeToggle();
});

// ========================================
// 時間模式切換
// ========================================
function setupTimeModeToggle() {
    const timeModeSelect = document.getElementById('time_mode');
    const dateMode = document.getElementById('dateMode');
    const timeMode = document.getElementById('timeMode');
    
    const startDate = document.getElementById('start_date');
    const endDate = document.getElementById('end_date');
    const leaveDate = document.getElementById('leave_date');
    const startTime = document.getElementById('start_time');
    const endTime = document.getElementById('end_time');

    timeModeSelect.addEventListener('change', function() {
        if (this.value === 'time') {
            // 切換到時間模式
            dateMode.style.display = 'none';
            timeMode.classList.add('active');
            
            startDate.removeAttribute('required');
            endDate.removeAttribute('required');
            leaveDate.setAttribute('required', 'required');
            startTime.setAttribute('required', 'required');
            endTime.setAttribute('required', 'required');
        } else {
            // 切換到日期模式
            dateMode.style.display = 'grid';
            timeMode.classList.remove('active');
            
            startDate.setAttribute('required', 'required');
            endDate.setAttribute('required', 'required');
            leaveDate.removeAttribute('required');
            startTime.removeAttribute('required');
            endTime.removeAttribute('required');
        }
        
        // 重新計算天數/時數
        calculateDaysAndHours();
    });

    // 時間改變時自動計算時數
    startTime.addEventListener('change', calculateDaysAndHours);
    endTime.addEventListener('change', calculateDaysAndHours);
    leaveDate.addEventListener('change', calculateDaysAndHours);
}

// ========================================
// 載入員工資料
// ========================================
async function loadEmployees() {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getEmployees`);
        employeesData = await response.json();
    } catch (error) {
        console.error('載入員工資料失敗：', error);
        alert('⚠️ 載入員工資料失敗，請重新整理頁面');
    }
}

// ========================================
// 載入請假類別
// ========================================
async function loadLeaveTypes() {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getLeaveTypes`);
        leaveTypesData = await response.json();
        
        const select = document.getElementById('leave_type');
        leaveTypesData.forEach(type => {
            const option = document.createElement('option');
            option.value = type.type_name;
            option.textContent = type.type_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('載入請假類別失敗：', error);
    }
}

// ========================================
// 設定自動完成功能
// ========================================
function setupAutocomplete() {
    const input = document.getElementById('emp_name');
    const list = document.getElementById('autocompleteList');
    const empIdInput = document.getElementById('emp_id');

    input.addEventListener('input', function() {
        const value = this.value.trim().toLowerCase();
        
        if (value === '') {
            list.classList.remove('active');
            empIdInput.value = '';
            return;
        }

        // 過濾員工
        const filtered = employeesData.filter(emp => 
            emp.emp_name.toLowerCase().includes(value) || 
            emp.emp_id.toLowerCase().includes(value)
        );

        if (filtered.length === 0) {
            list.innerHTML = '<div class="autocomplete-item" style="color: #999;">查無符合的員工</div>';
            list.classList.add('active');
            empIdInput.value = '';
            return;
        }

        // 顯示結果
        list.innerHTML = filtered.map(emp => `
            <div class="autocomplete-item" data-emp-id="${emp.emp_id}" data-emp-name="${emp.emp_name}">
                <div class="emp-name">${emp.emp_name}</div>
                <div class="emp-id">${emp.emp_id}</div>
            </div>
        `).join('');

        list.classList.add('active');

        // 綁定點擊事件
        list.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', function() {
                const empId = this.getAttribute('data-emp-id');
                const empName = this.getAttribute('data-emp-name');
                
                if (empId && empName) {
                    input.value = empName;
                    empIdInput.value = empId;
                    list.classList.remove('active');
                }
            });
        });
    });

    // 點擊外部關閉列表
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.classList.remove('active');
        }
    });
}

// ========================================
// 自動計算天數與時數
// ========================================
function setupDateCalculation() {
    const startDate = document.getElementById('start_date');
    const endDate = document.getElementById('end_date');

    startDate.addEventListener('change', calculateDaysAndHours);
    endDate.addEventListener('change', calculateDaysAndHours);
}

function calculateDaysAndHours() {
    const timeMode = document.getElementById('time_mode').value;
    const daysInput = document.getElementById('days');
    const hoursInput = document.getElementById('hours');

    if (timeMode === 'date') {
        // 日期模式：計算天數
        const startDate = document.getElementById('start_date').value;
        const endDate = document.getElementById('end_date').value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            daysInput.value = diffDays;
            hoursInput.value = diffDays * 8;
        }
    } else {
        // 時間模式：計算時數
        const startTime = document.getElementById('start_time').value;
        const endTime = document.getElementById('end_time').value;

        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            
            let diffMs = end - start;
            if (diffMs < 0) {
                // 跨日
                diffMs += 24 * 60 * 60 * 1000;
            }
            
            const diffHours = diffMs / (1000 * 60 * 60);
            const diffDays = diffHours / 8;

            hoursInput.value = diffHours.toFixed(1);
            daysInput.value = diffDays.toFixed(2);
        }
    }
}

// ========================================
// 表單提交
// ========================================
document.getElementById('leaveForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // 驗證員工編號
    const empId = document.getElementById('emp_id').value;
    const empName = document.getElementById('emp_name').value;

    if (!empId) {
        alert('⚠️ 請從下拉選單選擇員工姓名');
        return;
    }

    // 顯示 Loading
    document.getElementById('loadingOverlay').classList.add('active');

    // 收集表單資料
    const timeMode = document.getElementById('time_mode').value;
    let startDate, endDate;

    if (timeMode === 'date') {
        startDate = document.getElementById('start_date').value;
        endDate = document.getElementById('end_date').value;
    } else {
        const leaveDate = document.getElementById('leave_date').value;
        const startTime = document.getElementById('start_time').value;
        const endTime = document.getElementById('end_time').value;
        
        startDate = `${leaveDate} ${startTime}`;
        endDate = `${leaveDate} ${endTime}`;
    }

    const formData = {
        action: 'submitLeave',
        emp_id: empId,
        emp_name: empName,
        start_date: startDate,
        end_date: endDate,
        days: parseFloat(document.getElementById('days').value) || 0,
        hours: parseFloat(document.getElementById('hours').value) || 0,
        leave_type: document.getElementById('leave_type').value,
        reason: document.getElementById('reason').value,
        affected_cases: document.getElementById('affected_cases').value,
        handover_status: document.getElementById('handover_status').value,
        notes: document.getElementById('notes').value
    };

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ 請假申請已提交成功！\n\n請假單編號：${result.leave_id}\n\n管理者已收到 LINE 通知。`);
            this.reset();
            document.getElementById('emp_id').value = '';
        } else {
            alert(`❌ 提交失敗：${result.message}`);
        }
    } catch (error) {
        console.error('提交錯誤：', error);
        alert('❌ 提交失敗，請稍後再試或聯繫管理者');
    } finally {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
});

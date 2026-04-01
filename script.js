// 存储key
const STORAGE_KEY = 'period_records';

// 初始化示例数据
const sampleData = [
    { start: '2024-01-10', end: '2024-01-15' },
    { start: '2024-02-07', end: '2024-02-12' },
    { start: '2024-03-06', end: '2024-03-11' }
];

// 获取所有记录
function getRecords() {
    const records = localStorage.getItem(STORAGE_KEY);
    if (records) {
        return JSON.parse(records);
    } else {
        // 如果没有数据，添加示例数据
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
        return sampleData;
    }
}

// 保存记录
function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    updateUI();
}

// 计算持续天数
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}

// 计算平均周期
function calculateAverageCycle(records) {
    if (records.length < 2) return null;
    
    let cycles = [];
    for (let i = 1; i < records.length; i++) {
        const prevStart = new Date(records[i-1].start);
        const currStart = new Date(records[i].start);
        const cycleDays = Math.round((currStart - prevStart) / (1000 * 60 * 60 * 24));
        cycles.push(cycleDays);
    }
    
    const avg = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    return Math.round(avg);
}

// 计算平均经期长度
function calculateAveragePeriod(records) {
    if (records.length === 0) return null;
    
    const durations = records.map(record => calculateDuration(record.start, record.end));
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return Math.round(avg);
}

// 预测下次经期
function predictNextPeriod(records) {
    if (records.length === 0) return null;
    
    const avgCycle = calculateAverageCycle(records);
    if (!avgCycle) return null;
    
    const lastStart = new Date(records[records.length - 1].start);
    const nextStart = new Date(lastStart);
    nextStart.setDate(lastStart.getDate() + avgCycle);
    
    const avgPeriod = calculateAveragePeriod(records);
    const nextEnd = new Date(nextStart);
    if (avgPeriod) {
        nextEnd.setDate(nextStart.getDate() + avgPeriod - 1);
    }
    
    return {
        start: nextStart,
        end: nextEnd,
        cycle: avgCycle,
        period: avgPeriod
    };
}

// 更新统计信息
function updateStats() {
    const records = getRecords();
    const avgCycle = calculateAverageCycle(records);
    const avgPeriod = calculateAveragePeriod(records);
    const nextPrediction = predictNextPeriod(records);
    
    document.getElementById('avgCycle').textContent = avgCycle || '--';
    document.getElementById('avgPeriod').textContent = avgPeriod || '--';
    
    if (nextPrediction) {
        const formatDate = (date) => {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        const startStr = formatDate(nextPrediction.start);
        const endStr = formatDate(nextPrediction.end);
        document.getElementById('nextPeriod').textContent = `${startStr} - ${endStr}`;
        
        // 更新预测卡片
        const today = new Date();
        const daysUntil = Math.round((nextPrediction.start - today) / (1000 * 60 * 60 * 24));
        
        let predictionHtml = `
            <p>📅 预计下次经期开始：<strong>${nextPrediction.start.toLocaleDateString('zh-CN')}</strong></p>
            <p>📆 预计结束：<strong>${nextPrediction.end.toLocaleDateString('zh-CN')}</strong></p>
            <p>⏰ 距离下次经期还有 <strong>${daysUntil}</strong> 天</p>
            <p>📊 基于 ${records.length} 次记录，平均周期 ${nextPrediction.cycle} 天</p>
        `;
        
        if (daysUntil <= 0) {
            predictionHtml = `<p>🌸 经期可能正在进行中，请注意休息保暖～</p>${predictionHtml}`;
        } else if (daysUntil <= 7) {
            predictionHtml = `<p>💕 即将进入经期，提前做好准备哦～</p>${predictionHtml}`;
        }
        
        document.getElementById('predictionContent').innerHTML = predictionHtml;
    } else {
        document.getElementById('nextPeriod').textContent = '--';
        document.getElementById('predictionContent').innerHTML = '<p>添加至少2次记录后即可预测下次经期</p>';
    }
}

// 更新历史记录表格
function updateHistoryTable() {
    const records = getRecords();
    const tbody = document.getElementById('historyBody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无记录，请添加</td></tr>';
        return;
    }
    
    // 按日期倒序排列
    const sortedRecords = [...records].sort((a, b) => new Date(b.start) - new Date(a.start));
    
    tbody.innerHTML = sortedRecords.map((record, index) => {
        const duration = calculateDuration(record.start, record.end);
        const originalIndex = records.findIndex(r => r.start === record.start && r.end === record.end);
        return `
            <tr>
                <td>${record.start}</td>
                <td>${record.end}</td>
                <td>${duration} 天</td>
                <td><button class="delete-btn" onclick="deleteRecord(${originalIndex})">删除</button></td>
            </tr>
        `;
    }).join('');
}

// 删除记录
function deleteRecord(index) {
    if (confirm('确定要删除这条记录吗？')) {
        const records = getRecords();
        records.splice(index, 1);
        saveRecords(records);
        updateUI();
    }
}

// 添加新记录
function addPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('请填写完整的开始和结束日期');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
        alert('结束日期不能早于开始日期');
        return;
    }
    
    const records = getRecords();
    
    // 检查是否重复
    const isDuplicate = records.some(record => record.start === startDate);
    if (isDuplicate) {
        alert('该日期已有记录，请勿重复添加');
        return;
    }
    
    records.push({
        start: startDate,
        end: endDate
    });
    
    // 按开始日期排序
    records.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    saveRecords(records);
    
    // 清空表单
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    alert('记录添加成功！');
}

// 清空所有数据
function clearAllData() {
    if (confirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！')) {
        localStorage.removeItem(STORAGE_KEY);
        updateUI();
        alert('所有数据已清空');
    }
}

// 更新整个UI
function updateUI() {
    updateStats();
    updateHistoryTable();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    // 设置默认结束日期为今天+4天
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 4);
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
});
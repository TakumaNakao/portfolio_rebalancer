import { getFunds, getCountries, getInitialComposition, updateFundName as stateUpdateFundName, addFund as stateAddFund, addCountry as stateAddCountry, deleteFund as stateDeleteFund, deleteCountry as stateDeleteCountry, readStateFromDOM } from './state.js';

let charts = { current: null, future: null };

export function renderTables(savedState = {}) {
    renderMainTable(savedState);
    renderTsumitateAllocation(savedState);
}

export function renderMainTable(savedState = {}) {
    const funds = getFunds();
    const countries = getCountries();
    const table = document.getElementById('main-input-table');
    table.innerHTML = '';
    const isInitialLoad = Object.keys(savedState).length === 0;

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headerRow.innerHTML = `<th class="header-cell" title="最適化計算で優先するファンドを1つ選択できます。クリックで選択・解除できます。">優先 / 投資信託</th>` +
        countries.map(c => {
            const deleteBtn = (c !== 'その他' && countries.length > 2)
                ? `<button class="delete-btn" onclick="uiDeleteCountry('${c}')" title="削除">×</button>`
                : '';
            return `<th class="header-cell">${c} ${deleteBtn}</th>`;
        }).join('') +
        `<th class="header-cell highlight-header">保有資産額(円)</th>`;

    const tbody = table.createTBody();
    funds.forEach(fund => {
        const row = tbody.insertRow();
        const isChecked = savedState.priorityFund === fund ? 'checked' : '';
        let rowHTML = `<td class="fund-name-cell">
            <div class="flex items-center">
                <input type="checkbox" name="priority-fund" value="${fund}" class="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" ${isChecked} onclick="handleCheckboxClick(this)">
                <input type="text" value="${fund}" class="flex-grow bg-transparent outline-none" onchange="uiUpdateFundName(this, '${fund}')">
                <button class="delete-btn ml-2" onclick="uiDeleteFund('${fund}')" title="削除">×</button>
            </div>
        </td>`;
        
        rowHTML += countries.map(country => {
            const value = savedState.compositions?.[fund]?.[country] ?? getInitialComposition(fund, country);
            if (country === 'その他') {
                return `<td class="input-cell readonly-cell"><input type="number" data-fund="${fund}" data-country="${country}" value="0" readonly></td>`;
            } else {
                return `<td class="input-cell"><input type="number" data-fund="${fund}" data-country="${country}" value="${value}" oninput="autoCalculateOther(this.closest('tr'))"></td>`;
            }
        }).join('');
        
        const assetValue = savedState.assets?.[fund] ?? 0;
        rowHTML += `<td class="input-cell highlight-cell"><input type="number" id="asset-${fund}" value="${assetValue}"></td>`;
        row.innerHTML = rowHTML;
    });

    const tfoot = table.createTFoot();
    const targetRow = tfoot.insertRow();
    let targetRowHTML = `<td class="fund-name-cell">目標割合 (%)</td>`;
    targetRowHTML += countries.map(c => {
        const defaultVal = isInitialLoad ? (100 / (countries.length-1)).toFixed(1) : 0;
        const value = savedState.targets?.[c] ?? defaultVal;
        if (c === 'その他') {
            return `<td class="input-cell highlight-cell readonly-cell"><input type="number" id="target-${c}" value="0" readonly></td>`;
        } else {
            return `<td class="input-cell highlight-cell"><input type="number" id="target-${c}" value="${value}" oninput="autoCalculateTargetOther()"></td>`;
        }
    }).join('');
    targetRowHTML += `<td class="highlight-cell"></td>`;
    targetRow.innerHTML = targetRowHTML;

    tbody.querySelectorAll('tr').forEach(row => autoCalculateOther(row));
    autoCalculateTargetOther();
}

export function autoCalculateOther(row) {
    const countries = getCountries();
    let total = 0;
    const otherInput = row.querySelector('input[data-country="その他"]');
    
    countries.forEach(country => {
        if (country !== 'その他') {
            const input = row.querySelector(`input[data-country="${country}"]`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        }
    });

    if (otherInput) {
        const otherValue = 100 - total;
        otherInput.value = otherValue.toFixed(1);
    }
}

export function autoCalculateTargetOther() {
    const countries = getCountries();
    let total = 0;
    const otherInput = document.getElementById('target-その他');

    countries.forEach(country => {
        if (country !== 'その他') {
            const input = document.getElementById(`target-${country}`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        }
    });
    
    if (otherInput) {
        const otherValue = 100 - total;
        otherInput.value = otherValue.toFixed(1);
    }
}

export function renderTsumitateAllocation(savedState = {}) {
    const funds = getFunds();
    const container = document.getElementById('tsumitate-allocation');
    const isInitialLoad = Object.keys(savedState).length === 0;
    const totalFunds = funds.length > 0 ? funds.length : 1;
    container.innerHTML = funds.map(fund => {
        const defaultVal = isInitialLoad ? (100 / totalFunds).toFixed(1) : 0;
        const value = savedState.tsumitateAllocation?.[fund] ?? defaultVal;
        return `
        <div class="flex items-center justify-between">
            <label for="tsumitate-alloc-${fund}" class="text-gray-600">${fund}</label>
            <input type="number" id="tsumitate-alloc-${fund}" class="w-20 text-right p-1 border rounded-md" value="${value}">
        </div>
    `}).join('');
}

export function displayPortfolio(type, title, portfolio, targets) {
    const countries = getCountries();
    const summaryDiv = document.getElementById(`${type}-portfolio-summary`);
    let tableHTML = `<table class="w-full text-left mx-auto max-w-sm">
        <thead><tr class="border-b"><th class="py-1">国・地域</th><th class="py-1 text-right">割合</th><th class="py-1 text-right">目標との差</th></tr></thead><tbody>`;
    
    const labels = [];
    const chartData = [];
    
    countries.forEach(country => {
        const ratio = portfolio.totalAsset > 0 ? (portfolio.byCountry[country] / portfolio.totalAsset) * 100 : 0;
        const diff = ratio - (targets[country] * 100);
        const diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
        const diffSign = diff >= 0 ? '+' : '';

        tableHTML += `<tr>
            <td class="py-1">${country}</td>
            <td class="py-1 text-right">${ratio.toFixed(2)}%</td>
            <td class="py-1 text-right ${diffColor}">${diffSign}${diff.toFixed(2)}%</td>
        </tr>`;
        labels.push(country);
        chartData.push(portfolio.byCountry[country]);
    });
    tableHTML += `<tr class="border-t font-bold"><td class="py-1">合計</td><td class="py-1 text-right">${portfolio.totalAsset.toLocaleString()} 円</td><td></td></tr></tbody></table>`;
    summaryDiv.innerHTML = tableHTML;

    drawPieChart(type, labels, chartData);
}

export function displayProposal(allocation, total) {
    const funds = getFunds();
    const proposalDiv = document.getElementById('rebalance-proposal');
    let html = `<ul class="space-y-3">`;
    funds.forEach(fund => {
        const amount = allocation[fund] || 0;
        const percentage = total > 0 ? (amount / total * 100) : 0;
        html += `<li class="p-3 bg-white rounded-md shadow-sm">
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">${fund}</span>
                <span class="font-semibold text-indigo-700">${amount.toLocaleString()} 円</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${percentage}%"></div>
            </div>
        </li>`;
    });
    html += `</ul>`;
    proposalDiv.innerHTML = html;
}

export function drawPieChart(type, labels, data) {
    const ctx = document.getElementById(`${type}-pie-chart`).getContext('2d');
    if (charts[type]) {
        charts[type].destroy();
    }

    const isDarkMode = document.documentElement.classList.contains('dark');
    const legendColor = isDarkMode ? '#d1d5db' : '#4b5563'; // gray-300 or gray-600
    const borderColor = isDarkMode ? '#1f2937' : '#ffffff'; // gray-800 or white

    charts[type] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)',
                ],
                borderColor: borderColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: legendColor,
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

// UI-specific wrappers for state modification functions
export function uiUpdateFundName(inputElement, oldName) {
    const updatedState = stateUpdateFundName(inputElement, oldName);
    if (updatedState) {
        renderTables(updatedState);
    }
}

export function uiAddFund() {
    const fundName = prompt('追加する投資信託名を入力してください:');
    if (stateAddFund(fundName)) {
        renderTables(readStateFromDOM()); // Re-render with updated state
    } else if (fundName) {
        alert('その名前は既に使用されています。');
    }
}

export function uiAddCountry() {
    const countryName = prompt('追加する国・地域名を入力してください:');
    if (stateAddCountry(countryName)) {
        renderTables(readStateFromDOM()); // Re-render with updated state
    } else if (countryName) {
        alert('その名前は既に使用されているか、予約されています。');
    }
}

export function uiDeleteFund(fundName) {
    if (confirm(`「${fundName}」を削除しますか？`)) {
        const currentState = readStateFromDOM(); // Read current state before deletion
        if (stateDeleteFund(fundName)) {
            // Clean up state object for re-rendering
            if(currentState.assets) delete currentState.assets[fundName];
            if(currentState.compositions) delete currentState.compositions[fundName];
            if(currentState.tsumitateAllocation) delete currentState.tsumitateAllocation[fundName];
            if (currentState.priorityFund === fundName) {
                delete currentState.priorityFund;
            }
            renderTables(currentState);
        }
    }
}

export function uiDeleteCountry(countryName) {
    if (confirm(`「${countryName}」を削除しますか？`)) {
        const currentState = readStateFromDOM(); // Read current state before deletion
        if (stateDeleteCountry(countryName)) {
            // Clean up state object for re-rendering
            if(currentState.compositions) {
                getFunds().forEach(fund => { // Use getFunds() as funds array is already updated in stateDeleteCountry
                    if(currentState.compositions[fund]) {
                        delete currentState.compositions[fund][countryName];
                    }
                });
            }
            if(currentState.targets) delete currentState.targets[countryName];
            renderTables(currentState);
        }
    }
}

export function handleCheckboxClick(checkbox) {
    if (checkbox.checked) {
        // 他のチェックボックスをすべて外す
        document.querySelectorAll('input[name="priority-fund"]').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
    }
}
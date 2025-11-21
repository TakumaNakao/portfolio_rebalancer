// --- state.js ---
let funds = ['eMAXIS Slim 全世界株式', 'iFreeNEXT FANG+インデックス', 'eMAXIS Slim 新興国株式インデックス', 'SBI・V・先進国株式（除く米国）インデックス・ファンド', 'SBI・V・世界小型株式（除く米国）インデックス・ファンド'];
let countries = ['日本', '米国', '欧州', '新興国', 'その他'];
const STORAGE_KEY = 'portfolioRebalancerData';

function getFunds() {
    return funds;
}

function getCountries() {
    return countries;
}

function saveState() {
    const state = readStateFromDOM();
    state.funds = funds;
    state.countries = countries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const savedStateJSON = localStorage.getItem(STORAGE_KEY);
    if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);

        if (Array.isArray(savedState.funds) && savedState.funds.length > 0) {
            funds = savedState.funds;
        }
        if (Array.isArray(savedState.countries) && savedState.countries.length > 0) {
            countries = savedState.countries;
        }
        return savedState;
    }
    return {}; // Return empty object if no saved state
}

function readStateFromDOM() {
    const state = {
        assets: {},
        compositions: {},
        targets: {},
        tsumitateAllocation: {},
        tsumitateInvestment: document.getElementById('tsumitate-investment').value,
        growthInvestment: document.getElementById('growth-investment').value,
        priorityFund: document.querySelector('input[name="priority-fund"]:checked')?.value
    };

    funds.forEach(fund => {
        const assetInput = document.getElementById(`asset-${fund}`);
        if (assetInput) state.assets[fund] = assetInput.value;

        state.compositions[fund] = {};
        countries.forEach(country => {
            const input = document.querySelector(`input[data-fund="${fund}"][data-country="${country}"]`);
            if (input) state.compositions[fund][country] = input.value;
        });
        const tsumitateInput = document.getElementById(`tsumitate-alloc-${fund}`);
        if (tsumitateInput) state.tsumitateAllocation[fund] = tsumitateInput.value;
    });

    countries.forEach(country => {
        const targetInput = document.getElementById(`target-${country}`);
        if (targetInput) state.targets[country] = targetInput.value;
    });
    return state;
}

function updateFundName(inputElement, oldName) {
    const newName = inputElement.value.trim();
    if (newName && !funds.includes(newName)) {
        const currentState = readStateFromDOM(); // Read state before modifying funds array
        const index = funds.indexOf(oldName);
        funds[index] = newName;

        // Update currentState keys with new fund name
        if (currentState.assets) {
            currentState.assets[newName] = currentState.assets[oldName];
            delete currentState.assets[oldName];
        }
        if (currentState.compositions) {
            currentState.compositions[newName] = currentState.compositions[oldName];
            delete currentState.compositions[oldName];
        }
        if (currentState.tsumitateAllocation) {
            currentState.tsumitateAllocation[newName] = currentState.tsumitateAllocation[oldName];
            delete currentState.tsumitateAllocation[oldName];
        }

        // Update priorityFund if it was the one renamed
        if (currentState.priorityFund === oldName) {
            currentState.priorityFund = newName;
        }

        return currentState; // Return updated state to be used for re-rendering
    } else {
        inputElement.value = oldName; // Revert input if name is invalid or exists
        return null; // Indicate no change
    }
}

function addFund(fundName) {
    if (fundName && !funds.includes(fundName)) {
        funds.push(fundName);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

function addCountry(countryName) {
    if (countryName && !countries.includes(countryName) && countryName !== 'その他') {
        countries.splice(countries.length - 1, 0, countryName);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

function deleteFund(fundName) {
    const index = funds.indexOf(fundName);
    if (index > -1) {
        funds.splice(index, 1);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

function deleteCountry(countryName) {
    const index = countries.indexOf(countryName);
    if (index > -1) {
        countries.splice(index, 1);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

function getInitialComposition(fund, country) {
    const compositions = {
        'eMAXIS Slim 全世界株式': { '日本': 4.7, '米国': 64.1, '欧州': 10.0, '新興国': 10.5 },
        'iFreeNEXT FANG+インデックス': { '日本': 0, '米国': 100.0, '欧州': 0, '新興国': 0 },
        'eMAXIS Slim 新興国株式インデックス': { '日本': 0, '米国': 0, '欧州': 0, '新興国': 100.0 },
        'SBI・V・先進国株式（除く米国）インデックス・ファンド': { '日本': 20.7, '米国': 0, '欧州': 40.0, '新興国': 5.0 },
        'SBI・V・世界小型株式（除く米国）インデックス・ファンド': { '日本': 13.2, '米国': 0, '欧州': 15.0, '新興国': 23.8 }
    };
    if (!compositions[fund] || !compositions[fund][country]) {
        return 0;
    }
    return compositions[fund][country];
}

// --- calculator.js ---
function parseInputs() {
    // funds and countries are accessible from state.js scope
    // But getFunds() and getCountries() are better
    const fundsList = getFunds();
    const countriesList = getCountries();

    const compositions = {};
    let validationError = false;
    fundsList.forEach(fund => {
        if (validationError) return;
        compositions[fund] = {};
        let total = 0;
        countriesList.forEach(country => {
            const input = document.querySelector(`input[data-fund="${fund}"][data-country="${country}"]`);
            const val = parseFloat(input.value) || 0;
            compositions[fund][country] = val / 100;
            total += val;
        });
        if (Math.abs(total - 100) > 0.1) {
            alert(`${fund} の構成割合の合計が100%になりません。(現在: ${total.toFixed(1)}%)`);
            validationError = true;
        }
    });
    if (validationError) return null;

    const assets = {};
    fundsList.forEach(fund => {
        assets[fund] = parseFloat(document.getElementById(`asset-${fund}`).value) || 0;
    });

    const targets = {};
    let targetTotal = 0;
    countriesList.forEach(country => {
        const val = parseFloat(document.getElementById(`target-${country}`).value) || 0;
        targets[country] = val / 100;
        targetTotal += val;
    });
    if (Math.abs(targetTotal - 100) > 0.1) {
        alert(`目標割合の合計が100%になりません。(現在: ${targetTotal.toFixed(1)}%)`);
        return null;
    }

    const tsumitateAllocation = {};
    let tsumitateTotal = 0;
    fundsList.forEach(fund => {
        const val = parseFloat(document.getElementById(`tsumitate-alloc-${fund}`).value) || 0;
        tsumitateAllocation[fund] = val / 100;
        tsumitateTotal += val;
    });
    if (Math.abs(tsumitateTotal - 100) > 0.1) {
        alert(`つみたて投資枠の配分合計が100%になりません。(現在: ${tsumitateTotal.toFixed(1)}%)`);
        return null;
    }

    const priorityFundInput = document.querySelector('input[name="priority-fund"]:checked');
    const priorityFund = priorityFundInput ? priorityFundInput.value : null;

    return {
        compositions,
        assets,
        targets,
        tsumitateInvestment: parseFloat(document.getElementById('tsumitate-investment').value) || 0,
        tsumitateAllocation,
        growthInvestment: parseFloat(document.getElementById('growth-investment').value) || 0,
        priorityFund
    };
}

function calculateCurrentPortfolio(data) {
    const countriesList = getCountries();
    const fundsList = getFunds();

    const portfolio = {
        totalAsset: 0,
        byCountry: {}
    };
    countriesList.forEach(c => portfolio.byCountry[c] = 0);

    fundsList.forEach(fund => {
        const asset = data.assets[fund];
        portfolio.totalAsset += asset;
        countriesList.forEach(country => {
            portfolio.byCountry[country] += asset * data.compositions[fund][country];
        });
    });
    return portfolio;
}

function calculateFuturePortfolio(data, currentPortfolio, growthAllocation) {
    const countriesList = getCountries();
    const fundsList = getFunds();

    const futurePortfolio = {
        totalAsset: currentPortfolio.totalAsset + data.tsumitateInvestment + data.growthInvestment,
        byCountry: { ...currentPortfolio.byCountry }
    };

    fundsList.forEach(fund => {
        const tsumitateAmount = data.tsumitateInvestment * data.tsumitateAllocation[fund];
        countriesList.forEach(country => {
            futurePortfolio.byCountry[country] += tsumitateAmount * data.compositions[fund][country];
        });
    });

    fundsList.forEach(fund => {
        const growthAmount = growthAllocation[fund] || 0;
        countriesList.forEach(country => {
            futurePortfolio.byCountry[country] += growthAmount * data.compositions[fund][country];
        });
    });
    return futurePortfolio;
}

function originalFindOptimalAllocation(data, currentPortfolio) {
    const fundsList = getFunds();
    const { growthInvestment } = data;

    const currentAllocation = {};
    fundsList.forEach(f => currentAllocation[f] = 0);

    const stepAmount = 100;
    let budgetRemaining = growthInvestment;

    while (budgetRemaining >= stepAmount) {
        let bestFundToAllocate = null;
        let minError = Infinity;

        for (const fund of fundsList) {
            const tempAllocation = { ...currentAllocation };
            tempAllocation[fund] += stepAmount;

            const newError = calculateError(data, currentPortfolio, tempAllocation);

            if (newError < minError) {
                minError = newError;
                bestFundToAllocate = fund;
            }
        }

        if (bestFundToAllocate) {
            currentAllocation[bestFundToAllocate] += stepAmount;
            budgetRemaining -= stepAmount;
        } else {
            break;
        }
    }

    if (budgetRemaining > 0) {
        let bestFundForRemainder = null;
        let minErrorForRemainder = Infinity;
        for (const fund of fundsList) {
            const tempAllocation = { ...currentAllocation };
            tempAllocation[fund] += budgetRemaining;
            const newError = calculateError(data, currentPortfolio, tempAllocation);
            if (newError < minErrorForRemainder) {
                minErrorForRemainder = newError;
                bestFundForRemainder = fund;
            }
        }
        if (bestFundForRemainder) {
            currentAllocation[bestFundForRemainder] += budgetRemaining;
        }
    }

    return currentAllocation;
}

function findOptimalAllocation(data, currentPortfolio) {
    const fundsList = getFunds();
    const { growthInvestment, priorityFund } = data;

    if (growthInvestment <= 0 || fundsList.length === 0) {
        const allocation = {};
        fundsList.forEach(f => allocation[f] = 0);
        return allocation;
    }

    // 優先ファンドが指定されていない、またはリストにない場合は元のアルゴリズムを実行
    if (!priorityFund || !fundsList.includes(priorityFund)) {
        return originalFindOptimalAllocation(data, currentPortfolio);
    }

    // --- 新しいアルゴリズム ---

    // 1. ベース割り当て: 全額を優先ファンドに
    const currentAllocation = {};
    fundsList.forEach(f => currentAllocation[f] = 0);
    currentAllocation[priorityFund] = growthInvestment;

    const stepAmount = 100; // 100円単位で移動
    let amountToMove = growthInvestment;

    // 2. 補正: 資金を少しずつ移動させて最適化
    while (amountToMove >= stepAmount) {
        let bestFundToMoveTo = null;
        // 現在の配分での誤差を基準とする
        let minError = calculateError(data, currentPortfolio, currentAllocation);
        let bestAllocationAfterMove = null;

        // 優先ファンド以外のファンドに資金を移動させることを試す
        for (const otherFund of fundsList.filter(f => f !== priorityFund)) {
            const tempAllocation = { ...currentAllocation };
            tempAllocation[priorityFund] -= stepAmount;
            tempAllocation[otherFund] += stepAmount;

            const newError = calculateError(data, currentPortfolio, tempAllocation);

            if (newError < minError) {
                minError = newError;
                bestFundToMoveTo = otherFund;
                bestAllocationAfterMove = tempAllocation;
            }
        }

        if (bestFundToMoveTo) {
            // 最も誤差を改善する移動を実行
            Object.assign(currentAllocation, bestAllocationAfterMove);
            amountToMove -= stepAmount;
        } else {
            // これ以上どのファンドに移動しても誤差が改善しない
            break;
        }
    }

    // 3. 端数処理
    const remainder = amountToMove;
    if (remainder > 0 && remainder < stepAmount) {
        let bestFundToMoveToForRemainder = null;
        let minErrorForRemainder = calculateError(data, currentPortfolio, currentAllocation);
        let bestAllocationForRemainder = null;

        for (const otherFund of fundsList.filter(f => f !== priorityFund)) {
            const tempAllocation = { ...currentAllocation };
            if (tempAllocation[priorityFund] < remainder) continue; // 移動元資金が足りない場合はスキップ

            tempAllocation[priorityFund] -= remainder;
            tempAllocation[otherFund] += remainder;

            const newError = calculateError(data, currentPortfolio, tempAllocation);
            if (newError < minErrorForRemainder) {
                minErrorForRemainder = newError;
                bestFundToMoveToForRemainder = otherFund;
                bestAllocationForRemainder = tempAllocation;
            }
        }
        if (bestFundToMoveToForRemainder) {
            Object.assign(currentAllocation, bestAllocationForRemainder);
        }
    }

    return currentAllocation;
}

function calculateError(data, currentPortfolio, growthAllocation) {
    const countriesList = getCountries();
    const futurePortfolio = calculateFuturePortfolio(data, currentPortfolio, growthAllocation);
    let error = 0;

    countriesList.forEach(country => {
        const futureRatio = futurePortfolio.totalAsset > 0 ? futurePortfolio.byCountry[country] / futurePortfolio.totalAsset : 0;
        const targetRatio = data.targets[country];
        error += Math.pow(futureRatio - targetRatio, 2);
    });
    return error;
}

// --- ui.js ---
let charts = { current: null, future: null };

function renderTables(savedState = {}) {
    renderMainTable(savedState);
    renderTsumitateAllocation(savedState);
}

function renderMainTable(savedState = {}) {
    const fundsList = getFunds();
    const countriesList = getCountries();
    const table = document.getElementById('main-input-table');
    table.innerHTML = '';
    const isInitialLoad = Object.keys(savedState).length === 0;

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headerRow.innerHTML = `<th class="header-cell dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600" title="最適化計算で優先するファンドを1つ選択できます。クリックで選択・解除できます。">優先 / 投資信託</th>` +
        countriesList.map(c => {
            const deleteBtn = (c !== 'その他' && countriesList.length > 2)
                ? `<button class="delete-btn dark:text-slate-400 dark:hover:text-red-400" onclick="uiDeleteCountry('${c}')" title="削除">×</button>`
                : '';
            return `<th class="header-cell dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">${c} ${deleteBtn}</th>`;
        }).join('') +
        `<th class="header-cell highlight-header dark:bg-slate-600 dark:text-white dark:border-slate-500">保有資産額(円)</th>`;

    const tbody = table.createTBody();
    fundsList.forEach(fund => {
        const row = tbody.insertRow();
        const isChecked = savedState.priorityFund === fund ? 'checked' : '';
        let rowHTML = `<td class="fund-name-cell dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <div class="flex items-center">
                <input type="checkbox" name="priority-fund" value="${fund}" class="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-500" ${isChecked} onclick="handleCheckboxClick(this)">
                <input type="text" value="${fund}" class="flex-grow bg-transparent outline-none dark:text-slate-300" onchange="uiUpdateFundName(this, '${fund}')">
                <button class="delete-btn ml-2 dark:text-slate-400 dark:hover:text-red-400" onclick="uiDeleteFund('${fund}')" title="削除">×</button>
            </div>
        </td>`;

        rowHTML += countriesList.map(country => {
            const value = savedState.compositions?.[fund]?.[country] ?? getInitialComposition(fund, country);
            if (country === 'その他') {
                return `<td class="input-cell readonly-cell dark:bg-slate-900 dark:border-slate-700"><input type="number" data-fund="${fund}" data-country="${country}" value="0" readonly class="dark:bg-slate-900 dark:text-slate-400"></td>`;
            } else {
                return `<td class="input-cell dark:bg-slate-800 dark:border-slate-700"><input type="number" data-fund="${fund}" data-country="${country}" value="${value}" oninput="autoCalculateOther(this.closest('tr'))" class="dark:bg-slate-800 dark:text-white"></td>`;
            }
        }).join('');

        const assetValue = savedState.assets?.[fund] ?? 0;
        rowHTML += `<td class="input-cell highlight-cell dark:bg-slate-700 dark:border-slate-600"><input type="number" id="asset-${fund}" value="${assetValue}" class="dark:bg-slate-700 dark:text-white"></td>`;
        row.innerHTML = rowHTML;
    });

    const tfoot = table.createTFoot();
    const targetRow = tfoot.insertRow();
    let targetRowHTML = `<td class="fund-name-cell dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">目標割合 (%)</td>`;
    targetRowHTML += countriesList.map(c => {
        const defaultVal = isInitialLoad ? (100 / (countriesList.length - 1)).toFixed(1) : 0;
        const value = savedState.targets?.[c] ?? defaultVal;
        if (c === 'その他') {
            return `<td class="input-cell highlight-cell readonly-cell dark:bg-slate-900 dark:border-slate-700"><input type="number" id="target-${c}" value="0" readonly class="dark:bg-slate-900 dark:text-slate-400"></td>`;
        } else {
            return `<td class="input-cell highlight-cell dark:bg-slate-700 dark:border-slate-600"><input type="number" id="target-${c}" value="${value}" oninput="autoCalculateTargetOther()" class="dark:bg-slate-700 dark:text-white"></td>`;
        }
    }).join('');
    targetRowHTML += `<td class="highlight-cell dark:bg-slate-600 dark:border-slate-500"></td>`;
    targetRow.innerHTML = targetRowHTML;

    tbody.querySelectorAll('tr').forEach(row => autoCalculateOther(row));
    autoCalculateTargetOther();
}

function autoCalculateOther(row) {
    const countriesList = getCountries();
    let total = 0;
    const otherInput = row.querySelector('input[data-country="その他"]');

    countriesList.forEach(country => {
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

function autoCalculateTargetOther() {
    const countriesList = getCountries();
    let total = 0;
    const otherInput = document.getElementById('target-その他');

    countriesList.forEach(country => {
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

function renderTsumitateAllocation(savedState = {}) {
    const fundsList = getFunds();
    const container = document.getElementById('tsumitate-allocation');
    const isInitialLoad = Object.keys(savedState).length === 0;
    const totalFunds = fundsList.length > 0 ? fundsList.length : 1;
    container.innerHTML = fundsList.map(fund => {
        const defaultVal = isInitialLoad ? (100 / totalFunds).toFixed(1) : 0;
        const value = savedState.tsumitateAllocation?.[fund] ?? defaultVal;
        return `
        <div class="flex items-center justify-between">
            <label for="tsumitate-alloc-${fund}" class="text-gray-600 dark:text-slate-300">${fund}</label>
            <input type="number" id="tsumitate-alloc-${fund}" class="w-20 text-right p-1 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white" value="${value}">
        </div>
    `}).join('');
}

function displayPortfolio(type, title, portfolio, targets) {
    const countriesList = getCountries();
    const summaryDiv = document.getElementById(`${type}-portfolio-summary`);
    let tableHTML = `<table class="w-full text-left mx-auto max-w-sm dark:text-slate-200">
        <thead><tr class="border-b dark:border-slate-600"><th class="py-1">国・地域</th><th class="py-1 text-right">割合</th><th class="py-1 text-right">目標との差</th></tr></thead><tbody>`;

    const labels = [];
    const chartData = [];

    countriesList.forEach(country => {
        const ratio = portfolio.totalAsset > 0 ? (portfolio.byCountry[country] / portfolio.totalAsset) * 100 : 0;
        const diff = ratio - (targets[country] * 100);
        const diffColor = diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const diffSign = diff >= 0 ? '+' : '';

        tableHTML += `<tr class="border-b border-gray-100 dark:border-slate-700">
            <td class="py-1">${country}</td>
            <td class="py-1 text-right">${ratio.toFixed(2)}%</td>
            <td class="py-1 text-right ${diffColor}">${diffSign}${diff.toFixed(2)}%</td>
        </tr>`;
        labels.push(country);
        chartData.push(portfolio.byCountry[country]);
    });
    tableHTML += `<tr class="border-t font-bold dark:border-slate-600"><td class="py-1">合計</td><td class="py-1 text-right">${portfolio.totalAsset.toLocaleString()} 円</td><td></td></tr></tbody></table>`;
    summaryDiv.innerHTML = tableHTML;

    drawPieChart(type, labels, chartData);
}

function displayProposal(allocation, total) {
    const fundsList = getFunds();
    const proposalDiv = document.getElementById('rebalance-proposal');
    let html = `<ul class="space-y-3">`;
    fundsList.forEach(fund => {
        const amount = allocation[fund] || 0;
        const percentage = total > 0 ? (amount / total * 100) : 0;
        html += `<li class="p-3 bg-white dark:bg-slate-800 rounded-md shadow-sm transition-colors">
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800 dark:text-slate-200">${fund}</span>
                <span class="font-semibold text-indigo-700 dark:text-indigo-400">${amount.toLocaleString()} 円</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mt-1">
                <div class="bg-indigo-500 dark:bg-indigo-500 h-2.5 rounded-full" style="width: ${percentage}%"></div>
            </div>
        </li>`;
    });
    html += `</ul>`;
    proposalDiv.innerHTML = html;
}

function drawPieChart(type, labels, data) {
    const ctx = document.getElementById(`${type}-pie-chart`).getContext('2d');
    if (charts[type]) {
        charts[type].destroy();
    }

    const isDarkMode = document.documentElement.classList.contains('dark');
    const legendColor = isDarkMode ? '#cbd5e1' : '#4b5563'; // slate-300 or gray-600
    const borderColor = isDarkMode ? '#1e293b' : '#ffffff'; // slate-800 or white

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

function uiUpdateFundName(inputElement, oldName) {
    const updatedState = updateFundName(inputElement, oldName);
    if (updatedState) {
        renderTables(updatedState);
    }
}

function uiAddFund() {
    const fundName = prompt('追加する投資信託名を入力してください:');
    if (addFund(fundName)) {
        renderTables(readStateFromDOM()); // Re-render with updated state
    } else if (fundName) {
        alert('その名前は既に使用されています。');
    }
}

function uiAddCountry() {
    const countryName = prompt('追加する国・地域名を入力してください:');
    if (addCountry(countryName)) {
        renderTables(readStateFromDOM()); // Re-render with updated state
    } else if (countryName) {
        alert('その名前は既に使用されているか、予約されています。');
    }
}

function uiDeleteFund(fundName) {
    if (confirm(`「${fundName}」を削除しますか？`)) {
        const currentState = readStateFromDOM(); // Read current state before deletion
        if (deleteFund(fundName)) {
            // Clean up state object for re-rendering
            if (currentState.assets) delete currentState.assets[fundName];
            if (currentState.compositions) delete currentState.compositions[fundName];
            if (currentState.tsumitateAllocation) delete currentState.tsumitateAllocation[fundName];
            if (currentState.priorityFund === fundName) {
                delete currentState.priorityFund;
            }
            renderTables(currentState);
        }
    }
}

function uiDeleteCountry(countryName) {
    if (confirm(`「${countryName}」を削除しますか？`)) {
        const currentState = readStateFromDOM(); // Read current state before deletion
        if (deleteCountry(countryName)) {
            // Clean up state object for re-rendering
            if (currentState.compositions) {
                getFunds().forEach(fund => { // Use getFunds() as funds array is already updated in deleteCountry
                    if (currentState.compositions[fund]) {
                        delete currentState.compositions[fund][countryName];
                    }
                });
            }
            if (currentState.targets) delete currentState.targets[countryName];
            renderTables(currentState);
        }
    }
}

function handleCheckboxClick(checkbox) {
    if (checkbox.checked) {
        // 他のチェックボックスをすべて外す
        document.querySelectorAll('input[name="priority-fund"]').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
    }
}

// --- script.js ---
// Attach UI functions to the window object for direct calls from HTML onclick attributes
window.uiUpdateFundName = uiUpdateFundName;
window.uiAddFund = uiAddFund;
window.uiAddCountry = uiAddCountry;
window.uiDeleteFund = uiDeleteFund;
window.uiDeleteCountry = uiDeleteCountry;
window.autoCalculateOther = autoCalculateOther;
window.autoCalculateTargetOther = autoCalculateTargetOther;
window.handleCheckboxClick = handleCheckboxClick;


// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    // localStorageからテーマを読み込み、適用
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons();

    const savedState = loadState(); // データを読み込んでから描画
    renderTables(savedState); // Pass savedState to renderTables
    document.getElementById('tsumitate-investment').value = savedState.tsumitateInvestment || '100000';
    document.getElementById('growth-investment').value = savedState.growthInvestment || '100000';
    setupEventListeners();
});

// --- イベントリスナー設定 ---
function setupEventListeners() {
    document.getElementById('add-fund-btn').addEventListener('click', uiAddFund);
    document.getElementById('add-country-btn').addEventListener('click', uiAddCountry);
    document.getElementById('calculate-btn').addEventListener('click', executeCalculation);
    document.getElementById('reset-btn').addEventListener('click', resetApplication);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// --- テーマ管理 ---
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons();

    // 計算結果が表示されている場合のみ、グラフを再描画するために再計算
    if (!document.getElementById('result-section').classList.contains('hidden')) {
        executeCalculation();
    }
}

function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (isDark) {
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    } else {
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    }
}
// --- 計算実行 ---
function executeCalculation() {
    saveState();
    const data = parseInputs();
    if (!data) return;

    const currentPortfolio = calculateCurrentPortfolio(data);
    displayPortfolio('current', '現在のポートフォリオ', currentPortfolio, data.targets);

    const greedyAllocation = findOptimalAllocation(data, currentPortfolio);
    displayProposal(greedyAllocation, data.growthInvestment);

    const futurePortfolio = calculateFuturePortfolio(data, currentPortfolio, greedyAllocation);
    displayPortfolio('future', '1ヶ月後のポートフォリオ', futurePortfolio, data.targets);

    document.getElementById('result-section').classList.remove('hidden');
}

// --- アプリケーションリセット ---
function resetApplication() {
    if (confirm('すべてのデータをリセットして初期状態に戻しますか？')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload(); // Reload the page to apply default state
    }
}

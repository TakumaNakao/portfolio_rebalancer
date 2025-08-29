        // --- グローバル変数 ---
        let funds = ['オルカン', 'FANG+', '新興国インデックス', '先進国（除く米国）', '世界小型株（除く米国）'];
        let countries = ['日本', '米国', '欧州', '新興国', 'その他'];
        let charts = { current: null, future: null };

        // --- 初期化処理 ---
        document.addEventListener('DOMContentLoaded', () => {
            loadState(); // データを読み込んでから描画
            setupEventListeners();
        });

        // --- ローカルストレージ関連 ---
        const STORAGE_KEY = 'portfolioRebalancerData';

        function saveState() {
            const state = {
                funds,
                countries,
                assets: {},
                compositions: {},
                targets: {},
                tsumitateInvestment: document.getElementById('tsumitate-investment').value,
                growthInvestment: document.getElementById('growth-investment').value,
                tsumitateAllocation: {}
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

            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }

        function loadState() {
            const savedStateJSON = localStorage.getItem(STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                
                // 保存されたデータが有効な配列の場合のみグローバル変数を上書きする
                if (Array.isArray(savedState.funds) && savedState.funds.length > 0) {
                    funds = savedState.funds;
                }
                if (Array.isArray(savedState.countries) && savedState.countries.length > 0) {
                    countries = savedState.countries;
                }
                
                // テーブルを再描画
                renderTables();

                // 保存された値をフォームに設定
                document.getElementById('tsumitate-investment').value = savedState.tsumitateInvestment || '100000';
                document.getElementById('growth-investment').value = savedState.growthInvestment || '100000';

                if (savedState.funds) {
                    savedState.funds.forEach(fund => {
                        const assetInput = document.getElementById(`asset-${fund}`);
                        if (assetInput && savedState.assets) assetInput.value = savedState.assets[fund];

                        const tsumitateAllocInput = document.getElementById(`tsumitate-alloc-${fund}`);
                        if (tsumitateAllocInput && savedState.tsumitateAllocation) tsumitateAllocInput.value = savedState.tsumitateAllocation[fund];

                        if (savedState.countries && savedState.compositions && savedState.compositions[fund]) {
                            savedState.countries.forEach(country => {
                                const compInput = document.querySelector(`input[data-fund="${fund}"][data-country="${country}"]`);
                                if (compInput) compInput.value = savedState.compositions[fund][country];
                            });
                        }
                    });
                }

                if (savedState.countries && savedState.targets) {
                    savedState.countries.forEach(country => {
                        const targetInput = document.getElementById(`target-${country}`);
                        if (targetInput) targetInput.value = savedState.targets[country];
                    });
                }

            } else {
                // 保存されたデータがない場合は通常通り描画
                renderTables();
            }
        }

        // --- テーブル描画 ---
        function renderTables() {
            renderMainTable();
            renderTsumitateAllocation();
        }

        function renderMainTable() {
            const table = document.getElementById('main-input-table');
            table.innerHTML = ''; // テーブルをクリア

            // ヘッダー
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            headerRow.innerHTML = `<th class="header-cell">投資信託 / 構成比(%)</th>` +
                countries.map(c => `<th class="header-cell">${c}</th>`).join('') +
                `<th class="header-cell highlight-header">保有資産額(円)</th>`;

            // ボディ (各投資信託の行)
            const tbody = table.createTBody();
            funds.forEach(fund => {
                const row = tbody.insertRow();
                let rowHTML = `<td class="fund-name-cell"><input type="text" value="${fund}" class="w-full bg-transparent outline-none" onchange="updateFundName(this, '${fund}')"></td>`;
                
                rowHTML += countries.map(country => {
                    if (country === 'その他') {
                        return `<td class="input-cell readonly-cell"><input type="number" data-fund="${fund}" data-country="${country}" value="0" readonly></td>`;
                    } else {
                        return `<td class="input-cell"><input type="number" data-fund="${fund}" data-country="${country}" value="${getInitialComposition(fund, country)}" oninput="autoCalculateOther(this.closest('tr'))"></td>`;
                    }
                }).join('');
                
                rowHTML += `<td class="input-cell highlight-cell"><input type="number" id="asset-${fund}" value="1000000"></td>`;
                row.innerHTML = rowHTML;
            });

            // フッター (目標割合の行)
            const tfoot = table.createTFoot();
            const targetRow = tfoot.insertRow();
            let targetRowHTML = `<td class="fund-name-cell">目標割合 (%)</td>`;
            targetRowHTML += countries.map(c => {
                const initialValue = (100 / countries.length).toFixed(1);
                if (c === 'その他') {
                    return `<td class="input-cell highlight-cell readonly-cell"><input type="number" id="target-${c}" value="${initialValue}" readonly></td>`;
                } else {
                    return `<td class="input-cell highlight-cell"><input type="number" id="target-${c}" value="${initialValue}" oninput="autoCalculateTargetOther()"></td>`;
                }
            }).join('');
            targetRowHTML += `<td class="highlight-cell"></td>`; // 右端の空セル
            targetRow.innerHTML = targetRowHTML;

            // 「その他」の初期値を計算
            tbody.querySelectorAll('tr').forEach(row => autoCalculateOther(row));
            autoCalculateTargetOther();
        }

        function autoCalculateOther(row) {
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

        function autoCalculateTargetOther() {
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

        function renderTsumitateAllocation() {
            const container = document.getElementById('tsumitate-allocation');
            container.innerHTML = funds.map(fund => `
                <div class="flex items-center justify-between">
                    <label for="tsumitate-alloc-${fund}" class="text-gray-600">${fund}</label>
                    <input type="number" id="tsumitate-alloc-${fund}" class="w-20 text-right p-1 border rounded-md" value="${(100 / funds.length).toFixed(1)}">
                </div>
            `).join('');
        }
        
        // --- イベントリスナー設定 ---
        function setupEventListeners() {
            document.getElementById('add-fund-btn').addEventListener('click', addFund);
            document.getElementById('add-country-btn').addEventListener('click', addCountry);
            document.getElementById('calculate-btn').addEventListener('click', executeCalculation);
        }

        // --- データ更新・追加処理 ---
        function updateFundName(inputElement, oldName) {
            const newName = inputElement.value.trim();
            if (newName && !funds.includes(newName)) {
                const index = funds.indexOf(oldName);
                funds[index] = newName;
                renderTables(); // 名前が変わったので全体を再描画
            } else {
                inputElement.value = oldName; // 重複または空の場合は元に戻す
            }
        }

        function addFund() {
            const fundName = prompt('追加する投資信託名を入力してください:');
            if (fundName && !funds.includes(fundName)) {
                funds.push(fundName);
                renderTables();
            } else if (fundName) {
                alert('その名前は既に使用されています。');
            }
        }

        function addCountry() {
            const countryName = prompt('追加する国・地域名を入力してください:');
            if (countryName && !countries.includes(countryName) && countryName !== 'その他') {
                // 「その他」の前に新しい国を追加
                countries.splice(countries.length - 1, 0, countryName);
                renderTables();
            } else if (countryName) {
                alert('その名前は既に使用されているか、予約されています。');
            }
        }
        
        // --- 計算実行 ---
        function executeCalculation() {
            saveState(); // 計算実行時に現在の状態を保存
            const data = parseInputs();
            if (!data) return;

            // 1. 現状分析
            const currentPortfolio = calculateCurrentPortfolio(data);
            displayPortfolio('current', '現在のポートフォリオ', currentPortfolio, data.targets);

            // 2. 最適化計算
            const optimalAllocation = findOptimalAllocation(data, currentPortfolio);
            displayProposal(optimalAllocation, data.growthInvestment);

            // 3. 1ヶ月後予測
            const futurePortfolio = calculateFuturePortfolio(data, currentPortfolio, optimalAllocation);
            displayPortfolio('future', '1ヶ月後のポートフォリオ', futurePortfolio, data.targets);

            document.getElementById('result-section').classList.remove('hidden');
        }

        // --- 入力データ解析 ---
        function parseInputs() {
            const compositions = {};
            let validationError = false;
            funds.forEach(fund => {
                if (validationError) return;
                compositions[fund] = {};
                let total = 0;
                countries.forEach(country => {
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
            if(validationError) return null;


            const assets = {};
            funds.forEach(fund => {
                assets[fund] = parseFloat(document.getElementById(`asset-${fund}`).value) || 0;
            });

            const targets = {};
            let targetTotal = 0;
            countries.forEach(country => {
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
            funds.forEach(fund => {
                const val = parseFloat(document.getElementById(`tsumitate-alloc-${fund}`).value) || 0;
                tsumitateAllocation[fund] = val / 100;
                tsumitateTotal += val;
            });
            if (Math.abs(tsumitateTotal - 100) > 0.1) {
                alert(`つみたて投資枠の配分合計が100%になりません。(現在: ${tsumitateTotal.toFixed(1)}%)`);
                return null;
            }

            return {
                compositions,
                assets,
                targets,
                tsumitateInvestment: parseFloat(document.getElementById('tsumitate-investment').value) || 0,
                tsumitateAllocation,
                growthInvestment: parseFloat(document.getElementById('growth-investment').value) || 0,
            };
        }

        // --- ポートフォリオ計算ロジック ---
        function calculateCurrentPortfolio(data) {
            const portfolio = {
                totalAsset: 0,
                byCountry: {}
            };
            countries.forEach(c => portfolio.byCountry[c] = 0);

            funds.forEach(fund => {
                const asset = data.assets[fund];
                portfolio.totalAsset += asset;
                countries.forEach(country => {
                    portfolio.byCountry[country] += asset * data.compositions[fund][country];
                });
            });
            return portfolio;
        }

        function calculateFuturePortfolio(data, currentPortfolio, growthAllocation) {
            const futurePortfolio = {
                totalAsset: currentPortfolio.totalAsset + data.tsumitateInvestment + data.growthInvestment,
                byCountry: { ...currentPortfolio.byCountry }
            };

            // つみたて投資枠の加算
            funds.forEach(fund => {
                const tsumitateAmount = data.tsumitateInvestment * data.tsumitateAllocation[fund];
                countries.forEach(country => {
                    futurePortfolio.byCountry[country] += tsumitateAmount * data.compositions[fund][country];
                });
            });

            // 成長投資枠の加算
            funds.forEach(fund => {
                const growthAmount = growthAllocation[fund] || 0;
                countries.forEach(country => {
                    futurePortfolio.byCountry[country] += growthAmount * data.compositions[fund][country];
                });
            });
            return futurePortfolio;
        }

        // --- 最適化アルゴリズム ---
        function findOptimalAllocation(data, currentPortfolio) {
            const { growthInvestment } = data;

            if (growthInvestment <= 0 || funds.length === 0) {
                const allocation = {};
                funds.forEach(f => allocation[f] = 0);
                return allocation;
            }

            const currentAllocation = {};
            funds.forEach(f => currentAllocation[f] = 0);

            // 投資額を100個のチャンクに分割して、貪欲法で割り当てる
            const chunks = 100;
            const chunkAmount = growthInvestment / chunks;

            for (let i = 0; i < chunks; i++) {
                let bestFundToAllocate = null;
                let minError = Infinity;

                // どのファンドにチャンクを割り当てると最も誤差が減るか評価する
                for (const fund of funds) {
                    const tempAllocation = { ...currentAllocation };
                    tempAllocation[fund] += chunkAmount;
                    
                    const error = calculateError(data, currentPortfolio, tempAllocation);

                    if (error < minError) {
                        minError = error;
                        bestFundToAllocate = fund;
                    }
                }

                if (bestFundToAllocate) {
                    currentAllocation[bestFundToAllocate] += chunkAmount;
                }
            }

            // 金額を丸め、合計が投資額と一致するように調整する
            let totalAllocated = 0;
            funds.forEach(f => {
                currentAllocation[f] = Math.round(currentAllocation[f]);
                totalAllocated += currentAllocation[f];
            });

            let diff = growthInvestment - totalAllocated;
            if (diff !== 0 && funds.length > 0) {
                // 丸め誤差は、最も配分額の大きいファンドに加算して調整する
                let fundToAdjust = funds[0];
                let maxAmount = -1;
                funds.forEach(f => {
                    if (currentAllocation[f] > maxAmount) {
                        maxAmount = currentAllocation[f];
                        fundToAdjust = f;
                    }
                });
                currentAllocation[fundToAdjust] += diff;
            }

            return currentAllocation;
        }
        
        function calculateError(data, currentPortfolio, growthAllocation) {
            const futurePortfolio = calculateFuturePortfolio(data, currentPortfolio, growthAllocation);
            let error = 0;

            countries.forEach(country => {
                const futureRatio = futurePortfolio.totalAsset > 0 ? futurePortfolio.byCountry[country] / futurePortfolio.totalAsset : 0;
                const targetRatio = data.targets[country];
                error += Math.pow(futureRatio - targetRatio, 2);
            });
            return error;
        }

        // --- 結果表示 ---
        function displayPortfolio(type, title, portfolio, targets) {
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
        
        function displayProposal(allocation, total) {
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

        function drawPieChart(type, labels, data) {
            const ctx = document.getElementById(`${type}-pie-chart`).getContext('2d');
            if (charts[type]) {
                charts[type].destroy();
            }
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
                        borderColor: 'rgba(255, 255, 255, 1)',
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
                                padding: 15,
                                font: { size: 12 }
                            }
                        }
                    }
                }
            });
        }
        
        // --- 初期データ設定（サンプル） ---
        function getInitialComposition(fund, country) {
            const compositions = {
                'オルカン': { '日本': 5.5, '米国': 62.2, '欧州': 15.8, '新興国': 11.1 },
                'FANG+': { '日本': 0, '米国': 100, '欧州': 0, '新興国': 0 },
                '新興国インデックス': { '日本': 0, '米国': 10, '欧州': 5, '新興国': 85 },
                '先進国（除く米国）': { '日本': 20, '米国': 0, '欧州': 60, '新興国': 10 },
                '世界小型株（除くインデックス）': { '日本': 10, '米国': 30, '欧州': 30, '新興国': 20 }
            };
            return compositions[fund] ? (compositions[fund][country] || 0) : 0;
        }
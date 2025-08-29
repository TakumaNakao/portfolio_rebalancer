import { loadState, saveState } from './state.js';
import { parseInputs, calculateCurrentPortfolio, findOptimalAllocation, calculateFuturePortfolio } from './calculator.js';
import { renderTables, displayPortfolio, displayProposal, uiUpdateFundName, uiAddFund, uiAddCountry, uiDeleteFund, uiDeleteCountry, autoCalculateOther, autoCalculateTargetOther } from './ui.js';

// Attach UI functions to the window object for direct calls from HTML onclick attributes
window.uiUpdateFundName = uiUpdateFundName;
window.uiAddFund = uiAddFund;
window.uiAddCountry = uiAddCountry;
window.uiDeleteFund = uiDeleteFund;
window.uiDeleteCountry = uiDeleteCountry;
window.autoCalculateOther = autoCalculateOther;
window.autoCalculateTargetOther = autoCalculateTargetOther;


// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
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
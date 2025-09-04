import { loadState, saveState, STORAGE_KEY } from './state.js';
import { parseInputs, calculateCurrentPortfolio, findOptimalAllocation, calculateFuturePortfolio } from './calculator.js';
import { renderTables, displayPortfolio, displayProposal, uiUpdateFundName, uiAddFund, uiAddCountry, uiDeleteFund, uiDeleteCountry, autoCalculateOther, autoCalculateTargetOther, handleCheckboxClick } from './ui.js';

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

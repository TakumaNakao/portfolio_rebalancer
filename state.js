let funds = ['eMAXIS Slim 全世界株式', 'iFreeNEXT FANG+インデックス', 'eMAXIS Slim 新興国株式インデックス', 'SBI・V・先進国株式（除く米国）インデックス・ファンド', 'SBI・V・世界小型株式（除く米国）インデックス・ファンド'];
let countries = ['日本', '米国', '欧州', '新興国', 'その他'];
export const STORAGE_KEY = 'portfolioRebalancerData';

export function getFunds() {
    return funds;
}

export function getCountries() {
    return countries;
}

export function saveState() {
    const state = readStateFromDOM();
    state.funds = funds;
    state.countries = countries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState() {
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

export function readStateFromDOM() {
    const state = {
        assets: {},
        compositions: {},
        targets: {},
        tsumitateAllocation: {},
        tsumitateInvestment: document.getElementById('tsumitate-investment').value,
        growthInvestment: document.getElementById('growth-investment').value
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

export function updateFundName(inputElement, oldName) {
    const newName = inputElement.value.trim();
    if (newName && !funds.includes(newName)) {
        const currentState = readStateFromDOM(); // Read state before modifying funds array
        const index = funds.indexOf(oldName);
        funds[index] = newName;

        // Update currentState keys with new fund name
        if(currentState.assets) {
            currentState.assets[newName] = currentState.assets[oldName];
            delete currentState.assets[oldName];
        }
        if(currentState.compositions) {
            currentState.compositions[newName] = currentState.compositions[oldName];
            delete currentState.compositions[oldName];
        }
        if(currentState.tsumitateAllocation) {
            currentState.tsumitateAllocation[newName] = currentState.tsumitateAllocation[oldName];
            delete currentState.tsumitateAllocation[oldName];
        }
        return currentState; // Return updated state to be used for re-rendering
    } else {
        inputElement.value = oldName; // Revert input if name is invalid or exists
        return null; // Indicate no change
    }
}

export function addFund(fundName) {
    if (fundName && !funds.includes(fundName)) {
        funds.push(fundName);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

export function addCountry(countryName) {
    if (countryName && !countries.includes(countryName) && countryName !== 'その他') {
        countries.splice(countries.length - 1, 0, countryName);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

export function deleteFund(fundName) {
    const index = funds.indexOf(fundName);
    if (index > -1) {
        funds.splice(index, 1);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

export function deleteCountry(countryName) {
    const index = countries.indexOf(countryName);
    if (index > -1) {
        countries.splice(index, 1);
        return true; // Indicate success
    }
    return false; // Indicate failure
}

export function getInitialComposition(fund, country) {
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
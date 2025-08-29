import { getFunds, getCountries, readStateFromDOM } from './state.js';

export function parseInputs() {
    const funds = getFunds();
    const countries = getCountries();

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

export function calculateCurrentPortfolio(data) {
    const countries = getCountries();
    const funds = getFunds();

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

export function calculateFuturePortfolio(data, currentPortfolio, growthAllocation) {
    const countries = getCountries();
    const funds = getFunds();

    const futurePortfolio = {
        totalAsset: currentPortfolio.totalAsset + data.tsumitateInvestment + data.growthInvestment,
        byCountry: { ...currentPortfolio.byCountry }
    };

    funds.forEach(fund => {
        const tsumitateAmount = data.tsumitateInvestment * data.tsumitateAllocation[fund];
        countries.forEach(country => {
            futurePortfolio.byCountry[country] += tsumitateAmount * data.compositions[fund][country];
        });
    });

    funds.forEach(fund => {
        const growthAmount = growthAllocation[fund] || 0;
        countries.forEach(country => {
            futurePortfolio.byCountry[country] += growthAmount * data.compositions[fund][country];
        });
    });
    return futurePortfolio;
}

export function findOptimalAllocation(data, currentPortfolio) {
    const funds = getFunds();
    const { growthInvestment } = data;

    if (growthInvestment <= 0 || funds.length === 0) {
        const allocation = {};
        funds.forEach(f => allocation[f] = 0);
        return allocation;
    }

    const currentAllocation = {};
    funds.forEach(f => currentAllocation[f] = 0);

    const stepAmount = 100;
    let budgetRemaining = growthInvestment;

    while (budgetRemaining >= stepAmount) {
        let bestFundToAllocate = null;
        let minError = Infinity;

        for (const fund of funds) {
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
        for (const fund of funds) {
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

export function calculateError(data, currentPortfolio, growthAllocation) {
    const countries = getCountries();
    const futurePortfolio = calculateFuturePortfolio(data, currentPortfolio, growthAllocation);
    let error = 0;

    countries.forEach(country => {
        const futureRatio = futurePortfolio.totalAsset > 0 ? futurePortfolio.byCountry[country] / futurePortfolio.totalAsset : 0;
        const targetRatio = data.targets[country];
        error += Math.pow(futureRatio - targetRatio, 2);
    });
    return error;
}
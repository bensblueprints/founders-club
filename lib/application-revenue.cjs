const REVENUE_OPTIONS = [
    { value: 'under-100k', label: 'Less than $100,000 a year', labelVi: 'Dưới 100.000 USD mỗi năm' },
    { value: '100k-500k', label: '$100,000 to $500,000 a year', labelVi: '100.000 đến 500.000 USD mỗi năm' },
    { value: '500k-1m', label: '$500,000 to $1 million a year', labelVi: '500.000 đến 1 triệu USD mỗi năm' },
    { value: '1m-5m', label: '$1 million to $5 million a year', labelVi: '1 triệu đến 5 triệu USD mỗi năm' },
    { value: '5m-plus', label: '$5 million plus', labelVi: 'Trên 5 triệu USD mỗi năm' }
];

const optionByValue = new Map(REVENUE_OPTIONS.map(option => [option.value, option]));

function revenueOption(value) {
    return optionByValue.get(String(value || '').trim()) || null;
}

function revenueDecision(value, feeWillingness) {
    const option = revenueOption(value);
    if (!option) return null;
    if (option.value !== 'under-100k') return 'approved';
    if (feeWillingness === 'yes') return 'pending';
    if (feeWillingness === 'no') return 'declined';
    return null;
}

module.exports = { REVENUE_OPTIONS, revenueOption, revenueDecision };

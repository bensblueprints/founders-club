const assert = require('assert');
const {
    MEAL_CREDIT_VND, MENU_SECTIONS, SAUCES, STEAK_ADDITIONS,
    normalizeMealOrder
} = require('../lib/meal-menu.cjs');

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log(`  ok - ${name}`);
}

test('the photographed menu is represented by 73 dishes plus steak extras', () => {
    assert.strictEqual(MENU_SECTIONS.reduce((sum, section) => sum + section.items.length, 0), 73);
    assert.strictEqual(SAUCES.length, 6);
    assert.strictEqual(STEAK_ADDITIONS.length, 3);
    assert.strictEqual(SAUCES.find(item => item.id === 'truffle-cream').priceVnd, 165_000);
    assert.ok(MENU_SECTIONS.find(section => section.id === 'house-mains').items.some(item => item.id === 'french-duck-breast'));
    assert.ok(MENU_SECTIONS.find(section => section.id === 'seafood').items.some(item => item.id === 'king-crab'));
});

test('the server ignores browser-supplied prices and calculates restaurant charges', () => {
    const order = normalizeMealOrder([{ itemId:'homemade-wagyu-burger', quantity:1, priceVnd:1 }]);
    assert.strictEqual(order.subtotalVnd, 395_000);
    assert.strictEqual(order.vatVnd, 39_500);
    assert.strictEqual(order.serviceVnd, 19_750);
    assert.strictEqual(order.totalVnd, 454_250);
    assert.strictEqual(order.creditRemainingVnd, MEAL_CREDIT_VND - 454_250);
    assert.strictEqual(order.amountDueVnd, 0);
});

test('an order above 750K records the exact event-day balance', () => {
    const order = normalizeMealOrder([{ itemId:'double-wagyu-burger', quantity:1 }]);
    assert.strictEqual(order.subtotalVnd, 755_000);
    assert.strictEqual(order.totalVnd, 868_250);
    assert.strictEqual(order.creditAppliedVnd, 750_000);
    assert.strictEqual(order.amountDueVnd, 118_250);
});

test('every steak requires a valid cooking temperature', () => {
    assert.throws(() => normalizeMealOrder([{ itemId:'striploin', optionId:'stockyard-ms4-200', quantity:1 }]), /temperature/i);
    const order = normalizeMealOrder([{
        itemId:'striploin', optionId:'stockyard-ms4-200', temperature:'Medium Rare',
        sauceIds:['pepper-corn'], additionIds:['prawn-addition'], quantity:1
    }]);
    assert.strictEqual(order.items[0].unitPriceVnd, 975_000);
    assert.match(order.items[0].detail, /Medium Rare/);
    assert.match(order.items[0].detail, /Pepper Corn/);
    assert.match(order.items[0].detail, /Prawn/);
});

test('weighted shellfish enforces restaurant increments and preparation', () => {
    assert.throws(() => normalizeMealOrder([{ itemId:'lobster', weightG:150, preparation:'Baked', quantity:1 }]), /100g increments/i);
    const order = normalizeMealOrder([{ itemId:'lobster', weightG:300, preparation:'Baked with Cheese', quantity:1 }]);
    assert.strictEqual(order.subtotalVnd, 675_000);
    assert.strictEqual(order.items[0].weightG, 300);
    assert.strictEqual(order.items[0].preparation, 'Baked with Cheese');
});

console.log(`\nAll ${passed} meal-order tests passed.`);

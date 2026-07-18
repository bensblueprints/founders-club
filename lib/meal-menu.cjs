// The preorder menu is transcribed from the supplied FOR YOU Steakhouse menu.
// Prices are VND and, per the restaurant menu, exclude 10% VAT and 5% service.

const MEAL_CREDIT_VND = 750_000;
const VAT_RATE = 0.10;
const SERVICE_RATE = 0.05;

const TEMPERATURES = ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'];

const SAUCES = [
    { id:'pepper-corn', name:'Pepper Corn', priceVnd:75_000 },
    { id:'mushroom-sauce', name:'Mushroom', priceVnd:75_000 },
    { id:'bbq-sauce', name:'BBQ Sauce / Spicy BBQ Sauce', priceVnd:75_000 },
    { id:'red-wine', name:'Red Wine', priceVnd:125_000 },
    { id:'blue-cheese', name:'Blue Cheese', priceVnd:125_000 },
    { id:'truffle-cream', name:'Truffle Cream', priceVnd:165_000 }
];

const STEAK_ADDITIONS = [
    { id:'foie-gras-addition', name:'Foie Gras', priceVnd:295_000 },
    { id:'prawn-addition', name:'Prawn', priceVnd:155_000 },
    { id:'tiger-shrimp-addition', name:'Tiger Shrimp', priceVnd:345_000 }
];

const MENU_SECTIONS = [
    {
        id:'starters', flow:'appetizer', title:'Starters', shortTitle:'Starters',
        description:'Cheese, charcuterie and seafood plates for the table.',
        items:[
            { id:'grilled-provolone', name:'Grilled Provolone Cheese', priceVnd:185_000 },
            { id:'grilled-provolone-chorizo', name:'Grilled Provolone Cheese with Chorizo Sausage', priceVnd:275_000 },
            { id:'smoked-salmon-bread', name:'Smoked Salmon with Bread', priceVnd:195_000 },
            { id:'grilled-chorizo', name:'Grilled Chorizo Sausage', description:'Served with salad', priceVnd:215_000 },
            { id:'jamon-iberico-bread', name:'Jamón Ibérico with Bread', priceVnd:295_000 },
            { id:'calamari', name:'Calamari', priceVnd:255_000 },
            { id:'beef-carpaccio', name:'Beef Carpaccio', description:'Parmesan cheese, olive oil, rocket salad, Australian beef tenderloin and lemon', priceVnd:295_000 },
            { id:'smoked-salmon', name:'Smoked Salmon', description:'Olive oil, capers, bread, purple onions and lemon', priceVnd:295_000 },
            { id:'mixed-cheese-five', name:'Mixed Cheese 5 Kinds & Olive', description:'Comté, manchego, camembert, parmigiano, blue cheese and olive', priceVnd:395_000 },
            { id:'mixed-cold-cut-five', name:'Mixed Cold Cut 5 Kinds & Olive', description:'Jamón Ibérico, smoked chorizo sausage, prosciutto, parma ham, salami and olive', priceVnd:455_000 },
            { id:'jamon-iberico-48', name:'Jamón Ibérico 48 Months', priceVnd:252_000 },
            { id:'foie-gras', name:'Foie Gras', description:'With mixed berry bread', priceVnd:595_000 },
            { id:'caviar', name:'Caviar', description:'With bread', priceVnd:295_000 }
        ]
    },
    {
        id:'salads', flow:'appetizer', title:'Salads', shortTitle:'Salads',
        description:'Fresh salads, with chicken or shrimp available on the Caesar.',
        items:[
            { id:'mix-salad', name:'Mix Salad', description:'Tomatoes, lollo lettuce, crystal salad, radicchio, onions, cherry tomatoes and 4U homemade sauce', priceVnd:165_000 },
            { id:'beetroot-salad', name:'Beetroot Salad', description:'Beetroot, feta, crystal salad, lollo lettuce, tomatoes, cherry tomatoes and 4U homemade sauce', priceVnd:195_000 },
            { id:'caesar-salad', name:'Caesar Salad', description:'Romaine lettuce, herb croutons, bacon, parmesan and homemade Caesar dressing', priceVnd:195_000 },
            { id:'caesar-salad-chicken', name:'Caesar Salad with Chicken', priceVnd:265_000 },
            { id:'caesar-salad-shrimp', name:'Caesar Salad with Shrimp', priceVnd:265_000 },
            { id:'arugula-salad', name:'Arugula Salad', description:'Tomatoes, onions, parmesan and balsamic dressing on the side', priceVnd:215_000 },
            { id:'burrata-salad', name:'Burrata Salad', description:'Tomatoes, cherry tomatoes, basil, burrata cheese and 4U homemade sauce', priceVnd:225_000 }
        ]
    },
    {
        id:'soups', flow:'appetizer', title:'Soups', shortTitle:'Soups',
        description:'Choose a regular or large serving.',
        items:[
            { id:'pumpkin-soup', name:'Pumpkin Soup', options:[{ id:'regular', label:'Regular', priceVnd:75_000 }, { id:'large', label:'Large', priceVnd:125_000 }] },
            { id:'creamy-mushroom-soup', name:'Creamy Mushroom Soup', options:[{ id:'regular', label:'Regular', priceVnd:85_000 }, { id:'large', label:'Large', priceVnd:145_000 }] },
            { id:'lobster-crab-meat-soup', name:'Lobster and Crab Meat Soup', options:[{ id:'regular', label:'Regular', priceVnd:135_000 }, { id:'large', label:'Large', priceVnd:235_000 }] },
            { id:'beef-soup', name:'Beef Soup', options:[{ id:'regular', label:'Regular', priceVnd:165_000 }, { id:'large', label:'Large', priceVnd:315_000 }] }
        ]
    },
    {
        id:'house-mains', flow:'main', title:'Chef mains', shortTitle:'Chef mains',
        description:'Chicken, prawns, lamb, pork and duck from the main-course menu.',
        items:[
            { id:'grilled-chicken-leg', name:'Grilled Chicken Leg', description:'With grilled vegetables on skewers and pepper or mushroom sauce', priceVnd:355_000 },
            { id:'prawns', name:'Prawns', description:'Six pieces per order', options:[
                { id:'size-20-garlic-butter', label:'Size 20 · garlic butter sauce / olive oil', priceVnd:395_000 },
                { id:'size-25-baked-cheese', label:'Size 25 · baked with cheese', priceVnd:355_000 }
            ] },
            { id:'grilled-lamb-chops', name:'Grilled Lamb Chops', description:'With vegetables, asparagus, mushroom and pepper sauce', priceVnd:595_000 },
            { id:'pork-tenderloin-truffle', name:'Pork Tenderloin with Cream Truffle Mushroom Sauce', description:'With bread', priceVnd:555_000 },
            { id:'french-duck-breast', name:'French Duck Breast with Orange Sauce', description:'With baked potatoes and homemade 4U orange sauce', priceVnd:575_000 },
            { id:'spanish-grilled-pork-chops', name:'Spanish Grilled Pork Chops', description:'With grilled vegetables and mashed potatoes', priceVnd:655_000 }
        ]
    },
    {
        id:'pasta', flow:'main', title:'Pasta', shortTitle:'Pasta',
        description:'Eight pasta choices from light aglio e olio to crab and cream.',
        items:[
            { id:'spaghetti-aglio-e-olio', name:'Spaghetti Aglio e Olio', description:'Garlic, chilli, olive oil and parsley', priceVnd:185_000 },
            { id:'spaghetti-bolognese', name:'Spaghetti Bolognese', description:'Minced USA beef in traditional sauce', priceVnd:215_000 },
            { id:'spaghetti-prawns', name:'Spaghetti Prawns', description:'Prawn cooked in homemade sauce and whipping cream', priceVnd:255_000 },
            { id:'spaghetti-salmon', name:'Spaghetti Salmon', description:'Fresh salmon flakes, tomato sauce and herbs', priceVnd:275_000 },
            { id:'spaghetti-seafood', name:'Spaghetti Seafood with Pesto Sauce / Tomato Sauce', description:'Prawn, squid and homemade pesto or tomato sauce', priceVnd:275_000 },
            { id:'spaghetti-chorizo', name:'Spaghetti Chorizo Sausage', description:'Chorizo sausage in traditional sauce', priceVnd:295_000 },
            { id:'penne-steak-mushroom', name:'Penne Steak Mushroom', description:'With 4U homemade sauce', priceVnd:315_000 },
            { id:'spaghetti-crab-meat', name:'Spaghetti Crab Meat', description:'Crab meat mixed with cream, special sauce and herbs', priceVnd:595_000 }
        ]
    },
    {
        id:'steaks', flow:'main', title:'Steaks', shortTitle:'Steaks',
        description:'Choose the cut, grade and weight. Cooking temperature is required.',
        items:[
            { id:'fillet', name:'Fillet', requiresTemperature:true, allowSauces:true, allowSteakAdditions:true, options:[
                { id:'usda-prime-250', label:'USDA Prime · 250g', priceVnd:1_445_000 },
                { id:'usda-prime-350', label:'USDA Prime · 350g', priceVnd:1_945_000 },
                { id:'stockyard-ms4-250', label:'Stockyard MS4 · 250g', priceVnd:1_205_000 },
                { id:'stockyard-ms4-350', label:'Stockyard MS4 · 350g', priceVnd:1_545_000 },
                { id:'wagyu-australia-200', label:'Wagyu Australia 6/7+ · 200g', priceVnd:1_545_000 },
                { id:'wagyu-australia-300', label:'Wagyu Australia 6/7+ · 300g', priceVnd:2_145_000 },
                { id:'wagyu-hitachi-a5-200', label:'Wagyu Hitachi A5 · 200g', priceVnd:2_545_000 },
                { id:'wagyu-hitachi-a5-300', label:'Wagyu Hitachi A5 · 300g', priceVnd:3_545_000 }
            ] },
            { id:'rib-eye', name:'Rib Eye', requiresTemperature:true, allowSauces:true, allowSteakAdditions:true, options:[
                { id:'usda-prime-200', label:'USDA Prime · 200g', priceVnd:1_025_000 },
                { id:'usda-prime-300', label:'USDA Prime · 300g', priceVnd:1_425_000 },
                { id:'stockyard-ms4-200', label:'Stockyard MS4 · 200g', priceVnd:815_000 },
                { id:'stockyard-ms4-300', label:'Stockyard MS4 · 300g', priceVnd:1_195_000 },
                { id:'wagyu-australia-200', label:'Wagyu Australia 6/7+ · 200g', priceVnd:1_185_000 },
                { id:'wagyu-australia-300', label:'Wagyu Australia 6/7+ · 300g', priceVnd:1_645_000 },
                { id:'wagyu-hitachi-a5-200', label:'Wagyu Hitachi A5 · 200g', priceVnd:2_345_000 },
                { id:'wagyu-hitachi-a5-300', label:'Wagyu Hitachi A5 · 300g', priceVnd:3_345_000 }
            ] },
            { id:'striploin', name:'Striploin', requiresTemperature:true, allowSauces:true, allowSteakAdditions:true, options:[
                { id:'usda-prime-200', label:'USDA Prime · 200g', priceVnd:945_000 },
                { id:'usda-prime-300', label:'USDA Prime · 300g', priceVnd:1_275_000 },
                { id:'stockyard-ms4-200', label:'Stockyard MS4 · 200g', priceVnd:745_000 },
                { id:'stockyard-ms4-300', label:'Stockyard MS4 · 300g', priceVnd:995_000 },
                { id:'wagyu-australia-200', label:'Wagyu Australia 6/7+ · 200g', priceVnd:1_145_000 },
                { id:'wagyu-australia-300', label:'Wagyu Australia 6/7+ · 300g', priceVnd:1_475_000 },
                { id:'wagyu-hitachi-a5-200', label:'Wagyu Hitachi A5 · 200g', priceVnd:2_345_000 },
                { id:'wagyu-hitachi-a5-300', label:'Wagyu Hitachi A5 · 300g', priceVnd:3_345_000 }
            ] },
            { id:'porterhouse-usda', name:'Porterhouse USDA', description:'Minimum 700g', pricePer100gVnd:295_000, minWeightG:700, maxWeightG:3000, requiresTemperature:true, allowSauces:true, allowSteakAdditions:true },
            { id:'rib-eye-bone-in-wagyu', name:'Rib Eye Bone-In Wagyu 6/7+', description:'Minimum 1,100g', pricePer100gVnd:365_000, minWeightG:1100, maxWeightG:3500, requiresTemperature:true, allowSauces:true, allowSteakAdditions:true },
            { id:'tomahawk-wagyu', name:'Tomahawk Wagyu 6/7+', description:'Minimum 1,300g', pricePer100gVnd:395_000, minWeightG:1300, maxWeightG:4000, requiresTemperature:true, allowSauces:true, allowSteakAdditions:true }
        ]
    },
    {
        id:'seafood', flow:'main', title:'Seafood', shortTitle:'Seafood',
        description:'Fish, oysters and signature shellfish, with preparation recorded.',
        items:[
            { id:'grilled-oysters-local', name:'Grilled Oysters with Cheese · Local Oysters', description:'6 pieces', priceVnd:255_000 },
            { id:'grilled-oysters-japanese', name:'Grilled Oysters with Cheese · Japanese Oysters', description:'Per piece', priceVnd:125_000 },
            { id:'baked-sweet-snails', name:'Baked Sweet Snails', priceVnd:295_000 },
            { id:'garlic-butter-octopus', name:'Garlic Butter Japanese Succulent Octopus & Bread', description:'Octopus cooked in garlic butter / olive sauce', priceVnd:395_000 },
            { id:'grilled-salmon-orange', name:'Grilled Salmon with Orange / Passion Fruit Juice', description:'With mashed potatoes, grilled asparagus and sautéed vegetables', priceVnd:395_000 },
            { id:'baked-geoduck-bonzu', name:'Baked Geoduck with Bonzu Sauce', priceVnd:495_000 },
            { id:'baked-grouper', name:'Baked Grouper Fish / Olive Oil', description:'With mashed potatoes, grilled asparagus, sautéed vegetables or bread', priceVnd:425_000 },
            { id:'baked-sole', name:'Baked Sole', description:'With mashed potatoes, grilled asparagus and sautéed vegetables', priceVnd:525_000 },
            { id:'baked-cod-fish', name:'Baked Cod Fish with Orange Sauce / Butter & Lemon Sauce', description:'With mashed potatoes, grilled asparagus and sautéed vegetables', priceVnd:625_000 },
            { id:'baked-japanese-scallops', name:'Baked Japanese Scallops with Bonzu Sauce / Cheese', description:'Per piece', priceVnd:255_000, preparations:['Bonzu sauce', 'Cheese'] },
            { id:'baked-abalone', name:'Baked Abalone with Bonzu Sauce', description:'Per piece', priceVnd:225_000 },
            { id:'lobster', name:'Lobster', pricePer100gVnd:225_000, minWeightG:100, maxWeightG:4000, preparations:['Baked', 'Baked with Cajun', 'Baked with Cheese'] },
            { id:'king-prawns', name:'King Prawns', pricePer100gVnd:265_000, minWeightG:100, maxWeightG:3000, preparations:['Baked', 'Baked with Cajun', 'Baked with Cheese'] },
            { id:'slipper-lobster', name:'Slipper Lobster', pricePer100gVnd:355_000, minWeightG:100, maxWeightG:4000, preparations:['Baked', 'Baked with Cajun', 'Baked with Cheese', 'Baked with Truffle Cream Sauce'] },
            { id:'tropical-rock-lobster', name:'Tropical Rock Lobsters', pricePer100gVnd:385_000, minWeightG:100, maxWeightG:4000, preparations:['Baked', 'Baked with Cajun', 'Baked with Cheese'] },
            { id:'king-crab', name:'King Crab', pricePer100gVnd:385_000, minWeightG:100, maxWeightG:5000, preparations:['Baked', 'Grilled with Cheese', 'Steamed on a cold plate', 'Truffle Cream Sauce'] }
        ]
    },
    {
        id:'burgers', flow:'main', title:'Burgers', shortTitle:'Burgers',
        description:'Two Wagyu burger choices.',
        items:[
            { id:'double-wagyu-burger', name:'Double Wagyu Burger', priceVnd:755_000 },
            { id:'homemade-wagyu-burger', name:'Homemade Wagyu Burger', priceVnd:395_000 }
        ]
    },
    {
        id:'sides', flow:'sides', title:'Side dishes', shortTitle:'Sides',
        description:'Add one or more sides, or continue with no sides.',
        items:[
            { id:'corn-dipping-butter', name:'Corn Dipping with Butter', priceVnd:55_000 },
            { id:'sauteed-broccoli', name:'Sautéed Broccoli', priceVnd:75_000 },
            { id:'sauteed-vegetables', name:'Sautéed Vegetables', priceVnd:75_000 },
            { id:'mashed-potatoes', name:'Mashed Potatoes', priceVnd:85_000 },
            { id:'french-fries', name:'French Fries', priceVnd:85_000 },
            { id:'sauteed-mushroom', name:'Sautéed Mushroom', priceVnd:85_000 },
            { id:'macaroni-cheese', name:'Macaroni & Cheese', priceVnd:85_000 },
            { id:'grilled-skewers-vegetables', name:'Grilled Skewers Vegetables', priceVnd:85_000 },
            { id:'potatoes-gratin', name:'Potatoes Gratin', priceVnd:95_000 },
            { id:'sauteed-green-bean', name:'Sautéed Green Bean with Onion & Bacon', priceVnd:95_000 },
            { id:'asparagus', name:'Sautéed / Grilled / Boiled Asparagus', priceVnd:155_000 }
        ]
    }
];

const ITEM_INDEX = new Map();
for (const section of MENU_SECTIONS) {
    for (const item of section.items) ITEM_INDEX.set(item.id, { section, item });
}

function requireInteger(value, label, min, max) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new Error(`${label} must be between ${min} and ${max}`);
    }
    return number;
}

function uniqueIds(value) {
    return [...new Set(Array.isArray(value) ? value.map(String) : [])];
}

function normalizeMealLine(rawLine, index = 0) {
    const raw = rawLine || {};
    const found = ITEM_INDEX.get(String(raw.itemId || ''));
    if (!found) throw new Error('One of the selected menu items is no longer available');
    const { section, item } = found;
    const quantity = requireInteger(raw.quantity ?? 1, `${item.name} quantity`, 1, 12);
    let option = null;
    let weightG = null;
    let basePriceVnd = Number(item.priceVnd || 0);

    if (Array.isArray(item.options)) {
        option = item.options.find(candidate => candidate.id === String(raw.optionId || ''));
        if (!option) throw new Error(`Choose an option for ${item.name}`);
        basePriceVnd = option.priceVnd;
    }
    if (item.pricePer100gVnd) {
        weightG = requireInteger(raw.weightG, `${item.name} weight`, item.minWeightG, item.maxWeightG);
        if ((weightG - item.minWeightG) % 100 !== 0) throw new Error(`${item.name} weight must use 100g increments`);
        basePriceVnd = Math.round(item.pricePer100gVnd * weightG / 100);
    }

    const temperature = raw.temperature ? String(raw.temperature) : null;
    if (item.requiresTemperature && !TEMPERATURES.includes(temperature)) {
        throw new Error(`Choose a cooking temperature for ${item.name}`);
    }
    if (!item.requiresTemperature && temperature) throw new Error(`${item.name} does not accept a cooking temperature`);

    const preparation = raw.preparation ? String(raw.preparation) : null;
    if (Array.isArray(item.preparations) && !item.preparations.includes(preparation)) {
        throw new Error(`Choose a preparation for ${item.name}`);
    }
    if (!item.preparations && preparation) throw new Error(`${item.name} does not accept a preparation option`);

    const sauceIds = uniqueIds(raw.sauceIds);
    const additionIds = uniqueIds(raw.additionIds);
    if (!item.allowSauces && sauceIds.length) throw new Error(`${item.name} does not accept steak sauces`);
    if (!item.allowSteakAdditions && additionIds.length) throw new Error(`${item.name} does not accept steak additions`);
    const sauces = sauceIds.map(id => {
        const choice = SAUCES.find(candidate => candidate.id === id);
        if (!choice) throw new Error('Invalid steak sauce');
        return choice;
    });
    const additions = additionIds.map(id => {
        const choice = STEAK_ADDITIONS.find(candidate => candidate.id === id);
        if (!choice) throw new Error('Invalid steak addition');
        return choice;
    });
    const unitPriceVnd = basePriceVnd
        + sauces.reduce((sum, choice) => sum + choice.priceVnd, 0)
        + additions.reduce((sum, choice) => sum + choice.priceVnd, 0);
    const detail = [
        option?.label,
        weightG ? `${new Intl.NumberFormat('en-US').format(weightG)}g` : null,
        temperature,
        preparation,
        sauces.length ? `Sauce: ${sauces.map(choice => choice.name).join(', ')}` : null,
        additions.length ? `Add: ${additions.map(choice => choice.name).join(', ')}` : null
    ].filter(Boolean).join(' · ');
    const requestedLineId = String(raw.lineId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);

    return {
        lineId: requestedLineId || `${item.id}-${index + 1}`,
        itemId:item.id,
        name:item.name,
        categoryId:section.id,
        category:section.title,
        quantity,
        optionId:option?.id || null,
        optionLabel:option?.label || null,
        weightG,
        temperature:item.requiresTemperature ? temperature : null,
        preparation:item.preparations ? preparation : null,
        sauceIds,
        sauceNames:sauces.map(choice => choice.name),
        additionIds,
        additionNames:additions.map(choice => choice.name),
        detail,
        unitPriceVnd,
        lineTotalVnd:unitPriceVnd * quantity
    };
}

function normalizeMealOrder(rawLines, creditVnd = MEAL_CREDIT_VND, notes = '') {
    if (!Array.isArray(rawLines)) throw new Error('Meal selections must be a list');
    if (rawLines.length > 40) throw new Error('A meal order can contain at most 40 selections');
    const items = rawLines.map(normalizeMealLine);
    const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
    const vatVnd = Math.round(subtotalVnd * VAT_RATE);
    const serviceVnd = Math.round(subtotalVnd * SERVICE_RATE);
    const totalVnd = subtotalVnd + vatVnd + serviceVnd;
    const safeCredit = Math.max(0, Number(creditVnd) || 0);
    const creditAppliedVnd = Math.min(safeCredit, totalVnd);
    const amountDueVnd = Math.max(0, totalVnd - safeCredit);
    const creditRemainingVnd = Math.max(0, safeCredit - totalVnd);
    const safeNotes = String(notes || '').trim();
    if (safeNotes.length > 1000) throw new Error('Special requests must be 1,000 characters or fewer');
    return {
        version:1,
        items,
        notes:safeNotes,
        subtotalVnd,
        vatVnd,
        serviceVnd,
        totalVnd,
        creditVnd:safeCredit,
        creditAppliedVnd,
        amountDueVnd,
        creditRemainingVnd
    };
}

function itemStartingPrice(item) {
    if (item.priceVnd) return item.priceVnd;
    if (item.options) return Math.min(...item.options.map(option => option.priceVnd));
    if (item.pricePer100gVnd) return item.pricePer100gVnd * item.minWeightG / 100;
    return 0;
}

function sectionPriceRange(section) {
    const prices = section.items.map(itemStartingPrice);
    return { minVnd:Math.min(...prices), maxVnd:Math.max(...prices) };
}

module.exports = {
    MEAL_CREDIT_VND,
    VAT_RATE,
    SERVICE_RATE,
    TEMPERATURES,
    SAUCES,
    STEAK_ADDITIONS,
    MENU_SECTIONS,
    normalizeMealLine,
    normalizeMealOrder,
    itemStartingPrice,
    sectionPriceRange
};

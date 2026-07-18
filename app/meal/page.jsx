'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleDollarSign,
    Minus, Plus, ReceiptText, Sparkles, Trash2, UtensilsCrossed, WalletCards
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';
import mealMenu from '@/lib/meal-menu.cjs';

const {
    MEAL_CREDIT_VND, MENU_SECTIONS, SAUCES, STEAK_ADDITIONS, TEMPERATURES,
    normalizeMealOrder, sectionPriceRange
} = mealMenu;

const STEPS = [
    { id:'overview', label:'Overview' },
    { id:'appetizer', label:'Appetizer' },
    { id:'main', label:'Main course' },
    { id:'sides', label:'Sides' },
    { id:'dessert', label:'Dessert' },
    { id:'review', label:'Review' }
];

const STEP_COPY = {
    appetizer:{ eyebrow:'Step 1 of 4', title:'Do you want an appetizer?', description:'Choose from starters, salads or soups. Pick as many as you like, or continue without one.', skip:'No appetizer', next:'Continue to main course' },
    main:{ eyebrow:'Step 2 of 4', title:'Select your main course', description:'Browse one type of main at a time: chef mains, pasta, steaks, seafood or burgers.', skip:'No main course', next:'Continue to sides' },
    sides:{ eyebrow:'Step 3 of 4', title:'Would you like any sides?', description:'Add one or more sides for the table, or choose no sides.', skip:'No sides', next:'Continue to dessert' }
};

function formatVnd(value, compact = false) {
    const number = Number(value || 0);
    if (compact) {
        if (number >= 1_000_000) return `${Number((number / 1_000_000).toFixed(1))}M ₫`;
        return `${Number((number / 1_000).toFixed(0))}K ₫`;
    }
    return `${new Intl.NumberFormat('vi-VN').format(number)} ₫`;
}

function selectionKey(line) {
    return JSON.stringify([
        line.itemId, line.optionId || null, line.weightG || null, line.temperature || null,
        line.preparation || null, [...(line.sauceIds || [])].sort(), [...(line.additionIds || [])].sort()
    ]);
}

function createLineId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `meal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function QuantityControl({ value, onChange, compact = false, minimum = 1 }) {
    return <div className={`meal-qty ${compact ? 'compact' : ''}`} aria-label="Quantity">
        <button type="button" onClick={() => onChange(Math.max(minimum, value - 1))} aria-label="Decrease quantity"><Minus size={14}/></button>
        <span>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 1))} aria-label="Increase quantity"><Plus size={14}/></button>
    </div>;
}

function MenuItemCard({ item, cart, onAdd, onRemove, onQuantity }) {
    const [expanded, setExpanded] = useState(false);
    const [optionId, setOptionId] = useState(item.options?.[0]?.id || '');
    const [weightG, setWeightG] = useState(item.minWeightG || null);
    const [temperature, setTemperature] = useState('');
    const [preparation, setPreparation] = useState(item.preparations?.[0] || '');
    const [sauceIds, setSauceIds] = useState([]);
    const [additionIds, setAdditionIds] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const complex = Boolean(item.options || item.pricePer100gVnd || item.requiresTemperature || item.preparations || item.allowSauces || item.allowSteakAdditions);

    const rawLine = {
        lineId:createLineId(), itemId:item.id, quantity, optionId:optionId || null,
        weightG, temperature:temperature || null, preparation:preparation || null,
        sauceIds, additionIds
    };
    const pricedLine = { ...rawLine, temperature:item.requiresTemperature ? (temperature || TEMPERATURES[0]) : null };
    let itemPreview = null;
    let orderPreview = null;
    try {
        itemPreview = normalizeMealOrder([pricedLine]);
        orderPreview = normalizeMealOrder([...cart, pricedLine]);
    } catch (_) {}
    const selectedPrice = itemPreview?.subtotalVnd || item.priceVnd || 0;
    const wouldExceed = Boolean(orderPreview?.amountDueVnd > 0);
    const minPrice = item.options ? Math.min(...item.options.map(option => option.priceVnd))
        : item.pricePer100gVnd ? item.pricePer100gVnd * item.minWeightG / 100 : item.priceVnd;
    const selectedLines = cart.filter(line => line.itemId === item.id);
    const selectedQuantity = selectedLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);

    function toggle(setter, current, id) {
        setter(current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    }

    function add() {
        if (item.requiresTemperature && !temperature) return;
        onAdd(rawLine);
        setQuantity(1);
        if (item.requiresTemperature) setTemperature('');
        setSauceIds([]);
        setAdditionIds([]);
        if (complex) setExpanded(false);
    }

    return <article className={`meal-item-card ${expanded ? 'expanded' : ''} ${wouldExceed ? 'over-budget' : ''} ${selectedQuantity ? 'selected' : ''}`}>
        {selectedQuantity > 0 && <span className="meal-selected-badge" aria-label={`${selectedQuantity} selected`}>{selectedQuantity}</span>}
        <div className="meal-item-head">
            <div><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div>
            <div className="meal-item-price">
                {complex && !expanded && (item.options?.length > 1 || item.pricePer100gVnd) && <small>From</small>}
                <strong>{formatVnd(expanded ? selectedPrice : minPrice)}</strong>
                {item.pricePer100gVnd && !expanded && <small>at minimum weight</small>}
            </div>
        </div>

        {expanded && <div className="meal-customizer">
            {item.options && <div className="meal-option-group"><label htmlFor={`${item.id}-option`}>Choose option</label><select id={`${item.id}-option`} value={optionId} onChange={event => setOptionId(event.target.value)}>{item.options.map(option => <option key={option.id} value={option.id}>{option.label} · {formatVnd(option.priceVnd)}</option>)}</select></div>}

            {item.pricePer100gVnd && <div className="meal-option-group"><label>Weight · {formatVnd(item.pricePer100gVnd)} per 100g</label><div className="meal-weight"><button type="button" onClick={() => setWeightG(value => Math.max(item.minWeightG, value - 100))}><Minus size={15}/></button><strong>{new Intl.NumberFormat('en-US').format(weightG)}g</strong><button type="button" onClick={() => setWeightG(value => Math.min(item.maxWeightG, value + 100))}><Plus size={15}/></button></div><small>Minimum {new Intl.NumberFormat('en-US').format(item.minWeightG)}g</small></div>}

            {item.requiresTemperature && <div className="meal-option-group"><label>Cooking temperature <em>Required</em></label><div className="meal-choice-pills">{TEMPERATURES.map(value => <button type="button" key={value} className={temperature === value ? 'selected' : ''} onClick={() => setTemperature(value)}>{temperature === value && <Check size={13}/>} {value}</button>)}</div>{!temperature && <span className="meal-required-hint">Choose a temperature before adding this steak.</span>}</div>}

            {item.preparations && <div className="meal-option-group"><label>Preparation</label><div className="meal-choice-pills">{item.preparations.map(value => <button type="button" key={value} className={preparation === value ? 'selected' : ''} onClick={() => setPreparation(value)}>{preparation === value && <Check size={13}/>} {value}</button>)}</div></div>}

            {(item.allowSauces || item.allowSteakAdditions) && <details className="meal-addons"><summary>Optional steak extras <ChevronDown size={15}/></summary>
                {item.allowSauces && <div className="meal-option-group"><label>Sauces</label><div className="meal-check-grid">{SAUCES.map(choice => <label key={choice.id} className={sauceIds.includes(choice.id) ? 'selected' : ''}><input type="checkbox" checked={sauceIds.includes(choice.id)} onChange={() => toggle(setSauceIds, sauceIds, choice.id)}/><span>{choice.name}</span><b>+{formatVnd(choice.priceVnd)}</b></label>)}</div></div>}
                {item.allowSteakAdditions && <div className="meal-option-group"><label>Additions</label><div className="meal-check-grid">{STEAK_ADDITIONS.map(choice => <label key={choice.id} className={additionIds.includes(choice.id) ? 'selected' : ''}><input type="checkbox" checked={additionIds.includes(choice.id)} onChange={() => toggle(setAdditionIds, additionIds, choice.id)}/><span>{choice.name}</span><b>+{formatVnd(choice.priceVnd)}</b></label>)}</div></div>}
            </details>}

            <div className="meal-item-actions">{selectedQuantity > 0 && <button type="button" className="button ghost" onClick={() => onRemove(item.id)}>{selectedQuantity > 1 ? 'Remove all' : 'Remove'}</button>}<QuantityControl value={quantity} onChange={setQuantity}/><button type="button" className="button primary" disabled={item.requiresTemperature && !temperature} onClick={add}><Plus size={16}/> Add · {formatVnd(selectedPrice)}</button></div>
        </div>}

        {!expanded && <div className="meal-item-actions">
            {selectedQuantity > 0 && !complex ? <QuantityControl compact minimum={0} value={selectedQuantity} onChange={value => onQuantity(item.id, value)}/> : <>
                {selectedQuantity > 0 && <button type="button" className="button ghost small" onClick={() => onRemove(item.id)}>{selectedQuantity > 1 ? 'Remove all' : 'Remove'}</button>}
                <button type="button" className={complex ? 'button ghost small' : 'button primary small'} onClick={() => complex ? setExpanded(true) : add()}>{complex ? 'Choose options' : <><Plus size={15}/> Add</>}</button>
            </>}
        </div>}
    </article>;
}

function CreditBanner({ order }) {
    const over = order.amountDueVnd > 0;
    return <div className="meal-credit-banner">
        <div className="container meal-credit-inner">
            <div className="meal-credit-message"><CircleDollarSign size={25}/><div><strong>You have 750K VND credit to spend on food.</strong><span>Spend more if you like. The balance is due at the restaurant via cash or QR code.</span></div></div>
            <div className={`meal-credit-balance ${over ? 'over' : ''}`}><small>{over ? 'Due at restaurant' : 'Credit left'}</small><strong>{formatVnd(over ? order.amountDueVnd : order.creditRemainingVnd)}</strong></div>
        </div>
    </div>;
}

function StepProgress({ step, goTo }) {
    return <nav className="meal-progress" aria-label="Menu selection progress">{STEPS.map((item, index) => <button type="button" key={item.id} className={index === step ? 'active' : index < step ? 'complete' : ''} onClick={() => index < step && goTo(index)} disabled={index > step}><span>{index < step ? <Check size={12}/> : index + 1}</span>{item.label}</button>)}</nav>;
}

function MenuOverview({ registration, onBegin }) {
    const groups = [
        { label:'Appetizers', ids:['starters', 'salads', 'soups'], copy:'Starters, salads and soups' },
        { label:'Main courses', ids:['house-mains', 'pasta', 'steaks', 'seafood', 'burgers'], copy:'Chef mains, pasta, steaks, seafood and burgers' },
        { label:'Sides', ids:['sides'], copy:'Eleven sides from 55K' },
        { label:'Dessert', ids:[], copy:'Choose at the restaurant' }
    ];
    return <div className="container meal-overview">
        <div className="meal-overview-copy"><span className="eyebrow">Your menu, made simple</span><h1>Let’s get ready to eat.</h1><p>You have <strong>{formatVnd(MEAL_CREDIT_VND)}</strong> (about $30) to spend. We’ll show you one course at a time, and you can skip anything you don’t want.</p><div className="meal-event-line"><UtensilsCrossed size={17}/>{registration.event_name} · {formatDate(registration.event_date)}</div></div>
        <div className="meal-overview-grid">{groups.map(group => {
            const sections = MENU_SECTIONS.filter(section => group.ids.includes(section.id));
            const prices = sections.flatMap(section => {
                const range = sectionPriceRange(section); return [range.minVnd, range.maxVnd];
            });
            return <article key={group.label}><span>{group.label}</span><h2>{group.copy}</h2><p>{prices.length ? `Starts at ${formatVnd(Math.min(...prices), true)} · up to ${formatVnd(Math.max(...prices), true)}` : 'No advance selection needed'}</p></article>;
        })}</div>
        <div className="meal-credit-explainer"><WalletCards size={22}/><div><b>Your 750K food credit is applied at review.</b><span>Menu prices do not include 10% VAT or the 5% service charge. If the final total is above your credit, we will show the remaining amount in red for payment at the restaurant.</span></div></div>
        <button type="button" className="button primary meal-begin" onClick={onBegin}>Start with appetizers <ArrowRight size={17}/></button>
    </div>;
}

function CourseStep({ flow, cart, onAdd, onRemove, onQuantity, onBack, onNext }) {
    const sections = MENU_SECTIONS.filter(section => section.flow === flow);
    const [activeId, setActiveId] = useState(sections[0].id);
    const active = sections.find(section => section.id === activeId) || sections[0];
    const copy = STEP_COPY[flow];
    const selectedCount = cart.filter(line => sections.some(section => section.id === line.categoryId)).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    return <div className="container meal-course-step">
        <header className="meal-step-heading"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
        {sections.length > 1 && <div className="meal-category-tabs" role="tablist">{sections.map(section => {
            const count = cart.filter(line => line.categoryId === section.id).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
            const range = sectionPriceRange(section);
            return <button type="button" role="tab" aria-selected={active.id === section.id} className={active.id === section.id ? 'active' : ''} key={section.id} onClick={() => setActiveId(section.id)}><span>{section.shortTitle}{count > 0 && <b>{count}</b>}</span><small>From {formatVnd(range.minVnd, true)}</small></button>;
        })}</div>}
        <div className="meal-section-intro"><div><h2>{active.title}</h2><p>{active.description}</p></div><span>{active.items.length} option{active.items.length === 1 ? '' : 's'}</span></div>
        <div className="meal-items-grid">{active.items.map(item => <MenuItemCard key={item.id} item={item} cart={cart} onAdd={onAdd} onRemove={onRemove} onQuantity={onQuantity}/>)}</div>
        <div className="meal-step-actions"><button type="button" className="button ghost" onClick={onBack}><ArrowLeft size={16}/> Back</button><div><button type="button" className="button ghost" onClick={onNext}>{copy.skip}</button><button type="button" className="button primary" onClick={onNext}>{copy.next}{selectedCount > 0 ? ` · ${selectedCount} selected` : ''} <ArrowRight size={16}/></button></div></div>
    </div>;
}

function DessertStep({ onBack, onNext }) {
    return <div className="container meal-course-step dessert-step">
        <header className="meal-step-heading"><span className="eyebrow">Step 4 of 4</span><h1>Would you like dessert?</h1><p>The photographed restaurant menu does not list desserts, so there is nothing to preorder here.</p></header>
        <article className="meal-dessert-card"><Sparkles size={30}/><div><span>Dessert at the restaurant</span><h2>Ask for the evening’s dessert options when you arrive.</h2><p>This keeps your advance order matched exactly to the supplied restaurant menu - no invented items or prices.</p></div></article>
        <div className="meal-step-actions"><button type="button" className="button ghost" onClick={onBack}><ArrowLeft size={16}/> Back</button><button type="button" className="button primary" onClick={onNext}>No dessert · review order <ArrowRight size={16}/></button></div>
    </div>;
}

function ReviewStep({ cart, notes, setNotes, order, onBack, onQuantity, onRemove, onSave, saving, status, savedAt }) {
    const grouped = MENU_SECTIONS.map(section => ({ section, lines:cart.filter(line => line.categoryId === section.id) })).filter(group => group.lines.length);
    return <div className="container meal-review">
        <header className="meal-step-heading"><span className="eyebrow">Final step</span><h1>Review your menu.</h1><p>We’ll record these choices for the restaurant. You can come back and update them later.</p></header>
        <div className="meal-review-layout"><div className="meal-review-items">
            {!cart.length && <div className="meal-empty-order"><UtensilsCrossed size={28}/><h2>No advance selections</h2><p>You can still save this choice and order directly at the restaurant.</p></div>}
            {grouped.map(({ section, lines }) => <section key={section.id}><h2>{section.title}</h2>{lines.map(line => <article key={line.lineId}><div><h3>{line.name}</h3>{line.detail && <p>{line.detail}</p>}<small>{formatVnd(line.unitPriceVnd)} each</small></div><div className="meal-review-line-actions"><QuantityControl compact value={line.quantity} onChange={value => onQuantity(line.lineId, value)}/><strong>{formatVnd(line.lineTotalVnd)}</strong><button type="button" onClick={() => onRemove(line.lineId)} aria-label={`Remove ${line.name}`}><Trash2 size={16}/></button></div></article>)}</section>)}
            <div className="meal-notes"><label htmlFor="meal-notes">Dietary notes or special requests <span>Optional</span></label><textarea id="meal-notes" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Allergies, seating notes, or a request for the kitchen…"/><small>{notes.length}/1,000</small></div>
        </div>
        <aside className={`meal-totals ${order.amountDueVnd > 0 ? 'over' : ''}`}><div className="meal-totals-title"><ReceiptText size={20}/><h2>Order total</h2></div><dl><div><dt>Menu subtotal</dt><dd>{formatVnd(order.subtotalVnd)}</dd></div><div><dt>VAT · 10%</dt><dd>{formatVnd(order.vatVnd)}</dd></div><div><dt>Service · 5%</dt><dd>{formatVnd(order.serviceVnd)}</dd></div><div className="total"><dt>Restaurant total</dt><dd>{formatVnd(order.totalVnd)}</dd></div><div className="credit"><dt>Food credit</dt><dd>−{formatVnd(order.creditAppliedVnd)}</dd></div></dl>{order.amountDueVnd > 0 ? <div className="meal-due"><span>Due at restaurant</span><strong>{formatVnd(order.amountDueVnd)}</strong><p>Pay by cash or Vietnamese QR code at the event.</p></div> : <div className="meal-remaining"><span>Credit remaining</span><strong>{formatVnd(order.creditRemainingVnd)}</strong></div>}<p className="meal-total-note">Prices and required restaurant charges are calculated from the supplied menu.</p></aside></div>
        {status && <div className={`form-status ${status.type}`}>{status.type === 'success' && <CheckCircle2 size={17}/>} {status.message}{savedAt && status.type === 'success' ? ` · ${new Date(savedAt).toLocaleString()}` : ''}</div>}
        <div className="meal-step-actions review-actions"><button type="button" className="button ghost" onClick={onBack}><ArrowLeft size={16}/> Back to menu</button><button type="button" className="button primary" disabled={saving} onClick={onSave}>{saving ? 'Saving your order…' : cart.length ? 'Save menu selections' : 'Save no advance selections'} <Check size={16}/></button></div>
    </div>;
}

function MealSaveModal({ confirmation, onContinue }) {
    if (!confirmation) return null;
    const overdue = confirmation.amountDueVnd > 0;
    return <div className="modal-backdrop meal-save-backdrop">
        <section className={`meal-save-modal ${overdue ? 'over' : ''}`} role="dialog" aria-modal="true" aria-labelledby="meal-save-title">
            <div className="meal-save-icon"><CheckCircle2 size={34}/></div>
            <span className="eyebrow">Menu saved</span>
            <h2 id="meal-save-title">Your menu options have been saved.</h2>
            <p>We have recorded {confirmation.selectionCount} {confirmation.selectionCount === 1 ? 'selection' : 'selections'} for the restaurant.</p>
            {overdue ? <div className="meal-save-balance"><span>Amount due at the restaurant</span><strong>{formatVnd(confirmation.amountDueVnd)}</strong><p>Please pay this amount on site with cash or Vietnamese QR code.</p></div> : <div className="meal-save-balance within"><span>Your order is covered by the food credit.</span><strong>No payment due</strong></div>}
            <button type="button" className="button primary" onClick={onContinue}>Back to my ticket <ArrowRight size={17}/></button>
        </section>
    </div>;
}

function MealContent() {
    const { user, ready } = useAuth();
    const router = useRouter();
    const params = useSearchParams();
    const orderId = params.get('order');
    const [registration, setRegistration] = useState(null);
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [step, setStep] = useState(0);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveConfirmation, setSaveConfirmation] = useState(null);

    useEffect(() => {
        if (!ready) return;
        if (!user || !orderId) { setLoading(false); return; }
        db('meals.get', { orderId }).then(row => {
            setRegistration(row);
            setCart(Array.isArray(row?.meal_order?.items) ? row.meal_order.items : []);
            setNotes(row?.meal_order?.notes || '');
        }).catch(error => setStatus({ type:'error', message:error.message })).finally(() => setLoading(false));
    }, [ready, user, orderId]);

    const order = useMemo(() => {
        try { return normalizeMealOrder(cart, MEAL_CREDIT_VND, notes); }
        catch (_) { return normalizeMealOrder([], MEAL_CREDIT_VND, notes); }
    }, [cart, notes]);

    function addLine(line) {
        let normalized;
        try { normalized = normalizeMealOrder([line], MEAL_CREDIT_VND).items[0]; }
        catch (error) { setStatus({ type:'error', message:error.message }); return; }
        setCart(current => {
            const existing = current.find(candidate => selectionKey(candidate) === selectionKey(normalized));
            if (!existing) return [...current, normalized];
            return current.map(candidate => candidate.lineId === existing.lineId
                ? { ...candidate, quantity:Math.min(12, Number(candidate.quantity) + Number(normalized.quantity)) }
                : candidate);
        });
        setStatus(null);
    }

    function updateQuantity(lineId, quantity) {
        setCart(current => current.map(line => line.lineId === lineId ? { ...line, quantity } : line));
        setStatus(null);
    }

    function removeLine(lineId) {
        setCart(current => current.filter(line => line.lineId !== lineId));
        setStatus(null);
    }

    function removeItem(itemId) {
        setCart(current => current.filter(line => line.itemId !== itemId));
        setStatus(null);
    }

    function updateItemQuantity(itemId, quantity) {
        setCart(current => quantity < 1
            ? current.filter(line => line.itemId !== itemId)
            : current.map(line => line.itemId === itemId ? { ...line, quantity } : line));
        setStatus(null);
    }

    function goTo(nextStep) {
        setStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
        setStatus(null);
        window.scrollTo({ top:0, behavior:'smooth' });
    }

    async function save() {
        setSaving(true); setStatus(null);
        try {
            const row = await db('meals.update', { orderId, items:cart, notes });
            setRegistration(current => ({ ...current, ...row }));
            setCart(row.meal_order.items || []);
            setNotes(row.meal_order.notes || '');
            setStatus({ type:'success', message:row.meal_amount_due_vnd > 0 ? `Menu saved. ${formatVnd(row.meal_amount_due_vnd)} will be due at the restaurant by cash or QR.` : 'Menu saved. Your selections are within the included food credit.' });
            setSaveConfirmation({
                amountDueVnd:Number(row.meal_amount_due_vnd || 0),
                selectionCount:(row.meal_order?.items || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0)
            });
        } catch (error) { setStatus({ type:'error', message:error.message }); }
        finally { setSaving(false); }
    }

    if (!ready || loading) return <div className="loading">Loading menu selection…</div>;
    const mealPath = orderId ? `/meal?order=${encodeURIComponent(orderId)}` : '/ticket';
    if (!user) return <section className="auth-page"><div className="auth-card center"><UtensilsCrossed size={40}/><h1>Sign in to choose your menu.</h1><Link className="button primary" href={`/login?next=${encodeURIComponent(mealPath)}`}>Sign in</Link></div></section>;
    if (!orderId) return <section className="auth-page"><div className="auth-card center"><h1>Choose a ticket first.</h1><p className="muted">Each saved meal belongs to one paid ticket and its event.</p><Link className="button primary" href="/ticket">View my tickets</Link></div></section>;
    if (!registration) return <section className="auth-page"><div className="auth-card center"><h1>Meal selection unavailable.</h1><p className="muted">This ticket was not found or its payment has not been confirmed.</p><Link className="button primary" href={`/ticket?id=${encodeURIComponent(orderId)}`}>Back to ticket</Link></div></section>;

    return <div className="meal-page">
        <CreditBanner order={order}/>
        <StepProgress step={step} goTo={goTo}/>
        {step === 0 && <MenuOverview registration={registration} onBegin={() => goTo(1)}/>}
        {step === 1 && <CourseStep flow="appetizer" cart={order.items} onAdd={addLine} onRemove={removeItem} onQuantity={updateItemQuantity} onBack={() => goTo(0)} onNext={() => goTo(2)}/>}
        {step === 2 && <CourseStep flow="main" cart={order.items} onAdd={addLine} onRemove={removeItem} onQuantity={updateItemQuantity} onBack={() => goTo(1)} onNext={() => goTo(3)}/>}
        {step === 3 && <CourseStep flow="sides" cart={order.items} onAdd={addLine} onRemove={removeItem} onQuantity={updateItemQuantity} onBack={() => goTo(2)} onNext={() => goTo(4)}/>}
        {step === 4 && <DessertStep onBack={() => goTo(3)} onNext={() => goTo(5)}/>}
        {step === 5 && <ReviewStep cart={order.items} notes={notes} setNotes={setNotes} order={order} onBack={() => goTo(2)} onQuantity={updateQuantity} onRemove={removeLine} onSave={save} saving={saving} status={status} savedAt={registration.meal_updated_at}/>}
        <MealSaveModal confirmation={saveConfirmation} onContinue={() => router.push(`/ticket?id=${encodeURIComponent(orderId)}`)}/>
    </div>;
}

export default function MealPage() {
    return <Suspense fallback={<div className="loading">Loading menu selection…</div>}><MealContent/></Suspense>;
}

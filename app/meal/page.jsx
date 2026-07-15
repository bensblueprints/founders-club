'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, formatDate } from '@/lib/api';

const OPTIONS = [
    ['steak', 'Steak'],
    ['shrimp', 'Shrimp'],
    ['chicken', 'Chicken'],
    ['vegan', 'Vegan']
];

export default function MealPage() {
    const { user, ready } = useAuth();
    const [registration, setRegistration] = useState(null);
    const [meal, setMeal] = useState('');
    const [guestMeal, setGuestMeal] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        db('meals.get').then(row => {
            setRegistration(row);
            setMeal(row?.meal_option || '');
            setGuestMeal(row?.guest_meal_option || '');
        }).catch(e => setStatus({ type: 'error', message: e.message })).finally(() => setLoading(false));
    }, [user]);

    async function save(event) {
        event.preventDefault();
        setStatus(null);
        try {
            const row = await db('meals.update', { mealOption: meal, guestMealOption: guestMeal || null });
            setRegistration(current => ({ ...current, ...row }));
            setStatus({ type: 'success', message: 'Meal choices saved.' });
        } catch (e) { setStatus({ type: 'error', message: e.message }); }
    }

    if (!ready || loading) return <div className="loading">Loading meal selection…</div>;
    if (!user) return <section className="auth-page"><div className="auth-card center"><UtensilsCrossed size={40}/><h1>Sign in to choose your meal.</h1><Link className="button primary" href="/login?next=/meal">Sign in</Link></div></section>;
    if (!registration) return <section className="auth-page"><div className="auth-card center"><h1>Payment required.</h1><p className="muted">Meal selection unlocks after your event payment is confirmed.</p><Link className="button primary" href="/payment">View payment</Link></div></section>;

    return <><section className="page-hero"><div className="container"><span className="eyebrow">Dinner preference</span><h1 className="display medium">Choose your meal.</h1><p className="lead">{registration.event_name} · {formatDate(registration.event_date)}</p></div></section><section className="section compact"><form className="container meal-selection-form" onSubmit={save}>
        <div className="panel meal-choice-panel"><h2>Your meal</h2><div className="meal-options">{OPTIONS.map(([value, label]) => <label key={value} className={meal === value ? 'selected' : ''}><input type="radio" name="meal" value={value} checked={meal === value} onChange={() => setMeal(value)} required/><span>{label}</span></label>)}</div></div>
        {Number(registration.seat_count) === 2 && <div className="panel meal-choice-panel"><h2>{registration.guest_name || 'Partner / co-founder'}’s meal</h2><div className="meal-options">{OPTIONS.map(([value, label]) => <label key={value} className={guestMeal === value ? 'selected' : ''}><input type="radio" name="guestMeal" value={value} checked={guestMeal === value} onChange={() => setGuestMeal(value)} required/><span>{label}</span></label>)}</div></div>}
        {status && <div className={`form-status ${status.type}`}>{status.type === 'success' && <CheckCircle2 size={17}/>} {status.message}</div>}
        <button className="button primary" disabled={!meal || (Number(registration.seat_count) === 2 && !guestMeal)}>Save meal choice</button>
    </form></section></>;
}

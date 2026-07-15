'use client';

import { useEffect } from 'react';

export default function LandingAnimations() {
    useEffect(() => {
        const root = document.querySelector('.landing-original, .legacy-info-page');
        if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        root.classList.add('reveal-ready');
        const nodes = [...root.querySelectorAll('[data-reveal], .reveal')];
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
        }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

        nodes.forEach((node, index) => {
            node.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 90}ms`);
            observer.observe(node);
        });
        return () => observer.disconnect();
    }, []);

    return null;
}

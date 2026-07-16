'use client';

import { useEffect, useRef, useState } from 'react';

function useMobileMedia() {
    const [mobile, setMobile] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(max-width: 720px)');
        const update = () => setMobile(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return mobile;
}

function ViewportVideo({ className, poster, label, children }) {
    const ref = useRef(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
        }, { rootMargin: '180px 0px', threshold: 0.01 });
        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    return <video ref={ref} className={className} autoPlay muted loop playsInline preload="metadata" poster={poster} aria-label={label} aria-hidden={!label}>
        {children}
    </video>;
}

export function EventHeroMedia() {
    const mobile = useMobileMedia();
    if (mobile) return null;
    return <ViewportVideo className="legacy-hero-video-bg" poster="/video/poster.jpg">
        <source src="/video/hero.webm" type="video/webm" />
    </ViewportVideo>;
}

export function RotatingCube({ className = 'legacy-cube-img', label = 'FoundersVN mark on a rotating 3D cube' }) {
    const mobile = useMobileMedia();
    if (mobile) return <img className={`${className} legacy-cube-poster`} src="/tools/hero-video/out/cube-spin-poster.png" alt={label} />;
    return <ViewportVideo className={className} poster="/tools/hero-video/out/cube-spin-poster.png" label={label}>
        <source src="/tools/hero-video/out/cube-spin.webm" type="video/webm" />
        <source src="/tools/hero-video/out/cube-spin.mp4" type="video/mp4" />
    </ViewportVideo>;
}

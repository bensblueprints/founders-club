import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function MarketingPage({ eyebrow, title, intro, points, cta = 'Apply now', href = '/#apply', children }) {
    return <><section className="page-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1 className="display medium">{title}</h1><p className="lead">{intro}</p><Link className="button primary" style={{marginTop:24}} href={href}>{cta}<ArrowRight size={17}/></Link></div></section><section className="section"><div className="container">{points && <div className="card-grid">{points.map(point=><article className="card" key={point.title}><span className="card-icon"><CheckCircle2/></span><h3>{point.title}</h3><p>{point.body}</p></article>)}</div>}{children}</div></section></>;
}

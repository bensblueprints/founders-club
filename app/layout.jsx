import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import './landing-original.css';
import { AuthProvider } from '@/components/AuthProvider';
import AppShell from '@/components/AppShell';
import { LanguageProvider } from '@/components/LanguageProvider';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display' });

export const metadata = {
    title: { default: 'Founders Vietnam', template: '%s · Founders Vietnam' },
    description: 'Curated, phone-free networking events for founders in Vietnam.',
    icons: {
        icon: '/images/landing/favicon-512.png',
        apple: '/images/landing/favicon-512.png'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${plusJakarta.variable}`}>
            <body><AuthProvider><LanguageProvider><AppShell>{children}</AppShell></LanguageProvider></AuthProvider></body>
        </html>
    );
}

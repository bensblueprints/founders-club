import { redirect } from 'next/navigation';

export const metadata = { title: 'Refund policy' };

export default function RefundPage() {
    redirect('/terms#refunds');
}

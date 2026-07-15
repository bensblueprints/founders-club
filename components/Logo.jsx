import Image from 'next/image';
import Link from 'next/link';

export default function Logo({ compact = false }) {
    return (
        <Link className="brand" href="/" aria-label="Founders Vietnam home">
            {compact
                ? <Image src="/assets/brand/founders-vn-wavy-icon-white.svg" alt="" width={30} height={30} priority />
                : <Image className="brand-logo-full" src="/assets/brand/founders-vn-logo.svg" alt="Founders Vietnam" width={205} height={29} priority />}
        </Link>
    );
}

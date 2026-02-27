import styles from '../styles/Button.module.css';
import clsx from 'clsx';
import Link from 'next/link';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    full = false,
    disabled = false,
    href,
    onClick,
    type = 'button',
    className = '',
}) {
    const cls = clsx(
        styles.button,
        styles[variant],
        styles[size],
        full && styles.full,
        className
    );

    if (href) {
        return (
            <Link href={href} className={cls}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            className={cls}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
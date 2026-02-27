import styles from '../styles/ProgressBar.module.css';
import clsx from 'clsx';

export default function ProgressBar({
    value = 0,
    max = 100,
    label,
    showValue = true,
    color = 'blue',
    size = 'md',
    className = '',
}) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={clsx(styles.progressBar, styles[size], styles[color], className)}>
            {(label || showValue) && (
                <div className={styles.label}>
                    {label && <span className={styles.labelText}>{label}</span>}
                    {showValue && (
                        <span className={styles.labelValue}>{Math.round(pct)}%</span>
                    )}
                </div>
            )}
            <div className={styles.track}>
                <div className={styles.fill} style={{ width: ${pct}% }} />
            </div>
        </div>
    );
}
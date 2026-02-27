import styles from '../styles/Card.module.css';
import clsx from 'clsx';

export default function Card({
  children,
  className = '',
  hoverable = false,
  flat = false,
  compact = false,
}) {
  return (
    <div
      className={clsx(
        styles.card,
        hoverable && styles.hoverable,
        flat && styles.flat,
        compact && styles.compact,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, children }) {
  return (
    <div className={styles.cardHeader}>
      <div>
        {title && <h4 className={styles.cardTitle}>{title}</h4>}
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function CardBody({ children }) {
  return <div className={styles.cardBody}>{children}</div>;
}

export function CardFooter({ children }) {
  return <div className={styles.cardFooter}>{children}</div>;
}
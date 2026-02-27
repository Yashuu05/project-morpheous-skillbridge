import Sidebar from './Sidebar';
import styles from '../styles/Layout.module.css';

export default function Layout({ children, title = 'CareerAI' }) {
    return (
        <div className={styles.wrapper}>
            <Sidebar />
            <div className={styles.main}>
                <header className={styles.topbar}>
                    <span className={styles.topbarTitle}>{title}</span>
                    <div className={styles.topbarActions}>
                        <div className={styles.avatar}>AK</div>
                    </div>
                </header>
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
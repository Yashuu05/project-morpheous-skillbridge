import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import styles from '../styles/Swot.module.css';

const SWOT_DATA = [
    {
        key: 'strengths',
        icon: '💪',
        title: 'Strengths',
        items: [
            'Strong Python programming skills (5+ years)',
            'Solid understanding of machine learning fundamentals',
            'Experience with real-world data wrangling projects',
            'Active open-source contributor (GitHub)',
            'Strong communication and presentation skills',
        ],
    },
    {
        key: 'weaknesses',
        icon: '⚡',
        title: 'Weaknesses',
        items: [
            'Limited experience with deep learning frameworks',
            'No production-level cloud deployment experience',
            'Advanced statistical methods need improvement',
            'Gaps in distributed computing knowledge',
        ],
    },
    {
        key: 'opportunities',
        icon: '🚀',
        title: 'Opportunities',
        items: [
            'High demand for ML Engineers in fintech & healthcare',
            'Growing remote-first data science roles globally',
            'Open-source projects can improve portfolio visibility',
            'AI/ML bootcamp programs with job guarantees available',
            'Company-sponsored cloud certifications (AWS, GCP)',
        ],
    },
    {
        key: 'threats',
        icon: '⚠️',
        title: 'Threats',
        items: [
            'Market competition from candidates with PhDs',
            'Rapid changes in ML tooling require constant upskilling',
            'Economic downturns can freeze tech hiring cycles',
            'Automation affecting junior data roles',
        ],
    },
];

function SwotCard({ data }) {
    const [open, setOpen] = useState(true);

    return (
        <div className={${styles.swotCard} ${styles[data.key]}}>
            <div className={styles.swotHeader} onClick={() => setOpen(!open)}>
                <div className={styles.swotHeaderLeft}>
                    <div className={styles.swotBadge}>{data.icon}</div>
                    <h3 className={styles.swotTitle}>{data.title}</h3>
                    <span className={styles.swotCount}>{data.items.length}</span>
                </div>
                <span className={${styles.swotChevron} ${open ? styles.open : ''}}>▼</span>
            </div>
            {open && (
                <div className={styles.swotBody}>
                    <ul className={styles.swotList}>
                        {data.items.map((item, i) => (
                            <li key={i} className={styles.swotItem}>
                                <span className={styles.swotDot} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default function Swot() {
    return (
        <>
            <Head>
                <title>SWOT Analysis – AI Career Guidance</title>
                <meta name="description" content="Your personalized SWOT analysis for career planning" />
            </Head>
            <Layout title="SWOT Analysis">
                <div className={styles.page}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>SWOT Analysis</h1>
                        <p className={styles.pageSubtitle}>
                            A strategic overview of your career positioning based on your profile
                        </p>
                    </div>

                    <div className={styles.swotGrid}>
                        {SWOT_DATA.map((data) => (
                            <SwotCard key={data.key} data={data} />
                        ))}
                    </div>
                </div>
            </Layout>
        </>
    );
}
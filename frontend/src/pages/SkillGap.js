import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import ProgressBar from '../components/ProgressBar';
import styles from '../styles/SkillGap.module.css';

const SKILL_DATA = [
    { name: 'Python', user: 85, required: 90 },
    { name: 'Machine Learning', user: 70, required: 85 },
    { name: 'Deep Learning', user: 45, required: 80 },
    { name: 'SQL', user: 75, required: 70 },
    { name: 'Statistics', user: 60, required: 80 },
    { name: 'Data Wrangling', user: 80, required: 75 },
    { name: 'Cloud (AWS/GCP)', user: 20, required: 65 },
    { name: 'MLOps', user: 15, required: 60 },
];

const MISSING_SKILLS = [
    { name: 'Deep Learning', priority: 'High', desc: 'Core requirement for most ML Scientist roles. Focus on TensorFlow/PyTorch.' },
    { name: 'Cloud Platforms', priority: 'High', desc: 'AWS SageMaker or GCP Vertex AI for model deployment is essential.' },
    { name: 'MLOps', priority: 'Medium', desc: 'Understanding CI/CD for ML pipelines differentiates mid-level engineers.' },
    { name: 'Statistics (Adv)', priority: 'Medium', desc: 'Bayesian inference and hypothesis testing for research roles.' },
];

export default function SkillGap() {
    const [aiOpen, setAiOpen] = useState(false);

    return (
        <>
            <Head>
                <title>Skill Gap Analysis – AI Career Guidance</title>
                <meta name="description" content="Visualize your skill gaps compared to target roles" />
            </Head>
            <Layout title="Skill Gap Analysis">
                <div className={styles.page}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>Skill Gap Analysis</h1>
                        <p className={styles.pageSubtitle}>
                            Comparing your current skills against Data Scientist role requirements
                        </p>
                    </div>

                    {/* Summary */}
                    <div className={styles.summaryRow}>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue}>64%</div>
                            <div className={styles.summaryLabel}>Overall Match</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue} style={{ color: 'var(--accent-green-muted)' }}>4</div>
                            <div className={styles.summaryLabel}>Skills Met</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue} style={{ color: 'var(--accent-red-muted)' }}>4</div>
                            <div className={styles.summaryLabel}>Skills Lacking</div>
                        </div>
                    </div>

                    {/* Skill Comparison */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Skill Comparison</h3>
                        {SKILL_DATA.map((skill) => (
                            <div key={skill.name} className={styles.skillRow}>
                                <div className={styles.skillName}>{skill.name}</div>
                                <div className={styles.barContainer}>
                                    <span className={styles.barLabel}>Your Level</span>
                                    <ProgressBar
                                        value={skill.user}
                                        color={skill.user >= skill.required ? 'green' : 'blue'}
                                        size="sm"
                                        showValue={true}
                                    />
                                </div>
                                <div className={styles.barContainer}>
                                    <span className={styles.barLabel}>Required</span>
                                    <ProgressBar
                                        value={skill.required}
                                        color="purple"
                                        size="sm"
                                        showValue={true}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Missing Skills */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Missing / Insufficient Skills</h3>
                        <div className={styles.missingGrid}>
                            {MISSING_SKILLS.map((skill) => (
                                <div key={skill.name} className={styles.missingCard}>
                                    <div className={styles.missingHeader}>
                                        <span className={styles.missingSkillName}>{skill.name}</span>
                                        <span className={styles.missingPriority}>{skill.priority}</span>
                                    </div>
                                    <p className={styles.missingDesc}>{skill.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Explanation */}
                    <div className={styles.section}>
                        <div className={styles.aiPanel}>
                            <div className={styles.aiPanelHeader} onClick={() => setAiOpen(!aiOpen)}>
                                <div className={styles.aiPanelTitle}>
                                    <div className={styles.aiIcon}>✦</div>
                                    AI Analysis & Recommendations
                                </div>
                                <span className={${styles.aiChevron} ${aiOpen ? styles.open : ''}}>▼</span>
                        </div>
                        {aiOpen && (
                            <div className={styles.aiPanelBody}>
                                <p className={styles.aiText}>
                                    Based on your current skill profile and the requirements for a <strong>Data Scientist</strong> role,
                                    you have a solid foundation in Python and data manipulation, but significant gaps exist in deep
                                    learning frameworks and cloud-based ML deployment. Your SQL and statistical skills are competitive,
                                    but advanced statistical knowledge (Bayesian methods) is often tested in senior-level interviews.
                                </p>
                                <div className={styles.aiRecommendations}>
                                    <div className={styles.aiRecommendation}>
                                        Prioritize a structured Deep Learning course (fast.ai or DeepLearning.AI specialization) — estimated 8–12 weeks.
                                    </div>
                                    <div className={styles.aiRecommendation}>
                                        Get hands-on with AWS SageMaker through a free-tier project to build deploying ML models.
                                    </div>
                                    <div className={styles.aiRecommendation}>
                                        Practice Bayesian statistics using Python's PyMC library with real datasets.
                                    </div>
                                    <div className={styles.aiRecommendation}>
                                        Build an end-to-end MLOps pipeline using GitHub Actions + MLflow to demonstrate DevOps fluency.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout >
        </>
    );
}
import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonContent, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonToggle } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CourseLearningPage.css';

// ── Icons ──
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShareIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="var(--ion-color-primary)" />
    </svg>
);

const VideoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.3333 4.66667L14.6667 2V10L11.3333 7.33333V10C11.3333 10.7333 10.7333 11.3333 10 11.3333H2C1.26667 11.3333 0.666667 10.7333 0.666667 10V3.33333C0.666667 2.6 1.26667 2 2 2H10C10.7333 2 11.3333 2.6 11.3333 3.33333V4.66667ZM10 9.33333V4H2V9.33333H10Z" fill="var(--ion-color-primary)" />
    </svg>
);

const DocumentIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.33333 1.33333H2.66667C1.93333 1.33333 1.34 1.93333 1.34 2.66667L1.33333 13.3333C1.33333 14.0667 1.92667 14.6667 2.66001 14.6667H11.3333C12.0667 14.6667 12.6667 14.0667 12.6667 13.3333V4.66667L9.33333 1.33333ZM10.6667 12H3.33333V10.6667H10.6667V12ZM10.6667 9.33333H3.33333V8H10.6667V9.33333ZM8.66667 5.33333V2.33333L11.6667 5.33333H8.66667Z" fill="var(--ion-color-primary)" />
    </svg>
);

const CertificateIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="16" height="14" rx="2" fill="var(--ion-color-primary-tint, var(--color-d28d5d, #D28D5D))" />
        <path d="M7 6H13M7 9H13M7 12H10" stroke="var(--ion-color-light)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="15" cy="14" r="3" fill="var(--ion-color-primary)" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 9V11C13 11.5304 12.7893 12.0391 12.4142 12.4142C12.0391 12.7893 11.5304 13 11 13H3C2.46957 13 1.96086 12.7893 1.58579 12.4142C1.21071 12.0391 1 11.5304 1 11V9M4 5L7 8M7 8L10 5M7 8V1" stroke="var(--ion-color-primary)" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckSquareIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--ion-color-primary)" strokeWidth="1.2" />
        <path d="M4 7L6.5 9.5L10 4.5" stroke="var(--ion-color-primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Progress Circular Widget ──
const CircularProgress = ({ value }: { value: number }) => {
    const radius = 18;
    const stroke = 4;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <svg height={radius * 2} width={radius * 2} className="circular-progress">
            <circle
                stroke="var(--ion-color-warning-shade, var(--color-f0ce94, #F0CE94))"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="var(--ion-color-primary)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                transform={`rotate(-90 ${radius} ${radius})`}
            />
        </svg>
    );
};

const CourseLearningPage: React.FC = () => {
    const history = useHistory();

    return (
        <IonPage className="course-learning-page">
            <IonHeader className="ion-no-border">
                <IonToolbar className="course-learning-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => history.goBack()} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <BackIcon />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <ShareIcon />
                            </button>
                        </div>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                {/* Meta details */}
                <div className="course-learning-title-section">
                    <h1 className="course-learning-title">The AI Engineer Course 2026: Complete AI Engineer Bootcamp</h1>
                    <div className="course-learning-meta">
                        <span className="rating">4.5 <span className="star">★</span></span>
                        <span className="dot">•</span>
                        <span>25 Lessons</span>
                    </div>

                    <div className="course-progress-row">
                        <CircularProgress value={30} />
                        <div className="progress-details">
                            <h3 className="progress-percentage">Completed : 30%</h3>
                            <span className="progress-date">Batch Started on : 3rd Jan</span>
                        </div>
                    </div>
                </div>

                <div className="toggle-section">
                    <span className="toggle-label">View downloaded only</span>
                    <IonToggle className="custom-toggle" />
                </div>

                {/* Course Curriculum */}
                <div className="course-learning-curriculum-container">
                    <IonAccordionGroup className="curriculum-accordion-group" value={['week1']} multiple={true}>
                        <IonAccordion value="week1" className="curriculum-accordion">
                            <IonItem slot="header" className="curriculum-header" lines="none">
                                <IonLabel>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>Week 1: Foundation &amp; Basics</div>
                                        <DownloadIcon />
                                    </div>
                                    <div className="curriculum-header-subtitle">Business analysis, planning, and monitoring</div>
                                </IonLabel>
                            </IonItem>
                            <div slot="content">
                                <div className="curriculum-item">
                                    <div className="curriculum-item-left">
                                        <VideoIcon />
                                        <span className="curriculum-item-title">0.1 Overview</span>
                                    </div>
                                    <span className="curriculum-item-time">04:56</span>
                                </div>
                                <div className="curriculum-item">
                                    <div className="curriculum-item-left">
                                        <DocumentIcon />
                                        <span className="curriculum-item-title">0.2 Business Decisions and Analytics</span>
                                    </div>
                                    <span className="curriculum-item-time">04:56</span>
                                </div>
                                <div className="curriculum-item">
                                    <div className="curriculum-item-left">
                                        <VideoIcon />
                                        <span className="curriculum-item-title">0.3 Types of Business Analytics</span>
                                    </div>
                                    <span className="curriculum-item-time">04:56</span>
                                </div>
                                <div className="curriculum-item">
                                    <div className="curriculum-item-left">
                                        <VideoIcon />
                                        <span className="curriculum-item-title">0.4 Applications of Business Analytics</span>
                                    </div>
                                    <span className="curriculum-item-time">04:56</span>
                                </div>
                                <div className="curriculum-item">
                                    <div className="curriculum-item-left">
                                        <DocumentIcon />
                                        <span className="curriculum-item-title">0.5 Data Science Overview</span>
                                    </div>
                                    <span className="curriculum-item-time">04:56</span>
                                </div>
                            </div>
                        </IonAccordion>

                        <IonAccordion value="week2" className="curriculum-accordion">
                            <IonItem slot="header" className="curriculum-header" lines="none">
                                <IonLabel>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>Week 2: Core Competencies</div>
                                        <CheckSquareIcon />
                                    </div>
                                </IonLabel>
                            </IonItem>
                            <div slot="content">
                                {/* Empty for design */}
                            </div>
                        </IonAccordion>

                        <IonAccordion value="week3" className="curriculum-accordion">
                            <IonItem slot="header" className="curriculum-header" lines="none">
                                <IonLabel>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>Week 3: Professional Application</div>
                                        <DownloadIcon />
                                    </div>
                                </IonLabel>
                            </IonItem>
                            <div slot="content">
                                {/* Empty for design */}
                            </div>
                        </IonAccordion>
                    </IonAccordionGroup>
                </div>

                {/* Additional Info Cards */}
                <div className="info-cards-container">
                    <div className="info-card">
                        <div className="info-card-header">
                            <CertificateIcon />
                            <h3 className="info-card-title">Certificate</h3>
                        </div>
                        <p className="info-card-desc">Earn a certificate on completion of the course. Verify the details before completing the course.</p>
                        <button className="btn-primary">Preview Certificate</button>
                    </div>

                    <div className="info-card">
                        <h3 className="info-card-title" style={{ marginTop: 0 }}>Profile Data Sharing</h3>
                        <p className="info-card-desc">Profile data sharing is Off. You have not agreed to share your profile details with the course administrator</p>
                        <div className="info-card-footer">
                            <span className="info-card-date">Last updated on 07/01/2026</span>
                            <button className="btn-link">Update</button>
                        </div>
                    </div>
                </div>

                {/* padding for scroll area */}
                <div style={{ height: '40px' }}></div>
            </IonContent>
        </IonPage>
    );
};

export default CourseLearningPage;

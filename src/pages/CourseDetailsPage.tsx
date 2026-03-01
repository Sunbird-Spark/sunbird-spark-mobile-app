import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonContent, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonImg } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CourseDetailsPage.css';

// ── Icons ──
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="#A85236" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SearchIcon = () => (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="#a85236" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
    </svg>
);

const ShareIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="#A85236" />
    </svg>
);

const CheckIcon = () => (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '2px' }}>
        <path d="M4.5 9.5L0.5 5.5L1.91 4.09L4.5 6.67L10.59 0.580002L12 2L4.5 9.5Z" fill="#A85236" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.6667 2.66667H12V1.33333H10.6667V2.66667H5.33333V1.33333H4V2.66667H3.33333C2.59333 2.66667 2.00667 3.26667 2.00667 4L2 13.3333C2 14.0667 2.59333 14.6667 3.33333 14.6667H12.6667C13.4 14.6667 14 14.0667 14 13.3333V4C14 3.26667 13.4 2.66667 12.6667 2.66667ZM12.6667 13.3333H3.33333V6H12.6667V13.3333ZM12.6667 4.66667H3.33333V4H12.6667V4.66667Z" fill="#A85236" />
    </svg>
);

const VideoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.3333 4.66667L14.6667 2V10L11.3333 7.33333V10C11.3333 10.7333 10.7333 11.3333 10 11.3333H2C1.26667 11.3333 0.666667 10.7333 0.666667 10V3.33333C0.666667 2.6 1.26667 2 2 2H10C10.7333 2 11.3333 2.6 11.3333 3.33333V4.66667ZM10 9.33333V4H2V9.33333H10Z" fill="#A85236" />
    </svg>
);

const DocumentIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.33333 1.33333H2.66667C1.93333 1.33333 1.34 1.93333 1.34 2.66667L1.33333 13.3333C1.33333 14.0667 1.92667 14.6667 2.66001 14.6667H11.3333C12.0667 14.6667 12.6667 14.0667 12.6667 13.3333V4.66667L9.33333 1.33333ZM10.6667 12H3.33333V10.6667H10.6667V12ZM10.6667 9.33333H3.33333V8H10.6667V9.33333ZM8.66667 5.33333V2.33333L11.6667 5.33333H8.66667Z" fill="#A85236" />
    </svg>
);

const RightArrowIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 0L4.9425 1.0575L9.1275 5.25H0V6.75H9.1275L4.9425 10.9425L6 12L12 6L6 0Z" fill="#A85236" />
    </svg>
);

const relatedItems = [
    {
        id: 'r1',
        title: 'The AI Engineer Course 2026: Complete AI Engine...',
        type: 'Course',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
        id: 'r2',
        title: 'Data Engineering Foundation',
        type: 'Textbook',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600'
    }
];

const CourseDetailsPage: React.FC = () => {
    const history = useHistory();

    return (
        <IonPage className="course-details-page">
            <IonHeader className="ion-no-border">
                <IonToolbar className="course-details-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => history.goBack()} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <BackIcon />
                        </button>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <SearchIcon />
                            </button>
                            <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <ShareIcon />
                            </button>
                        </div>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                {/* Meta details */}
                <div className="course-details-title-section">
                    <h1 className="course-details-title">The AI Engineer Course 2026: Complete AI Engineer Bootcamp</h1>
                    <div className="course-meta">
                        <span className="rating">4.5 <span className="star">★</span></span>
                        <span className="dot">•</span>
                        <span>25 Lessons</span>
                    </div>
                </div>

                {/* Course Overview */}
                <div className="section-container">
                    <h2 className="section-title">Course Overview</h2>
                    <div className="course-overview-meta">
                        <div className="overview-meta-item">
                            <CalendarIcon />
                            <span>4 Weeks</span>
                        </div>
                        <div className="overview-meta-item">
                            <VideoIcon />
                            <span>25 Lessons</span>
                        </div>
                    </div>
                    <p className="course-description">
                        Introduction to Cyber Security course for beginners is designed to give you a
                        foundational look at today's cybersecurity landscape and provide you with the tools to
                        evaluate and manage security protocols in information processing systems.
                    </p>
                </div>

                {/* Skills */}
                <div className="section-container">
                    <h2 className="section-title">Skills you will learn</h2>
                    <ul className="skills-list">
                        <li><CheckIcon /> Business analysis, planning, and monitoring</li>
                        <li><CheckIcon /> Elicitation and collaboration</li>
                        <li><CheckIcon /> Requirements life cycle management</li>
                        <li><CheckIcon /> Business intelligence perspective</li>
                        <li><CheckIcon /> Requirements analysis and design definition</li>
                    </ul>
                </div>

                {/* Best Suited For */}
                <div className="section-container">
                    <h2 className="section-title">Best Suited For</h2>
                    <ul className="skills-list">
                        <li><CheckIcon /> Business Analyst</li>
                        <li><CheckIcon /> Data Analyst</li>
                        <li><CheckIcon /> Business Analyst</li>
                        <li><CheckIcon /> Analytics Managers</li>
                    </ul>
                </div>

                {/* Course Curriculum */}
                <div className="section-container" style={{ paddingBottom: '8px' }}>
                    <h2 className="section-title">Course Curriculum</h2>

                    <IonAccordionGroup className="curriculum-accordion-group">
                        <IonAccordion value="week1" className="curriculum-accordion">
                            <IonItem slot="header" className="curriculum-header" lines="none">
                                <IonLabel>
                                    <div>Week 1: Foundation & Basics</div>
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
                                <IonLabel>Week 2: Core Competencies</IonLabel>
                            </IonItem>
                            <div slot="content">
                                {/* Empty for design */}
                            </div>
                        </IonAccordion>

                        <IonAccordion value="week3" className="curriculum-accordion">
                            <IonItem slot="header" className="curriculum-header" lines="none">
                                <IonLabel>Week 3: Professional Application</IonLabel>
                            </IonItem>
                            <div slot="content">
                                {/* Empty for design */}
                            </div>
                        </IonAccordion>
                    </IonAccordionGroup>
                </div>

                {/* Related Content */}
                <div className="section-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <h2 className="section-title" style={{ margin: 0 }}>Related Content</h2>
                        <RightArrowIcon />
                    </div>

                    <div className="related-content-container">
                        {relatedItems.map(item => (
                            <div
                                key={item.id}
                                className="content-card standard-card related-card"
                                onClick={() => history.push(`/video/${item.id}`)}
                            >
                                <IonImg src={item.thumbnail} alt={item.title} className="card-img"  />
                                <div className="card-badge bg-yellow-badge">{item.type}</div>
                                <h3 className="card-title">{item.title}</h3>
                                <div className="card-meta">
                                    <span className="rating">{item.rating} <span className="star">★</span></span>
                                    <span className="dot">•</span>
                                    <span className="lessons">{item.lessons} Lessons</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQs */}
                <div className="section-container" style={{ paddingBottom: '32px' }}>
                    <h2 className="section-title">Frequently asked questions</h2>

                    <IonAccordionGroup className="faq-accordion-group">
                        <IonAccordion value="faq1" className="faq-accordion">
                            <IonItem slot="header" className="faq-header" lines="none">
                                <IonLabel style={{ whiteSpace: 'normal', paddingRight: '12px' }}>What kind of courses are available on this platform?</IonLabel>
                            </IonItem>
                            <div slot="content" className="faq-content">
                                Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.
                            </div>
                        </IonAccordion>

                        <IonAccordion value="faq2" className="faq-accordion">
                            <IonItem slot="header" className="faq-header" lines="none">
                                <IonLabel style={{ whiteSpace: 'normal' }}>What if I need help during the course?</IonLabel>
                            </IonItem>
                            <div slot="content" className="faq-content">
                                {/* content */}
                            </div>
                        </IonAccordion>

                        <IonAccordion value="faq3" className="faq-accordion">
                            <IonItem slot="header" className="faq-header" lines="none">
                                <IonLabel style={{ whiteSpace: 'normal', paddingRight: '12px' }}>Are the courses accredited or do they offer certification?</IonLabel>
                            </IonItem>
                            <div slot="content" className="faq-content">
                                {/* content */}
                            </div>
                        </IonAccordion>

                        <IonAccordion value="faq4" className="faq-accordion">
                            <IonItem slot="header" className="faq-header" lines="none">
                                <IonLabel style={{ whiteSpace: 'normal' }}>Can I learn in offline mode?</IonLabel>
                            </IonItem>
                            <div slot="content" className="faq-content">
                                {/* content */}
                            </div>
                        </IonAccordion>
                    </IonAccordionGroup>
                </div>

                {/* padding for CTA */}
                <div style={{ height: '80px' }}></div>
            </IonContent>

            <div className="bottom-cta-bar">
                <span className="bottom-cta-text">Let's Get Started</span>
                <RightArrowIcon />
            </div>
        </IonPage>
    );
};

export default CourseDetailsPage;

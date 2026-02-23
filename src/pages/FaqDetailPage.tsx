import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButtons,
} from '@ionic/react';
import './FaqDetailPage.css';

/* ── Chevron icon ── */
const ChevronDownIcon: React.FC = () => (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="#A85236" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── FAQ data per category ── */

interface FaqItem {
    question: string;
    answer: string;
}

const faqData: Record<string, { title: string; faqs: FaqItem[] }> = {
    login: {
        title: "Login FAQ's",
        faqs: [
            {
                question: 'What kind of courses are available on this platform?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Are the courses accredited or do they offer certification?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Can I learn in offline mode?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Are the courses accredited or do they offer certification?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Can I learn in offline mode?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
        ],
    },
    profile: {
        title: "Profile FAQ's",
        faqs: [
            {
                question: 'What kind of courses are available on this platform?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Are the courses accredited or do they offer certification?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Can I learn in offline mode?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
        ],
    },
    'course-certificates': {
        title: "Course & Certification FAQ's",
        faqs: [
            {
                question: 'What kind of courses are available on this platform?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Are the courses accredited or do they offer certification?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Can I learn in offline mode?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'What if I need help during the course?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Are the courses accredited or do they offer certification?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
            {
                question: 'Can I learn in offline mode?',
                answer: 'Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.',
            },
        ],
    },
};

/* ── Component ── */

const FaqDetailPage: React.FC = () => {
    const { category } = useParams<{ category: string }>();
    const history = useHistory();
    const data = faqData[category] || { title: "FAQ's", faqs: [] };

    const [expandedFaq, setExpandedFaq] = useState<number>(0);
    const [feedback, setFeedback] = useState<Record<number, 'yes' | 'no'>>({});

    const toggleFaq = (index: number) => {
        setExpandedFaq(prev => (prev === index ? -1 : index));
    };

    const handleFeedback = (index: number, value: 'yes' | 'no') => {
        setFeedback(prev => ({ ...prev, [index]: value }));
    };

    return (
        <IonPage className="faq-detail-page">
            {/* ── Header ── */}
            <IonHeader className="fd-header ion-no-border">
                <IonToolbar className="fd-toolbar">
                    <IonButtons slot="start">
                        <button className="fd-back-btn" onClick={() => history.push('/support')}>
                            <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 1L1 9L9 17" stroke="#A85236" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Content ── */}
            <IonContent className="fd-content">
                <div className="fd-container">
                    <h1 className="fd-section-title">{data.title}</h1>

                    <div className="fd-faq-list">
                        {data.faqs.map((faq, idx) => (
                            <div className="fd-faq-item" key={idx}>
                                <button
                                    className="fd-faq-question"
                                    onClick={() => toggleFaq(idx)}
                                    aria-expanded={expandedFaq === idx}
                                >
                                    <span className="fd-faq-question-text">{faq.question}</span>
                                    <span className={`fd-faq-chevron ${expandedFaq === idx ? 'expanded' : ''}`}>
                                        <ChevronDownIcon />
                                    </span>
                                </button>
                                {expandedFaq === idx && (
                                    <div className="fd-faq-answer">
                                        <p className="fd-faq-answer-text">{faq.answer}</p>
                                        <div className="fd-feedback-row">
                                            <span className="fd-feedback-label">Did this answer help you?</span>
                                            <button
                                                className={`fd-feedback-btn fd-feedback-no ${feedback[idx] === 'no' ? 'selected' : ''}`}
                                                onClick={() => handleFeedback(idx, 'no')}
                                            >
                                                No
                                            </button>
                                            <button
                                                className={`fd-feedback-btn fd-feedback-yes ${feedback[idx] === 'yes' ? 'selected' : ''}`}
                                                onClick={() => handleFeedback(idx, 'yes')}
                                            >
                                                Yes
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default FaqDetailPage;

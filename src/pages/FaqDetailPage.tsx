import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButtons,
} from '@ionic/react';
import { useFaqData } from '../hooks/useFaqData';
import './FaqDetailPage.css';

/* ── Chevron icon ── */
const ChevronDownIcon: React.FC = () => (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


/* ── Component ── */

const FaqDetailPage: React.FC = () => {
    const { category } = useParams<{ category: string }>();
    const history = useHistory();
    const { faqData, isLoading, isError } = useFaqData();

    const categoryData = faqData?.categories.find(c => c.slug === category);
    const data = categoryData
        ? { title: `${categoryData.title} FAQ's`, faqs: categoryData.faqs }
        : { title: "FAQ's", faqs: [] };

    const [expandedFaq, setExpandedFaq] = useState<number>(0);
    const [feedback, setFeedback] = useState<Record<number, 'yes' | 'no' | 'submitted' | null>>({});
    const [feedbackText, setFeedbackText] = useState<Record<number, string>>({});

    const toggleFaq = (index: number) => {
        setExpandedFaq(prev => (prev === index ? -1 : index));
    };

    const handleFeedback = (index: number, value: 'yes' | 'no') => {
        setFeedback(prev => ({ ...prev, [index]: value }));
    };

    const handleSubmitFeedback = (index: number) => {
        setFeedbackText(prev => ({ ...prev, [index]: '' }));
        setFeedback(prev => ({ ...prev, [index]: 'submitted' }));
    };

    return (
        <IonPage className="faq-detail-page">
            {/* ── Header ── */}
            <IonHeader className="fd-header ion-no-border">
                <IonToolbar className="fd-toolbar">
                    <IonButtons slot="start">
                        <button className="fd-back-btn" onClick={() => history.push('/support')}>
                            <svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 1L1 9L9 17" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Content ── */}
            <IonContent className="fd-content">
                <div className="fd-container">
                    {isLoading && <p className="fd-status-text">Loading...</p>}
                    {isError && <p className="fd-status-text">Failed to load FAQs. Please try again.</p>}

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
                                        {/* Content is sanitized by useFaqData before reaching here. */}
                        <div
                          className="fd-faq-answer-text"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />

                                        {feedback[idx] === 'yes' || feedback[idx] === 'submitted' ? (
                                            <div className="fd-feedback-thanks">
                                                <span>Thank you for your feedback!</span>
                                            </div>
                                        ) : feedback[idx] === 'no' ? (
                                            <div className="fd-feedback-form">
                                                <p className="fd-feedback-sorry">Sorry to hear that</p>
                                                <p className="fd-feedback-improve">What could we do to improve?</p>
                                                <textarea
                                                    className="fd-feedback-textarea"
                                                    placeholder="Tell us more..."
                                                    value={feedbackText[idx] || ''}
                                                    onChange={(e) =>
                                                        setFeedbackText(prev => ({ ...prev, [idx]: e.target.value }))
                                                    }
                                                    rows={3}
                                                />
                                                <button
                                                    className="fd-feedback-submit"
                                                    disabled={!feedbackText[idx]?.trim()}
                                                    onClick={() => handleSubmitFeedback(idx)}
                                                >
                                                    Submit Feedback
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="fd-feedback-row">
                                                <span className="fd-feedback-label">Did this answer help you?</span>
                                                <button
                                                    className="fd-feedback-btn fd-feedback-no"
                                                    onClick={() => handleFeedback(idx, 'no')}
                                                >
                                                    No
                                                </button>
                                                <button
                                                    className="fd-feedback-btn fd-feedback-yes"
                                                    onClick={() => handleFeedback(idx, 'yes')}
                                                >
                                                    Yes
                                                </button>
                                            </div>
                                        )}
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

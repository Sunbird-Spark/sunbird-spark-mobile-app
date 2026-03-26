import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    IonContent,
    IonPage,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { useFaqData } from '../hooks/useFaqData';
import useInteract from '../hooks/useInteract';
import './FaqDetailPage.css';
import useImpression from '../hooks/useImpression';

/* ── Chevron icon ── */
const ChevronDownIcon: React.FC = () => (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


/* ── Component ── */

const FaqDetailPage: React.FC = () => {
    useImpression({ pageid: 'FaqDetailPage', env: 'help' });
    const { category } = useParams<{ category: string }>();
    const { t } = useTranslation();
    const { faqData, isLoading, isError } = useFaqData();

    const categoryData = faqData?.categories.find(c => c.slug === category);
    const data = categoryData
        ? { title: `${categoryData.title} FAQ's`, faqs: categoryData.faqs }
        : { title: "FAQ's", faqs: [] };

    const { interact } = useInteract();
    const [expandedFaq, setExpandedFaq] = useState<number>(0);
    const [feedback, setFeedback] = useState<Record<number, 'yes' | 'no' | 'submitted' | null>>({});
    const [feedbackText, setFeedbackText] = useState<Record<number, string>>({});

    const toggleFaq = (index: number) => {
        const isOpening = expandedFaq !== index;
        setExpandedFaq(prev => (prev === index ? -1 : index));
        const faq = data.faqs[index];
        if (faq) {
            interact({
                id: 'faq',
                subtype: 'toggle-clicked',
                type: 'TOUCH',
                pageid: 'FaqDetailPage',
                extra: {
                    values: {
                        action: 'toggle-clicked',
                        position: index + 1,
                        value: { topic: faq.question, description: faq.answer },
                        isOpened: isOpening,
                    },
                },
            });
        }
    };

    const handleFeedback = (index: number, value: 'yes' | 'no') => {
        setFeedback(prev => ({ ...prev, [index]: value }));
    };

    const handleSubmitFeedback = (index: number) => {
        const text = feedbackText[index] ?? '';
        const faq = data.faqs[index];
        interact({
            id: 'faq',
            subtype: 'submit-clicked',
            type: 'TOUCH',
            pageid: 'FaqDetailPage',
            extra: {
                values: {
                    action: 'submit-clicked',
                    position: index + 1,
                    value: {
                        topic: faq?.question || String(index),
                        description: faq?.answer || '',
                        knowMoreText: text,
                    },
                },
            },
        });
        setFeedbackText(prev => ({ ...prev, [index]: '' }));
        setFeedback(prev => ({ ...prev, [index]: 'submitted' }));
    };

    return (
        <IonPage className="faq-detail-page">
            <AppHeader title="" showBack showScan={false} />

            {/* ── Content ── */}
            <IonContent className="fd-content">
                <div className="fd-container">
                    {isLoading && <p className="fd-status-text">{t('faqSection.loading')}</p>}
                    {isError && <p className="fd-status-text">{t('faqSection.error')}</p>}

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
                                                <span>{t('thankYouFeedback')}</span>
                                            </div>
                                        ) : feedback[idx] === 'no' ? (
                                            <div className="fd-feedback-form">
                                                <p className="fd-feedback-sorry">{t('sorryToHear')}</p>
                                                <p className="fd-feedback-improve">{t('whatCouldImprove')}</p>
                                                <textarea
                                                    className="fd-feedback-textarea"
                                                    placeholder={t('reportIssue')}
                                                    value={feedbackText[idx] || ''}
                                                    onChange={(e) =>
                                                        setFeedbackText(prev => ({ ...prev, [idx]: e.target.value }))
                                                    }
                                                    rows={3}
                                                />
                                                <button
                                                    className="fd-feedback-cancel"
                                                    onClick={() => setFeedback(prev => ({ ...prev, [idx]: null }))}
                                                    data-edataid="faq-feedback-cancel"
                                                    data-pageid="FaqDetailPage"
                                                >
                                                    {t('cancel')}
                                                </button>
                                                <button
                                                    className="fd-feedback-submit"
                                                    disabled={!feedbackText[idx]?.trim()}
                                                    onClick={() => handleSubmitFeedback(idx)}
                                                    data-edataid="faq-feedback-submit"
                                                    data-pageid="FaqDetailPage"
                                                >
                                                    {t('submitFeedback')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="fd-feedback-row">
                                                <span className="fd-feedback-label">{t('didThisHelp')}</span>
                                                <button
                                                    className="fd-feedback-btn fd-feedback-no"
                                                    onClick={() => handleFeedback(idx, 'no')}
                                                    data-edataid="faq-feedback-no"
                                                    data-pageid="FaqDetailPage"
                                                    data-cdata={JSON.stringify([{ id: String(idx), type: 'FAQIndex' }])}
                                                >
                                                    {t('no')}
                                                </button>
                                                <button
                                                    className="fd-feedback-btn fd-feedback-yes"
                                                    onClick={() => handleFeedback(idx, 'yes')}
                                                    data-edataid="faq-feedback-yes"
                                                    data-pageid="FaqDetailPage"
                                                    data-cdata={JSON.stringify([{ id: String(idx), type: 'FAQIndex' }])}
                                                >
                                                    {t('yes')}
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

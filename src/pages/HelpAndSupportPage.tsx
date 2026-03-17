import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButtons,
    IonModal,
    IonToast,
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { useFaqData } from '../hooks/useFaqData';
import { useFormRead } from '../hooks/useFormRead';
import './HelpAndSupportPage.css';

/* ── Inline SVG Icons ── */

const WriteIcon: React.FC = () => (
    <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.28125 0.720215V1.93018H3.15723C2.20111 1.93018 1.35938 2.77191 1.35938 3.72803V13.3384C1.35952 14.2944 2.20119 15.1362 3.15723 15.1362H12.1182C13.0741 15.1361 13.9159 14.2943 13.916 13.3384V8.51318H15.2549V13.3501C15.1196 15.1056 13.765 16.475 12.1182 16.4751H3.15723C1.51603 16.4751 0.149555 15.1094 0.149414 13.4683V3.72803C0.149414 2.08674 1.51594 0.720215 3.15723 0.720215H9.28125Z" fill="var(--ion-color-primary)" stroke="var(--ion-color-primary)" stroke-width="0.3" />
        <path d="M15.2969 0.153564C15.5243 0.174245 15.7221 0.297871 15.8721 0.517822L17.8203 2.9856C17.986 3.16148 18.0155 3.40591 17.9795 3.62231C17.9423 3.84551 17.8324 4.0702 17.6787 4.22388L17.6719 4.23071L17.6641 4.23657L11.4297 9.04126C11.4033 9.06757 11.3746 9.09794 11.3408 9.12134C11.2956 9.15265 11.2475 9.17223 11.1895 9.18384C11.0896 9.2038 10.9393 9.20239 10.6895 9.20239C10.2982 9.20239 9.517 9.20186 8.21875 9.07251H7.55176V8.26001L7.55469 8.24634C7.81437 6.81811 7.97827 6.09577 8.09473 5.71313C8.15286 5.52217 8.20162 5.40633 8.25 5.32739C8.27533 5.28609 8.30113 5.2553 8.32324 5.23169L8.38184 5.1731L8.38965 5.16724L14.624 0.362549L14.6318 0.355713C14.8436 0.214605 15.0726 0.133177 15.2969 0.153564ZM9.38281 6.15942C9.36028 6.21159 9.33452 6.28829 9.30566 6.39185C9.27206 6.51243 9.23591 6.65983 9.19531 6.83032C9.12559 7.12316 9.04094 7.47985 8.93555 7.86646C9.32242 7.87391 9.68067 7.90099 9.98828 7.92896C10.322 7.95929 10.5858 7.98588 10.7705 7.99048L16.584 3.4397L15.2061 1.60181L9.38281 6.15942Z" fill="var(--ion-color-primary)" stroke="var(--ion-color-primary)" stroke-width="0.3" />
    </svg>

);

const ArrowRightIcon: React.FC = () => (
    <svg width="18" height="11" viewBox="0 0 18 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 1L17 5.5M17 5.5L12.5 10M17 5.5H1"
            stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronDownIcon: React.FC = () => (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── Data ── */

/* ── Component ── */

const HelpAndSupportPage: React.FC = () => {
    const history = useHistory();
    const [expandedFaq, setExpandedFaq] = useState<number>(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [showToast, setShowToast] = useState(false);

    const { faqData, isLoading: faqLoading } = useFaqData();
    const { data: formData } = useFormRead();

    const categories = faqData?.categories ?? [];
    const mostViewedFaqs = faqData?.categories.flatMap(c => c.faqs).slice(0, 4) ?? [];

    const formFields = formData?.data?.form?.data?.fields;
    const categoryField = formFields?.find((f: any) => f.code === 'category');
    const subcategoryField = formFields?.find((f: any) => f.code === 'subcategory');

    const reportCategories: { value: string; label: string }[] =
        categoryField?.templateOptions?.options ?? [];

    const reportSubcategories: { value: string; label: string }[] =
        selectedCategory
            ? (subcategoryField?.templateOptions?.options?.[selectedCategory] ?? [])
            : [];

    const handleCategoryChange = (value: string) => {
        setSelectedCategory(value);
        setSelectedSubcategory('');
    };

    const toggleFaq = (index: number) => {
        setExpandedFaq(prev => (prev === index ? -1 : index));
    };

    return (
        <IonPage className="help-support-page">
            {/* ── Header ── */}
            <IonHeader className="hs-header ion-no-border">
                <IonToolbar className="hs-toolbar">
                    <div className="hs-title" slot="start">Help and Support</div>
                    <IonButtons slot="end">
                        <button className="hs-header-icon-btn" onClick={() => setShowModal(true)}>
                            <WriteIcon />
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Content ── */}
            <IonContent className="hs-content">
                <div className="hs-container">
                    {/* Hero */}
                    <h1 className="hs-hero-text">How can we assist you today?</h1>

                    {/* Category Cards */}
                    {faqLoading ? (
                        <div className="hs-loading">Loading...</div>
                    ) : (
                    <div className="hs-category-cards">
                        {categories.map((cat, idx) => (
                            <div
                                className="hs-category-card"
                                key={idx}
                                onClick={() => history.push(`/support/${cat.slug}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="hs-accent-bar" />
                                <h2 className="hs-category-title">{cat.title}</h2>
                                <div className="hs-category-footer">
                                    <span className="hs-faq-count">{cat.faqCount} FAQ's</span>
                                    <span className="hs-arrow-icon">
                                        <ArrowRightIcon />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>

                <BottomNavigation />
            </IonContent>

            {/* ── Report an Issue Modal ── */}
            <IonModal
                isOpen={showModal}
                onDidDismiss={() => setShowModal(false)}
                className="hs-report-modal"
            >
                <IonPage>
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="hs-modal-toolbar">
                            <div className="hs-modal-title" slot="start">Report an Issue</div>
                            <IonButtons slot="end">
                                <button className="hs-modal-close" onClick={() => setShowModal(false)}>
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L9 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M9 1L1 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent className="hs-modal-content ion-padding">
                        <div className="hs-modal-form">
                            <div className="hs-select-wrapper">
                                <select
                                    className="hs-modal-select"
                                    value={selectedCategory}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                >
                                    <option value="" disabled>Select Category</option>
                                    {reportCategories.map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                <svg className="hs-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                                    <path d="M1 1L5 5L9 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <div className="hs-select-wrapper">
                                <select
                                    className="hs-modal-select"
                                    value={selectedSubcategory}
                                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                                >
                                    <option value="" disabled>Select Subcategory</option>
                                    {reportSubcategories.map((sub) => (
                                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                                    ))}
                                </select>
                                <svg className="hs-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                                    <path d="M1 1L5 5L9 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <textarea
                                className="hs-modal-textarea"
                                placeholder="Tell us more"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </IonContent>

                    <div className="hs-modal-footer">
                        <button className="hs-modal-submit" onClick={() => {
                            setShowModal(false);
                            setShowToast(true);
                            setSelectedCategory('');
                            setSelectedSubcategory('');
                            setFeedbackText('');
                        }}>
                            Submit Feedback
                        </button>
                    </div>
                </IonPage>
            </IonModal>

            <IonToast
                isOpen={showToast}
                onDidDismiss={() => setShowToast(false)}
                message="Thanks for your feedback. We may not be able to respond to every suggestion, but your feedback helps make this application better for everyone."
                duration={4000}
                position="bottom"
            />
        </IonPage>
    );
};

export default HelpAndSupportPage;

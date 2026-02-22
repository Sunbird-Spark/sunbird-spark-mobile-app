import React, { useState, useRef, useEffect } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import './MyLearningPage.css';

interface CourseItem {
    id: number;
    title: string;
    dueDate: string;
    progress: number;
    status: 'Ongoing' | 'Completed';
}

const courses: CourseItem[] = [
    { id: 1, title: 'Data Engineering Foundations', dueDate: '20th Feb', progress: 30, status: 'Ongoing' },
    { id: 2, title: 'The AI Engineer Course 2026: Compl...', dueDate: '20th Feb', progress: 70, status: 'Ongoing' },
    { id: 3, title: 'Data Engineering Foundations', dueDate: '20th Feb', progress: 100, status: 'Completed' },
    { id: 4, title: 'The AI Engineer Course 2026: Compl...', dueDate: '20th Feb', progress: 50, status: 'Ongoing' },
];

/* ── Circular progress ring ── */
const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 26 }) => {
    const stroke = 3;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="ml-progress-ring">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#F0CE94"
                strokeWidth={stroke}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#A85236"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </svg>
    );
};

/* ── Eye icon for Preview Certificate ── */
const EyeIcon: React.FC = () => (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 1C4 1 1.5 5 1.5 5C1.5 5 4 9 7 9C10 9 12.5 5 12.5 5C12.5 5 10 1 7 1Z" stroke="#CC8545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="5" r="2" stroke="#CC8545" strokeWidth="1.5" />
    </svg>
);

/* ── Download icon ── */
const DownloadIcon: React.FC = () => (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 1V10M5.5 10L2 6.5M5.5 10L9 6.5" stroke="#CC8545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="1" y1="13" x2="10" y2="13" stroke="#CC8545" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

/* ── Filter icon ── */
const FilterIcon: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1H17L11 9.5V15L7 17V9.5L1 1Z" stroke="#A85236" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

type FilterOption = 'All' | 'Ongoing' | 'Completed';

const MyLearningPage: React.FC = () => {
    const [filter, setFilter] = useState<FilterOption>('All');
    const [showFilter, setShowFilter] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilter(false);
            }
        };
        if (showFilter) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilter]);

    const filteredCourses = filter === 'All'
        ? courses
        : courses.filter(c => c.status === filter);

    return (
        <IonPage className="my-learning-page">
            {/* ── Header ── */}
            <IonHeader className="ml-header ion-no-border">
                <IonToolbar className="ml-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton
                            defaultHref="/profile"
                            text=""
                            icon={chevronBackOutline}
                            className="ml-back-btn"
                        />
                    </IonButtons>
                    <IonTitle className="ml-title">My Learning</IonTitle>
                    <IonButtons slot="end">
                        <button className="ml-filter-btn" onClick={() => setShowFilter(v => !v)}>
                            <FilterIcon />
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Course cards ── */}
            <IonContent className="ml-content">
                {/* Filter dropdown — rendered inside IonContent so it's not clipped by IonHeader */}
                {showFilter && (
                    <div className="ml-filter-dropdown" ref={filterRef}>
                        {(['All', 'Ongoing', 'Completed'] as FilterOption[]).map(opt => (
                            <button
                                key={opt}
                                className={`ml-filter-option ${filter === opt ? 'ml-filter-active' : ''}`}
                                onClick={() => { setFilter(opt); setShowFilter(false); }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
                <div className="ml-cards-container">
                    {filteredCourses.map(course => (
                        <div className="ml-card" key={course.id}>
                            {/* Card body */}
                            <div className="ml-card-body">
                                {/* Left content */}
                                <div className="ml-card-info">
                                    {/* Status badge */}
                                    <span className={`ml-badge ${course.status === 'Completed' ? 'ml-badge-completed' : 'ml-badge-ongoing'}`}>
                                        {course.status}
                                    </span>

                                    <h3 className="ml-course-title">{course.title}</h3>
                                    <p className="ml-due-date">Due Date : {course.dueDate}</p>

                                    {/* Progress row */}
                                    <div className="ml-progress-row">
                                        <ProgressRing progress={course.progress} />
                                        <span className="ml-progress-text">{course.progress}%</span>
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                <div className="ml-thumbnail">
                                    <div className="ml-thumb-placeholder" />
                                </div>
                            </div>

                            {/* Card footer — action link */}
                            <div className="ml-card-footer">
                                <button className="ml-cert-btn">
                                    {course.status === 'Completed' ? (
                                        <>
                                            <DownloadIcon />
                                            <span>Download Certificate</span>
                                        </>
                                    ) : (
                                        <>
                                            <EyeIcon />
                                            <span>Preview Certificate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default MyLearningPage;

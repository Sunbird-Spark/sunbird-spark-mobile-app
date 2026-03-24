import React, { useState, useRef } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonAlert,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import './DownloadedContentsPage.css';
import useImpression from '../hooks/useImpression';

interface DownloadedItem {
    id: number;
    title: string;
    dueDate: string;
    progress: number;
    status: 'Ongoing' | 'Completed';
}

const initialItems: DownloadedItem[] = [
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
        <svg width={size} height={size} className="dc-progress-ring">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ion-color-warning-shade, var(--color-f0ce94, #F0CE94))" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ion-color-primary)" strokeWidth={stroke}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </svg>
    );
};

/* ── Trash icon ── */
const TrashIcon: React.FC = () => (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 5H19M8 10V16M12 10V16M3 5L4 19C4 20.1046 4.89543 21 6 21H14C15.1046 21 16 20.1046 16 19L17 5M7 5V2C7 1.44772 7.44772 1 8 1H12C12.5523 1 13 1.44772 13 2V5" stroke="var(--color-a14f34, #A14F34)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── Edit icon ── */
const EditIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.5472 1.00861C10.9092 1.0474 11.2023 1.21546 11.435 1.39214C11.6763 1.57916 11.9435 1.8446 12.2106 2.11435L12.3572 2.26259C12.633 2.53234 12.8915 2.79521 13.0811 3.03997C13.2879 3.30541 13.4775 3.64756 13.4775 4.09054C13.4775 4.53353 13.2879 4.87567 13.0811 5.14112C12.8915 5.38588 12.633 5.64874 12.3572 5.9185L6.16053 12.1185C6.02264 12.2547 5.85027 12.4409 5.61757 12.5693C5.39349 12.6977 5.14355 12.7529 4.96257 12.7985L2.71319 13.3604L2.70456 13.3613L2.67016 13.3708C2.54089 13.4027 2.35123 13.4527 2.18748 13.469C2.0065 13.4863 1.61865 13.4923 1.29977 13.1743C0.980886 12.8563 0.989534 12.4667 1.00677 12.2892C1.02401 12.1211 1.07571 11.9307 1.10156 11.8031L1.67903 9.5158C1.72212 9.32964 1.77384 9.07971 1.90311 8.85218C2.03239 8.62552 2.22201 8.44971 2.35129 8.3144L8.55646 2.11435C8.82363 1.8446 9.09082 1.57916 9.33213 1.39214C9.5993 1.19047 9.94401 1 10.3835 1L10.5472 1.00861Z" stroke="var(--color-a14f34, #A14F34)" strokeWidth="2" />
        <path d="M8.229 2.79765L10.8145 1.07397L13.4 3.65948L11.6763 6.24499L8.229 2.79765Z" fill="var(--color-a14f34, #A14F34)" />
    </svg>
);

/* ── Swipeable card ── */
const SwipeableCard: React.FC<{
    item: DownloadedItem;
    onDelete: (item: DownloadedItem) => void;
}> = ({ item, onDelete }) => {
    const startX = useRef(0);
    const currentX = useRef(0);
    const [offset, setOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const swipingRef = useRef(false);

    const onTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        swipingRef.current = true;
        setIsSwiping(true);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (!swipingRef.current) return;
        currentX.current = e.touches[0].clientX;
        const diff = startX.current - currentX.current;
        // Only allow left swipe, max 70px
        if (diff > 0) setOffset(Math.min(diff, 70));
        else setOffset(0);
    };
    const onTouchEnd = () => {
        swipingRef.current = false;
        setIsSwiping(false);
        // Snap: if swiped more than 35px, show delete; otherwise reset
        setOffset(prev => (prev > 35 ? 70 : 0));
    };

    // Mouse support for desktop
    const onMouseDown = (e: React.MouseEvent) => {
        startX.current = e.clientX;
        swipingRef.current = true;
        setIsSwiping(true);
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!swipingRef.current) return;
        const diff = startX.current - e.clientX;
        if (diff > 0) setOffset(Math.min(diff, 70));
        else setOffset(0);
    };
    const onMouseUp = () => {
        swipingRef.current = false;
        setIsSwiping(false);
        setOffset(prev => (prev > 35 ? 70 : 0));
    };
    const onMouseLeave = () => {
        if (swipingRef.current) {
            swipingRef.current = false;
            setIsSwiping(false);
            setOffset(prev => (prev > 35 ? 70 : 0));
        }
    };

    return (
        <div className="dc-swipe-wrapper">
            {/* Delete action behind */}
            <div className="dc-delete-action" onClick={() => onDelete(item)}>
                <TrashIcon />
            </div>

            {/* Card that slides */}
            <div
                className="dc-card"
                style={{ transform: `translateX(-${offset}px)`, transition: isSwiping ? 'none' : 'transform 0.25s ease' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
            >
                <div className="dc-card-body">
                    <div className="dc-card-info">
                        <span className={`dc-badge ${item.status === 'Completed' ? 'dc-badge-completed' : 'dc-badge-ongoing'}`}>
                            {item.status}
                        </span>
                        <h3 className="dc-course-title">{item.title}</h3>
                        <p className="dc-due-date">Due Date : {item.dueDate}</p>
                        <div className="dc-progress-row">
                            <ProgressRing progress={item.progress} />
                            <span className="dc-progress-text">{item.progress}%</span>
                        </div>
                    </div>
                    <div className="dc-thumbnail">
                        <div className="dc-thumb-placeholder" />
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main page ── */
const DownloadedContentsPage: React.FC = () => {
    useImpression({ pageid: 'DownloadedContentsPage', env: 'profile' });
    const [items, setItems] = useState(initialItems);
    const [deleteTarget, setDeleteTarget] = useState<DownloadedItem | null>(null);
    const [showAlert, setShowAlert] = useState(false);

    const handleDeleteRequest = (item: DownloadedItem) => {
        setDeleteTarget(item);
        setShowAlert(true);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
        }
        setDeleteTarget(null);
        setShowAlert(false);
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
        setShowAlert(false);
    };

    return (
        <IonPage className="downloaded-contents-page">
            {/* ── Header ── */}
            <IonHeader className="dc-header ion-no-border">
                <IonToolbar className="dc-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton
                            defaultHref="/profile"
                            text=""
                            icon={chevronBackOutline}
                            className="dc-back-btn"
                        />
                    </IonButtons>
                    <IonTitle className="dc-title">Downloaded Contents</IonTitle>
                    <IonButtons slot="end">
                        <button className="dc-edit-btn">
                            <EditIcon />
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Content ── */}
            <IonContent className="dc-content">
                <div className="dc-cards-container">
                    {items.map(item => (
                        <SwipeableCard key={item.id} item={item} onDelete={handleDeleteRequest} />
                    ))}
                </div>
            </IonContent>

            {/* ── Delete confirmation alert ── */}
            <IonAlert
                isOpen={showAlert}
                onDidDismiss={cancelDelete}
                header="Delete Content"
                message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
                cssClass="dc-delete-alert"
                buttons={[
                    { text: 'Cancel', role: 'cancel', handler: cancelDelete },
                    { text: 'Delete', role: 'destructive', handler: confirmDelete },
                ]}
            />
        </IonPage>
    );
};

export default DownloadedContentsPage;

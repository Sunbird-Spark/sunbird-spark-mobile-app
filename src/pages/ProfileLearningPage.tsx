import React, { useState, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useUserEnrollmenList } from '../hooks/useUserEnrollment';
import { certificateService } from '../services/CertificateService';
import type { TrackableCollection } from '../types/collectionTypes';
import './ProfileLearningPage.css';

type FilterOption = 'all' | 'ongoing' | 'completed';

// ── Icons ─────────────────────────────────────────────────────────────────────

const FilterIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2H16V0H2V2ZM2 3.58997V2H0V3.58997H2ZM6.41003 8L2 3.58997L0.589966 5L5 9.41003L6.41003 8ZM5 9.41003V16.3101H7V9.41003H5ZM5 16.3101C5 17.3301 5.99997 18.05 6.96997 17.73L6.33997 15.83C6.66997 15.72 7 15.9701 7 16.3101H5ZM6.96997 17.73L11.97 16.0601L11.34 14.17L6.33997 15.83L6.96997 17.73ZM11.97 16.0601C12.59 15.8601 13 15.29 13 14.64H11C11 14.42 11.14 14.23 11.34 14.17L11.97 16.0601ZM13 14.64V9.41003H11V14.64H13ZM16 3.58997L11.59 8L13 9.41003L17.41 5L16 3.58997ZM16 2V3.58997H18V2H16ZM17.41 5C17.79 4.62 18 4.11997 18 3.58997H16L17.41 5ZM13 9.41003L11.59 8C11.21 8.38 11 8.88003 11 9.41003H13ZM5 9.41003H7C7 8.88003 6.79003 8.38 6.41003 8L5 9.41003ZM0 3.58997C0 4.11997 0.209966 4.62 0.589966 5L2 3.58997H0ZM16 2H18C18 0.9 17.1 0 16 0V2ZM2 0C0.9 0 0 0.9 0 2H2V0Z" fill="var(--ion-color-primary)" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 1V9M7 9L4 6M7 9L10 6M2 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NoCertIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 10.5L4 13L7 11.5L10 13L9 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

// ── Progress ring ─────────────────────────────────────────────────────────────

const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 26 }) => {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="pl-progress-ring">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ion-color-warning-shade, var(--color-f0ce94, #F0CE94))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--ion-color-primary)" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

// ── Course card ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: TrackableCollection;
  downloadingId: string | null;
  onDownloadCertificate: (course: TrackableCollection) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, downloadingId, onDownloadCertificate }) => {
  const { t } = useTranslation();

  const isCompleted = course.status === 2;
  const progress = course.completionPercentage ?? 0;
  const hasCertificate = (course.issuedCertificates?.length ?? 0) > 0;
  const courseId = course.courseId ?? course.contentId ?? '';
  const isDownloading = downloadingId === courseId;
  const imageUrl = course.appIcon ?? course.posterImage ?? '';

  const dueDate = course.batch?.endDate
    ? new Date(course.batch.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  return (
    <div className="pl-card">
      <div className="pl-card-body">
        <div className="pl-card-info">
          <span className={`pl-badge ${isCompleted ? 'pl-badge-completed' : 'pl-badge-ongoing'}`}>
            {isCompleted ? t('completed') : t('ongoing')}
          </span>
          <h3 className="pl-course-title">{course.courseName ?? course.name ?? ''}</h3>
          {dueDate && (
            <p className="pl-due-date">{t('dueDate')} : {dueDate}</p>
          )}
          <div className="pl-progress-row">
            <ProgressRing progress={progress} />
            <span className="pl-progress-text">{progress}%</span>
          </div>
        </div>
        <div className="pl-thumbnail">
          {imageUrl
            ? <img src={imageUrl} alt={course.courseName ?? ''} />
            : <div className="pl-thumb-placeholder" />
          }
        </div>
      </div>

      {isCompleted && (
        <div className="pl-card-footer">
          {hasCertificate ? (
            <button
              className="pl-cert-btn"
              onClick={() => onDownloadCertificate(course)}
              disabled={isDownloading}
            >
              {isDownloading
                ? <IonSpinner name="crescent" style={{ width: '14px', height: '14px' }} />
                : <DownloadIcon />
              }
              {t('downloadCertificate')}
            </button>
          ) : (
            <button className="pl-cert-btn" disabled style={{ opacity: 0.45, cursor: 'default' }}>
              <NoCertIcon />
              {t('noCertificate')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const ProfileLearningPage: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [filter, setFilter] = useState<FilterOption>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: enrollmentResponse, isLoading, isError, refetch } = useUserEnrollmenList(userId);
  const courses = useMemo(() => enrollmentResponse?.data?.courses ?? [], [enrollmentResponse]);

  const filteredCourses = useMemo(() => {
    if (filter === 'ongoing') return courses.filter(c => c.status !== 2);
    if (filter === 'completed') return courses.filter(c => c.status === 2);
    return courses;
  }, [courses, filter]);

  const handleDownloadCertificate = async (course: TrackableCollection) => {
    const certId = course.issuedCertificates?.[0]?.identifier;
    if (!certId) return;

    const courseId = course.courseId ?? course.contentId ?? '';
    setDownloadingId(courseId);
    setDownloadError(null);
    try {
      await certificateService.downloadAndSave(certId);
    } catch {
      setDownloadError(t('certificateDownloadError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const filterOptions: { key: FilterOption; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'ongoing', label: t('ongoing') },
    { key: 'completed', label: t('completed') },
  ];

  return (
    <IonPage className="profile-learning-page">
      <IonHeader className="pl-header ion-no-border">
        <IonToolbar className="pl-toolbar">
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/profile"
              text=""
              icon={chevronBackOutline}
              color="primary"
            />
          </IonButtons>
          <IonTitle className="pl-title">{t('myLearning')}</IonTitle>
          <IonButtons slot="end">
            <div className="pl-filter-wrapper">
              <button className="pl-filter-btn" onClick={() => setFilterOpen(prev => !prev)}>
                <FilterIcon />
              </button>
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pl-content" onClick={() => filterOpen && setFilterOpen(false)}>

        {/* Filter dropdown */}
        {filterOpen && (
          <div className="pl-filter-dropdown" onClick={e => e.stopPropagation()}>
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                className={`pl-filter-option${filter === opt.key ? ' pl-filter-active' : ''}`}
                onClick={() => { setFilter(opt.key); setFilterOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--ion-color-danger)', marginBottom: '1rem' }}>{t('error')}</p>
            <button
              onClick={() => refetch()}
              style={{
                padding: '0.5rem 1.5rem',
                border: '1px solid var(--ion-color-primary)',
                borderRadius: '0.5rem',
                background: 'none',
                color: 'var(--ion-color-primary)',
                cursor: 'pointer',
              }}
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Download error banner */}
        {downloadError && (
          <div style={{
            margin: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--ion-color-danger-tint)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--ion-color-danger-shade)',
          }}>
            {downloadError}
          </div>
        )}

        {/* Course list */}
        {!isLoading && !isError && (
          <div className="pl-cards-container">
            {filteredCourses.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', padding: '2rem 0' }}>
                {t('noEnrolledCourses')}
              </p>
            ) : (
              filteredCourses.map(course => (
                <CourseCard
                  key={`${course.courseId ?? course.contentId}-${course.batchId}`}
                  course={course}
                  downloadingId={downloadingId}
                  onDownloadCertificate={handleDownloadCertificate}
                />
              ))
            )}
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default ProfileLearningPage;

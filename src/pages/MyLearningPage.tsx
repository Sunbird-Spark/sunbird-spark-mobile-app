import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonImg
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { ContentCardCarousel, ContentCardItem } from '../components/home/ContentCardCarousel';
import { courses as allCourses, getInProgressCourses } from '../data/mockData';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';

// ── Design tokens ──────────────────────────────────────────────────────────
const BRICK = 'var(--ion-color-primary)';
const ORANGE = 'var(--ion-color-primary-tint)';

// ── SVG icons ──────────────────────────────────────────────────────────────
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 20" fill="none" stroke="var(--ion-color-primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.37 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L6 6L11 1" stroke="var(--ion-color-dark, var(--color-222222, #222222))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Progress bar ───────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progress: number; color?: string }> = ({ progress, color = BRICK }) => (
  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgb(244, 244, 244)', borderRadius: '10px', overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: color, borderRadius: '10px' }} />
  </div>
);

// ── Concentric donut chart ─────────────────────────────────────────────────
const DonutChart: React.FC<{ hrsLabel: string }> = ({ hrsLabel }) => {
  const size = 133;
  const cx = size / 2;
  const cy = size / 2;

  const outerR = 52;
  const outerStroke = 10;
  const outerCirc = 2 * Math.PI * outerR;
  const outerOffset = outerCirc * (1 - 0.72);

  const innerR = 32;
  const innerStroke = 10;
  const innerCirc = 2 * Math.PI * innerR;
  const innerOffset = innerCirc * (1 - 0.55);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Outer track */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={outerStroke} />
      {/* Outer fill */}
      <circle
        cx={cx} cy={cy} r={outerR}
        fill="none" stroke={BRICK} strokeWidth={outerStroke}
        strokeDasharray={outerCirc}
        strokeDashoffset={outerOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Inner track */}
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={innerStroke} />
      {/* Inner fill */}
      <circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke={ORANGE} strokeWidth={innerStroke}
        strokeDasharray={innerCirc}
        strokeDashoffset={innerOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Center text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--ion-color-dark, var(--color-222222, #222222))" style={{ fontFamily: 'var(--ion-font-family)' }} fontSize="20" fontWeight="700">
        130
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgb(100,100,100)" style={{ fontFamily: 'var(--ion-font-family)' }} fontSize="10" fontWeight="400">
        {hrsLabel}
      </text>
    </svg>
  );
};

// ── Course card ────────────────────────────────────────────────────────────
interface CourseCardProps {
  thumbnail: string;
  title: string;
  progress: number;
  badgeLabel: string;
  badgeBg: string;
  badgeBorder: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ thumbnail, title, progress, badgeLabel, badgeBg, badgeBorder }) => (
  <div style={{
    backgroundColor: 'var(--ion-color-light)',
    borderRadius: '20px',
    boxShadow: '2px 2px 20px rgba(0,0,0,0.09)',
    padding: '14px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  }}>
    <div style={{ width: '119px', height: '119px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden' }}>
      <IonImg src={thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '119px', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
        <span style={{
          alignSelf: 'flex-start',
          backgroundColor: badgeBg,
          border: `1px solid ${badgeBorder}`,
          borderRadius: '36px',
          padding: '3px 10px',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--ion-color-dark, var(--color-000000, #000000))',
          whiteSpace: 'nowrap',
        }}>
          {badgeLabel}
        </span>
        <p style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--ion-color-dark, var(--color-222222, #222222))',
          margin: 0,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {title}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <div style={{ flex: 1 }}>
          <ProgressBar progress={progress} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ion-color-dark, var(--color-222222, #222222))', flexShrink: 0 }}>
          {progress}%
        </span>
      </div>
    </div>
  </div>
);

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'activeCourses' | 'completed' | 'upcoming' | 'paused';

const upcomingClasses = [
  {
    id: 1,
    time: '09:00 AM',
    title: 'Digital Literacy Fundamentals',
    subtitle: 'Module 3: Internet Safety',
    bg: 'rgb(245, 241, 243)',
  },
  {
    id: 2,
    time: '11:30 AM',
    title: 'Sustainable Development Goals',
    subtitle: 'Module 2: People-Focused Goals',
    bg: 'rgb(240, 246, 242)',
  },
];

// ── Page ───────────────────────────────────────────────────────────────────
const MyLearningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('activeCourses');
  const { t } = useTranslation();

  const inProgressCourses = getInProgressCourses();
  const completedCourses = allCourses.filter(c => c.enrolled && c.progress === 100);
  const activeCoursesFull = [...inProgressCourses, ...inProgressCourses].slice(0, 4);

  const recommendedItems: ContentCardItem[] = allCourses.slice(0, 4).map(c => ({
    id: c.id,
    title: c.title,
    thumbnail: c.thumbnail,
    tag: 'Course',
    rating: c.rating,
    lessons: c.lessons,
  }));

  const tabs: Tab[] = ['activeCourses', 'completed', 'upcoming', 'paused'];

  return (
    <IonPage>
      <AppHeader title={t('myLearning')} />

      <IonContent fullscreen>
        {/* ── Courses heading ── */}
        <div style={{ padding: '8px 16px' }}>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ion-color-dark, var(--color-222222, #222222))' }}>
              {t('courses')}
            </span>
            <ChevronDownIcon />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgb(230, 230, 230)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          marginBottom: '16px',
        }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flexShrink: 0,
                padding: '10px 16px',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${BRICK}` : '2px solid transparent',
                marginBottom: '-1px',
                backgroundColor: 'transparent',
                color: activeTab === tab ? BRICK : 'rgb(130, 130, 130)',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {/* ── Active Courses tab ── */}
        {activeTab === 'activeCourses' && (
          <>
            {/* Upcoming Classes */}
            <div style={{ padding: '0 16px 12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--ion-color-dark, var(--color-222222, #222222))', margin: '0 0 12px 0' }}>
                {t('upcomingClasses')}
              </h3>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {upcomingClasses.map(cls => (
                  <div
                    key={cls.id}
                    style={{
                      flexShrink: 0,
                      width: '220px',
                      backgroundColor: cls.bg,
                      borderRadius: '16px',
                      padding: '14px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ion-color-dark, var(--color-222222, #222222))', flexShrink: 0, paddingTop: '1px' }}>
                      {cls.time}
                    </span>
                    <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ion-color-dark, var(--color-222222, #222222))', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                        {cls.title}
                      </p>
                      <p style={{ fontSize: '11px', fontWeight: 400, color: 'rgb(100,100,100)', margin: 0, lineHeight: 1.3 }}>
                        {cls.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Course Cards */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeCoursesFull.map((course, idx) => (
                <CourseCard
                  key={`${course.id}-${idx}`}
                  thumbnail={course.thumbnail}
                  title={course.title}
                  progress={course.progress}
                  badgeLabel={t('courses')}
                  badgeBg="rgb(255, 241, 199)"
                  badgeBorder={ORANGE}
                />
              ))}
            </div>

            {/* View More */}
            <div style={{ padding: '16px' }}>
              <button style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${BRICK}`,
                backgroundColor: 'transparent',
                color: BRICK,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                {t('viewMoreCourses')}
              </button>
            </div>
          </>
        )}

        {/* ── Completed tab ── */}
        {activeTab === 'completed' && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completedCourses.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'rgb(100,100,100)', textAlign: 'center', padding: '32px 0' }}>
                {t('noCompletedCourses')}
              </p>
            ) : (
              completedCourses.map(course => (
                <CourseCard
                  key={course.id}
                  thumbnail={course.thumbnail}
                  title={course.title}
                  progress={100}
                  badgeLabel={t('completed')}
                  badgeBg="rgb(220, 242, 226)"
                  badgeBorder="rgb(49, 134, 86)"
                />
              ))
            )}
          </div>
        )}

        {/* ── Upcoming tab ── */}
        {activeTab === 'upcoming' && (
          <p style={{ fontSize: '14px', color: 'rgb(100,100,100)', textAlign: 'center', padding: '32px 0' }}>
            {t('noUpcomingCourses')}
          </p>
        )}

        {/* ── Paused tab ── */}
        {activeTab === 'paused' && (
          <p style={{ fontSize: '14px', color: 'rgb(100,100,100)', textAlign: 'center', padding: '32px 0' }}>
            {t('noPausedCourses')}
          </p>
        )}

        {/* ── Total Hrs Spent ── */}
        <div style={{ padding: '16px' }}>
          <div style={{ backgroundColor: 'rgb(255, 241, 199)', borderRadius: '20px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ion-color-dark, var(--color-222222, #222222))', margin: '0 0 16px 0' }}>
              {t('totalHrsSpent')}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <DonutChart hrsLabel={t('hrs')} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: t('courses'), value: `72 ${t('hrs')}`, color: BRICK },
                  { label: t('assessments'), value: `38 ${t('hrs')}`, color: ORANGE },
                  { label: t('practice'), value: `20 ${t('hrs')}`, color: 'rgb(102, 166, 130)' },
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '8px', borderRadius: '4px', backgroundColor: stat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ion-color-dark, var(--color-222222, #222222))', flex: 1 }}>{stat.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ion-color-dark, var(--color-222222, #222222))', flexShrink: 0 }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recommended Content ── */}
        <ContentCardCarousel title={t('recommendedContent')} items={recommendedItems} />

        {/* Bottom spacing */}
        <div style={{ height: '100px' }} />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default MyLearningPage;

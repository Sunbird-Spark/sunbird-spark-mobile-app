import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar, IonImg
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { ContentCardCarousel, ContentCardItem } from '../components/home/ContentCardCarousel';
import { courses as allCourses, getInProgressCourses } from '../data/mockData';
import { LanguageSelector } from '../components/common/LanguageSelector';

// ── Design tokens ──────────────────────────────────────────────────────────
const BRICK = 'rgb(168, 82, 54)';
const ORANGE = 'rgb(204, 133, 69)';
const FONT = "'Rubik', sans-serif";

// ── SVG icons ──────────────────────────────────────────────────────────────
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 20" fill="none" stroke="#a85236" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.37 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L6 6L11 1" stroke="rgb(34,34,34)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Progress bar ───────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progress: number; color?: string }> = ({ progress, color = BRICK }) => (
  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgb(244, 244, 244)', borderRadius: '10px', overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: color, borderRadius: '10px' }} />
  </div>
);

// ── Concentric donut chart ─────────────────────────────────────────────────
const DonutChart: React.FC = () => {
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
      <text x={cx} y={cy - 4} textAnchor="middle" fill="rgb(34,34,34)" fontFamily={FONT} fontSize="20" fontWeight="700">
        130
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgb(100,100,100)" fontFamily={FONT} fontSize="10" fontWeight="400">
        Hrs
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
    backgroundColor: '#ffffff',
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
          fontFamily: FONT,
          fontSize: '12px',
          fontWeight: 400,
          color: 'rgb(0,0,0)',
          whiteSpace: 'nowrap',
        }}>
          {badgeLabel}
        </span>
        <p style={{
          fontFamily: FONT,
          fontSize: '14px',
          fontWeight: 500,
          color: 'rgb(34,34,34)',
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
        <span style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 400, color: 'rgb(34,34,34)', flexShrink: 0 }}>
          {progress}%
        </span>
      </div>
    </div>
  </div>
);

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'Active Courses' | 'Completed' | 'Upcoming' | 'Paused';

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
  const [activeTab, setActiveTab] = useState<Tab>('Active Courses');

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

  const tabs: Tab[] = ['Active Courses', 'Completed', 'Upcoming', 'Paused'];

  return (
    <IonPage>
      {/* ── Header ── */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff', '--border-width': '0', '--padding-start': '0', '--padding-end': '0' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <h1 style={{ fontFamily: FONT, fontSize: '20px', fontWeight: 600, color: 'rgb(34,34,34)', margin: 0 }}>
              My Learning
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
                aria-label="Notifications"
              >
                <BellIcon />
              </button>
              <LanguageSelector />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* ── Courses heading ── */}
        <div style={{ padding: '8px 16px' }}>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: FONT, fontSize: '18px', fontWeight: 600, color: 'rgb(34,34,34)' }}>
              Courses
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
                fontFamily: FONT,
                fontSize: '14px',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Active Courses tab ── */}
        {activeTab === 'Active Courses' && (
          <>
            {/* Upcoming Classes */}
            <div style={{ padding: '0 16px 12px' }}>
              <h3 style={{ fontFamily: FONT, fontSize: '16px', fontWeight: 500, color: 'rgb(34,34,34)', margin: '0 0 12px 0' }}>
                Upcoming Classes
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
                    <span style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 600, color: 'rgb(34,34,34)', flexShrink: 0, paddingTop: '1px' }}>
                      {cls.time}
                    </span>
                    <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: FONT, fontSize: '13px', fontWeight: 500, color: 'rgb(34,34,34)', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                        {cls.title}
                      </p>
                      <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 400, color: 'rgb(100,100,100)', margin: 0, lineHeight: 1.3 }}>
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
                  badgeLabel="Course"
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
                fontFamily: FONT,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                View More Courses
              </button>
            </div>
          </>
        )}

        {/* ── Completed tab ── */}
        {activeTab === 'Completed' && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completedCourses.length === 0 ? (
              <p style={{ fontFamily: FONT, fontSize: '14px', color: 'rgb(100,100,100)', textAlign: 'center', padding: '32px 0' }}>
                No completed courses yet.
              </p>
            ) : (
              completedCourses.map(course => (
                <CourseCard
                  key={course.id}
                  thumbnail={course.thumbnail}
                  title={course.title}
                  progress={100}
                  badgeLabel="Completed"
                  badgeBg="rgb(220, 242, 226)"
                  badgeBorder="rgb(49, 134, 86)"
                />
              ))
            )}
          </div>
        )}

        {/* ── Upcoming / Paused tabs ── */}
        {(activeTab === 'Upcoming' || activeTab === 'Paused') && (
          <p style={{ fontFamily: FONT, fontSize: '14px', color: 'rgb(100,100,100)', textAlign: 'center', padding: '32px 0' }}>
            No {activeTab.toLowerCase()} courses yet.
          </p>
        )}

        {/* ── Total Hrs Spent ── */}
        <div style={{ padding: '16px' }}>
          <div style={{ backgroundColor: 'rgb(255, 241, 199)', borderRadius: '20px', padding: '16px' }}>
            <h3 style={{ fontFamily: FONT, fontSize: '16px', fontWeight: 600, color: 'rgb(34,34,34)', margin: '0 0 16px 0' }}>
              Total Hrs Spent
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <DonutChart />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Courses', value: '72 Hrs', color: BRICK },
                  { label: 'Assessments', value: '38 Hrs', color: ORANGE },
                  { label: 'Practice', value: '20 Hrs', color: 'rgb(102, 166, 130)' },
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '8px', borderRadius: '4px', backgroundColor: stat.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT, fontSize: '13px', fontWeight: 400, color: 'rgb(34,34,34)', flex: 1 }}>{stat.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: 'rgb(34,34,34)', flexShrink: 0 }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recommended Content ── */}
        <ContentCardCarousel title="Recommended Content" items={recommendedItems} />

        {/* Bottom spacing */}
        <div style={{ height: '100px' }} />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default MyLearningPage;

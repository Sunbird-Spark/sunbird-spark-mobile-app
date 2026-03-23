import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonProgressBar, IonBadge, IonImg } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Course } from '../../data/mockData';

interface CourseCardProps {
  course: Course;
  variant?: 'default' | 'compact' | 'horizontal';
}

const CourseCard: React.FC<CourseCardProps> = ({ course, variant = 'default' }) => {
  const router = useIonRouter();
  const { t } = useTranslation();

  const handleClick = () => {
    router.push(`/courses/${course.id}`, 'forward', 'push');
  };

  if (variant === 'compact') {
    return (
      <div className="featured-course-card">
        <IonCard button onClick={handleClick} className="compact-course-card">
          <div className="course-image-container">
            <IonImg 
              src={course.thumbnail || '/api/placeholder/200/120'} 
              alt={course.title} 
              className="course-image"
             />
          </div>
          <IonCardHeader className="compact-card-header">
            <IonCardTitle className="course-title">{course.title}</IonCardTitle>
            <div className="course-rating">
              <span className="rating-stars">⭐ {course.rating || '4.5'}</span>
            </div>
          </IonCardHeader>
        </IonCard>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <IonCard button onClick={handleClick} className="horizontal-course-card">
        <div className="horizontal-card-content">
          <div className="course-image-container horizontal">
            <IonImg 
              src={course.thumbnail || '/api/placeholder/100/100'} 
              alt={course.title} 
              className="course-image horizontal"
             />
          </div>
          <div className="card-text-content">
            <IonCardHeader className="horizontal-card-header">
              <IonCardTitle className="course-title">{course.title}</IonCardTitle>
              <IonCardSubtitle className="course-instructor">{course.instructor}</IonCardSubtitle>
            </IonCardHeader>
            {course.enrolled && course.progress > 0 && (
              <IonCardContent className="progress-content">
                <IonProgressBar value={course.progress / 100} className="course-progress" />
                <p className="progress-text">{course.progress}% {t('complete')}</p>
              </IonCardContent>
            )}
          </div>
        </div>
      </IonCard>
    );
  }

  return (
    <IonCard button onClick={handleClick} className="default-course-card">
      <div className="course-image-container">
        <IonImg 
          src={course.thumbnail || '/api/placeholder/300/180'} 
          alt={course.title} 
          className="course-image"
         />
      </div>
      {course.enrolled && (
        <IonBadge color="primary" className="enrolled-badge">
          {t('enrolled')}
        </IonBadge>
      )}
      <IonCardHeader>
        <IonCardTitle className="course-title">{course.title}</IonCardTitle>
        <IonCardSubtitle className="course-instructor">{course.instructor}</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <p className="course-meta">⏱️ {course.duration} • 📚 {course.lessons} lessons</p>
        {course.enrolled && course.progress > 0 && (
          <div className="progress-section">
            <IonProgressBar value={course.progress / 100} className="course-progress" />
            <p className="progress-text">{course.progress}%</p>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default CourseCard;

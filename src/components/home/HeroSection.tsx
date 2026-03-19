import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const HeroSection: React.FC = () => {
    const history = useHistory();
    const { t } = useTranslation();

    return (
        <section className="hero-section">
            {/* Decorative elements */}
            <div className="hero-decoration-dot hero-dot-brick" />
            <div className="hero-decoration-dot hero-dot-yellow" />
            <div className="hero-decoration-dot hero-dot-brick-small" />

            {/* Cream background shape */}
            <div className="hero-bg-shape" />

            <div className="hero-content">
                <h1 className="hero-title">
                    {t('heroSection.title')}
                </h1>
                <p className="hero-subtitle">
                    {t('heroSection.subtitle')}
                </p>
                <button
                    className="hero-cta-button"
                    onClick={() => history.push('/courses')}
                >
                    {t('heroSection.ctaButton')}
                    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 6L0.5 0H8.5L4.5 6Z" fill="white" transform="rotate(-90 4.5 3)" />
                    </svg>
                </button>
            </div>
        </section>
    );
};

export default HeroSection;

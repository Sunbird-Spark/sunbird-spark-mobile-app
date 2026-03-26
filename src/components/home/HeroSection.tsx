import React from 'react';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { FaArrowRight } from 'react-icons/fa6';

export const HeroSection: React.FC = () => {
    const router = useIonRouter();
    const { t } = useTranslation();

    return (
        <section className="hero-section">
            {/* Decorative elements */}
            <div className="hero-decoration-dot hero-dot-brick" />
            <div className="hero-decoration-dot hero-dot-yellow" />
            <div className="hero-decoration-dot hero-dot-brick-small" />

            <div className="hero-content">
                <h1 className="hero-title">
                    {t('heroSection.title')}
                </h1>
                <p className="hero-subtitle">
                    {t('heroSection.subtitle')}
                </p>
                <button
                    className="hero-cta-button"
                    onClick={() => router.push('/explore', 'root', 'replace')}
                >
                    {t('heroSection.ctaButton')}
                    <FaArrowRight />
                </button>
            </div>

            {/* Wave background shape */}
            <div className="hero-bg-wave">
                <svg width="390" height="169" viewBox="0 0 390 169" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M-71 39.2675L48.0177 70.9925C48.0177 70.9925 109.77 63.8084 160.214 58.0571C210.657 52.3059 269 16.8675 340.805 1.98982C393.896 -9.01038 446 29.1847 446 29.1847V168.867H-71V39.2675Z" fill="#FFF1C7"/>
                </svg>
            </div>
        </section>
    );
};

export default HeroSection;

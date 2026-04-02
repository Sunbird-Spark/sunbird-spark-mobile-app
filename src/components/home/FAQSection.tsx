import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFaqData } from '../../hooks/useFaqData';

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="10"
    height="5"
    viewBox="0 0 10 5"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`faq-chevron ${expanded ? 'faq-chevron-expanded' : ''}`}
  >
    <path d="M0 0L5 5L10 0" stroke="var(--ion-color-primary)" strokeWidth="2" />
  </svg>
);

export const FAQSection: React.FC = () => {
  const { t } = useTranslation();
  const { faqData, isLoading, isError } = useFaqData();
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const items = faqData?.general ?? [];

  if (isLoading) {
    return (
      <section className="faq-section">
        <h2 className="faq-heading">{t('faqSection.heading')}</h2>
        <p className="faq-status">{t('faqSection.loading')}</p>
      </section>
    );
  }

  if (isError || items.length === 0) return null;

  const toggleItem = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <section className="faq-section">
      <h2 className="faq-heading">{t('faqSection.heading')}</h2>
      <div className="faq-list">
        {items.map((item, index) => (
          <div
            key={index}
            className={`faq-item ${expandedIndex === index ? 'faq-item-expanded' : ''}`}
          >
            <button
              className="faq-question-button"
              onClick={() => toggleItem(index)}
              aria-expanded={expandedIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <span className="faq-question-text">{item.title}</span>
              <ChevronIcon expanded={expandedIndex === index} />
            </button>
            <div
              id={`faq-answer-${index}`}
              className="faq-answer faq-answer-html"
              hidden={expandedIndex !== index}
              // Content is sanitized by useFaqData before reaching here.
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;

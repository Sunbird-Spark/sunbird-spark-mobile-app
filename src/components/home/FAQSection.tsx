import React, { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqItems: FAQItem[] = [
    {
        question: 'What kind of courses are available on this platform?',
        answer:
            'Our platform offers a wide range of courses across various domains including technology, design, business, marketing, and more. Whether you\'re looking to upskill professionally or learn something new, we have courses tailored to different skill levels and interests.',
    },
    {
        question: 'What if I need help during the course?',
        answer:
            'We provide comprehensive support throughout your learning journey. You can reach out to instructors, access community forums, and contact our support team for any assistance you need.',
    },
    {
        question: 'Are the courses accredited or do they offer certification?',
        answer:
            'Yes, many of our courses offer certification upon completion. Some courses are also accredited by recognized institutions and industry bodies.',
    },
    {
        question: 'Can I learn in offline mode?',
        answer:
            'Yes, our mobile app supports offline learning. You can download course materials and continue learning even without an internet connection.',
    },
];

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg
        width="10"
        height="5"
        viewBox="0 0 10 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`faq-chevron ${expanded ? 'faq-chevron-expanded' : ''}`}
    >
        <path d="M0 0L5 5L10 0" stroke="#a85236" strokeWidth="2" />
    </svg>
);

export const FAQSection: React.FC = () => {
    const [expandedIndex, setExpandedIndex] = useState<number>(0);

    const toggleItem = (index: number) => {
        setExpandedIndex(expandedIndex === index ? -1 : index);
    };

    return (
        <section className="faq-section">
            <h2 className="faq-heading">Frequently asked questions</h2>
            <div className="faq-list">
                {faqItems.map((item, index) => (
                    <div
                        key={index}
                        className={`faq-item ${expandedIndex === index ? 'faq-item-expanded' : ''}`}
                    >
                        <button
                            className="faq-question-button"
                            onClick={() => toggleItem(index)}
                            aria-expanded={expandedIndex === index}
                        >
                            <span className="faq-question-text">{item.question}</span>
                            <ChevronIcon expanded={expandedIndex === index} />
                        </button>
                        {expandedIndex === index && (
                            <div className="faq-answer">
                                <p>{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQSection;

import React from 'react';
import { useIonRouter } from '@ionic/react';
import { IonCard } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export interface Category {
    name: string;
    gradient: string;
}

interface CategoriesGridProps {
    categories: Category[];
    title?: string;
}

const WhiteBar = () => (
    <svg width="15" height="2" viewBox="0 0 15 2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 1C0 0.447715 0.447715 0 1 0H14C14.5523 0 15 0.447715 15 1C15 1.55228 14.5523 2 14 2H1C0.447715 2 0 1.55228 0 1Z" fill="white"/>
    </svg>
);

const IconScreen = () => (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5651 6.26062H7.94556V8.34757H12.5651V6.26062Z" fill="white"/>
        <path d="M12.5651 3.13063H7.94556V5.21757H12.5651V3.13063Z" fill="white"/>
        <path d="M6.83684 3.13063H4.43469V8.34795H6.83684V3.13063Z" fill="white"/>
        <path d="M12.0016 14.9835L9.05443 14.0588V12.5219H7.94567V14.0589L4.99866 14.9834C4.70813 15.0745 4.55147 15.37 4.64823 15.6433C4.74522 15.9178 5.06088 16.0643 5.34948 15.9732L8.50013 14.9848L11.6508 15.9732C11.9396 16.0644 12.2551 15.9176 12.352 15.6433C12.4488 15.37 12.2921 15.0745 12.0016 14.9835Z" fill="white"/>
        <path d="M16.4458 10.4347H15.8915V1.04347H16.4458C16.7519 1.04347 17.0002 0.809939 17.0002 0.521751C17.0002 0.233532 16.7519 0 16.4458 0C9.31838 0 7.83111 0 0.554694 0C0.24866 0 0.000366211 0.233532 0.000366211 0.52172C0.000366211 0.809939 0.24866 1.04344 0.554694 1.04344H1.10902V10.4346H0.554694C0.24866 10.4346 0.000366211 10.6682 0.000366211 10.9564C0.000366211 11.2446 0.24866 11.4781 0.554694 11.4781C2.42403 11.4781 14.7216 11.4781 16.4458 11.4781C16.7518 11.4781 17.0001 11.2446 17.0001 10.9564C17.0002 10.6682 16.7519 10.4347 16.4458 10.4347ZM13.6741 8.86945C13.6741 9.15767 13.4258 9.39117 13.1198 9.39117H3.88076C3.57472 9.39117 3.32643 9.15764 3.32643 8.86945V2.60866C3.32643 2.32044 3.57472 2.08694 3.88076 2.08694H13.1198C13.4258 2.08694 13.6741 2.32047 13.6741 2.60866V8.86945H13.6741Z" fill="white"/>
    </svg>
);

const IconCode = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0C5.87827 0 3.84344 0.842855 2.34315 2.34315C0.842855 3.84344 0 5.87827 0 8C0 10.1217 0.842855 12.1566 2.34315 13.6569C3.84344 15.1571 5.87827 16 8 16C10.1217 16 12.1566 15.1571 13.6569 13.6569C15.1571 12.1566 16 10.1217 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0ZM9.20052 4L10.1862 4.46094L9.87109 5.11458L13.9036 7.60417V8.52474L10.7513 10.4805L10.1784 9.60807L12.7956 8.0651L9.41016 6.08464L6.55729 12L5.5638 11.5469L5.88672 10.8763L2.09635 8.52474V7.61198L5.25651 5.64844L5.82161 6.52865L3.19531 8.0651L6.34766 9.91537L9.20052 4Z" fill="white"/>
    </svg>
);

const IconAstronaut = () => (
    <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.0631 11.895C11.2295 11.1936 10.1294 10.4779 10.1294 10.4779L8.71588 14.9498L8.52362 15.5551L7.88986 13.7606C9.34607 11.7312 7.77949 11.635 7.5089 11.6315H7.50534H7.50178H7.49822H7.49466C7.22407 11.635 5.65749 11.7312 7.1137 13.7606L6.47994 15.5551L6.28768 14.9498L4.8742 10.4779C4.8742 10.4779 3.77403 11.1936 1.94042 11.895C-0.0854499 12.6284 0.0391645 14.2911 0 17.41H7.4911H7.5089H15C14.9573 14.2911 15.0819 12.6284 13.0631 11.895Z" fill="white"/>
        <path d="M7.55504 3.68074L8.37749 2.85828C7.36634 2.51648 6.20564 2.74791 5.40099 3.55256C4.27234 4.68121 4.27234 6.51482 5.40099 7.64347C6.52964 8.77212 8.36325 8.77212 9.4919 7.64347C10.2966 6.83882 10.528 5.67813 10.1862 4.66697L9.36373 5.48942C9.39221 6.01636 9.20707 6.55399 8.80474 6.95631C8.05349 7.70756 6.8394 7.70756 6.08815 6.95631C5.3369 6.20507 5.3369 4.99097 6.08815 4.23972C6.49048 3.8374 7.0281 3.65225 7.55504 3.68074Z" fill="white"/>
        <path d="M10.8949 9.0464C12.4864 7.4549 12.7499 5.03738 11.6782 3.17173L10.8913 3.95858C11.5643 5.37562 11.315 7.12378 10.1437 8.29516C8.65185 9.78697 6.23789 9.78697 4.74608 8.29516C3.25427 6.80335 3.25427 4.38939 4.74608 2.89758C5.92102 1.7262 7.66562 1.47341 9.08266 2.14989L9.86951 1.36304C8.00742 0.29492 5.58634 0.554829 3.99484 2.14633C2.09002 4.05115 2.09002 7.13802 3.99484 9.0464C5.90322 10.9512 8.99009 10.9512 10.8949 9.0464Z" fill="white"/>
        <path d="M7.71188 4.63926C7.62643 4.61433 7.53742 4.60365 7.44485 4.60365C6.89299 4.60365 6.44794 5.0487 6.44794 5.60057C6.44794 6.15243 6.89299 6.59748 7.44485 6.59748C7.99671 6.59748 8.44177 6.15243 8.44177 5.60057C8.44177 5.508 8.42752 5.41899 8.40616 5.33354L11.1868 2.55286L11.6355 2.61339L13.0418 1.20702L11.9773 1.06461L11.8348 4.57764e-05L10.432 1.40641L10.4926 1.85502L7.71188 4.63926Z" fill="white"/>
    </svg>
);

const IconInfoTech = () => (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5651 6.26062H7.94556V8.34756H12.5651V6.26062Z" fill="white"/>
        <path d="M12.5651 3.13062H7.94556V5.21756H12.5651V3.13062Z" fill="white"/>
        <path d="M6.83687 3.13062H4.43472V8.34794H6.83687V3.13062Z" fill="white"/>
        <path d="M12.0016 14.9834L9.05441 14.0588V12.5219H7.94566V14.0589L4.99864 14.9834C4.70811 15.0744 4.55146 15.37 4.64822 15.6432C4.7452 15.9178 5.06087 16.0643 5.34947 15.9732L8.50012 14.9848L11.6508 15.9732C11.9395 16.0644 12.2551 15.9176 12.352 15.6432C12.4487 15.37 12.2921 15.0744 12.0016 14.9834Z" fill="white"/>
        <path d="M16.4458 10.4347H15.8915V1.04347H16.4458C16.7519 1.04347 17.0001 0.809939 17.0001 0.521751C17.0001 0.233532 16.7519 0 16.4458 0C9.31835 0 7.83108 0 0.554667 0C0.248633 0 0.000339508 0.233532 0.000339508 0.52172C0.000339508 0.809939 0.248633 1.04344 0.554667 1.04344H1.10899V10.4346H0.554667C0.248633 10.4346 0.000339508 10.6682 0.000339508 10.9564C0.000339508 11.2446 0.248633 11.4781 0.554667 11.4781C2.42401 11.4781 14.7216 11.4781 16.4458 11.4781C16.7518 11.4781 17.0001 11.2446 17.0001 10.9564C17.0001 10.6682 16.7519 10.4347 16.4458 10.4347ZM13.6741 8.86945C13.6741 9.15767 13.4258 9.39117 13.1198 9.39117H3.88073C3.5747 9.39117 3.3264 9.15764 3.3264 8.86945V2.60866C3.3264 2.32044 3.5747 2.08694 3.88073 2.08694H13.1198C13.4258 2.08694 13.6741 2.32047 13.6741 2.60866V8.86945H13.6741Z" fill="white"/>
    </svg>
);

const IconMegaphone = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.1529 13.1295C15.5407 13.2801 16 13.0542 16 12.706V0.470966C16 0.122739 15.5407 -0.103137 15.1529 0.0474472C14.5101 0.43332 13.9191 0.828605 13.3468 1.21165C11.3327 2.5575 9.56424 3.74053 6.67953 3.765H2.82353C1.26118 3.765 0 5.02615 0 6.58846C0 8.15078 1.26118 9.41193 2.82353 9.41193H6.58824C9.52753 9.41193 11.3129 10.6053 13.3478 11.9662C13.9191 12.3483 14.5111 12.7436 15.1529 13.1295ZM7.52941 16H6.78588C6.38118 16 6.02353 15.7459 5.90118 15.3694L3.83059 11.2942H7.52941C7.77903 11.2942 8.01842 11.3934 8.19492 11.5699C8.37143 11.7464 8.47059 11.9858 8.47059 12.2354V15.0588C8.47059 15.5765 8.04706 16 7.52941 16Z" fill="white"/>
    </svg>
);

const ICON_BY_NAME: Array<{ keywords: string[]; icon: React.ReactElement }> = [
    { keywords: ['business', 'management'], icon: <IconMegaphone /> },
    { keywords: ['ui', 'ux', 'design'], icon: <IconScreen /> },
    { keywords: ['it', 'development', 'tech', 'coding', 'programming'], icon: <IconInfoTech /> },
    { keywords: ['digital', 'marketing'], icon: <IconCode /> },
];

const INDEX_ICONS = [<IconScreen />, <IconCode />, <IconCode />, <IconAstronaut />];

function getCategoryIcon(name: string, index: number): React.ReactElement {
    const lower = name.toLowerCase();
    for (const entry of ICON_BY_NAME) {
        if (entry.keywords.some((kw) => lower.includes(kw))) {
            return entry.icon;
        }
    }
    return INDEX_ICONS[index % INDEX_ICONS.length];
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ categories, title }) => {
    const router = useIonRouter();
    const { t } = useTranslation();

    if (categories.length === 0) return null;

    return (
        <section className="categories-section">
            <div className="categories-header">
                <h2 className="categories-title">{title || t('browseCategories')}</h2>
            </div>
            <div className="categories-scroll">
                {categories.map((cat, i) => (
                    <IonCard
                        key={cat.name}
                        className="category-tile"
                        onClick={() => router.push('/explore', 'root', 'replace')}
                        style={{ '--background': cat.gradient, margin: 0 } as React.CSSProperties}
                    >
                        <span className="sr-only">{cat.name}</span>
                        <div className="category-tile-overlay-gradient" aria-hidden="true">
                            <div className="category-tile-icon-wrap">
                                <WhiteBar />
                                {getCategoryIcon(cat.name, i)}
                            </div>
                            <span className="category-tile-name">{cat.name}</span>
                        </div>
                    </IonCard>
                ))}
                <div
                    className="category-browse-all"
                    onClick={() => router.push('/explore', 'root', 'replace')}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && router.push('/explore', 'root', 'replace')}
                    role="button"
                    tabIndex={0}
                    aria-label={t('browseAll')}
                >
                    <div className="category-browse-all-circle">
                        <svg width="23" height="14" viewBox="0 0 23 14" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.5 0L14.09 1.41L18.67 6H0V8H18.67L14.09 12.59L15.5 14L23 7L15.5 0Z" />
                        </svg>
                    </div>
                    <span className="category-browse-all-text">{t('browseAll')}</span>
                </div>
            </div>
        </section>
    );
};

export default CategoriesGrid;

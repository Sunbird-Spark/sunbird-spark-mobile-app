import { IonSelect, IonSelectOption } from '@ionic/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  color?: string;
  interface?: 'action-sheet' | 'popover' | 'alert';
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  // Add more languages here:
  // { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  // { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  // { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  // { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  color = 'primary',
  interface: interfaceType = 'popover',
}) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: CustomEvent) => {
    const selectedLang = event.detail.value;
    i18n.changeLanguage(selectedLang);
  };

  return (
    <IonSelect
      value={i18n.language}
      onIonChange={handleLanguageChange}
      interface={interfaceType}
      placeholder="Select Language"
      color={color}
    >
      {languages.map((lang) => (
        <IonSelectOption key={lang.code} value={lang.code}>
          {lang.nativeName}
        </IonSelectOption>
      ))}
    </IonSelect>
  );
};

export default LanguageSwitcher;

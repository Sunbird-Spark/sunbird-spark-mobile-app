import React, { useState, useEffect, useCallback } from 'react';
import { IonPage, IonContent, IonSpinner, IonToast, useIonRouter } from '@ionic/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFormRead } from '../hooks/useFormRead';
import { userService } from '../services/UserService';
import { useBackButtonOverride } from '../hooks/useBackButton';
import { OnboardingFormData, OnboardingScreen, OnboardingField } from '../types/onboardingTypes';
import ProgressBar from '../components/onboarding/ProgressBar';
import OptionChip from '../components/onboarding/OptionChip';
import sunbirdLogo from '../assets/sunbird-logo-new.png';
import './OnboardingPage.css';

/**
 * Compute total steps based on the user's actual path:
 * screens already visited (history) + remaining screens traced forward
 * from the current screen using the user's selections.
 */
const computeTotalSteps = (
  data: OnboardingFormData,
  screenHistory: string[],
  currentScreenId: string,
  selections: Record<string, string>,
): number => {
  // Trace forward from the current screen to count remaining steps (including current)
  let remaining = 0;
  let current: string | undefined = currentScreenId;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    remaining++;
    const screen: OnboardingScreen | undefined = data.screens[current];
    if (!screen) break;
    const selectedFieldId = selections[current];
    const selectedField = selectedFieldId ? screen.fields.find((f) => f.id === selectedFieldId) : undefined;
    current = screen.nextScreenId
      ?? selectedField?.nextScreenId
      ?? screen.fields.find((f: OnboardingField) => f.nextScreenId)?.nextScreenId;
  }

  // Past screens (excluding current) + remaining (which includes current)
  const pastScreens = Math.max(0, screenHistory.length - 1);
  return pastScreens + remaining;
};

const OnboardingPage: React.FC = () => {
  const { userId, completeOnboarding } = useAuth();
  const router = useIonRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [screenHistory, setScreenHistory] = useState<string[]>([]);
  const [currentScreenId, setCurrentScreenId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { data: formApiData, isLoading, isError } = useFormRead({
    request: {
      type: 'user',
      subType: 'onboarding',
      action: 'workflow',
      component: 'app',
    },
  });

  const onboardingData: OnboardingFormData | undefined =
    (formApiData?.data as { form?: { data?: OnboardingFormData } })?.form?.data;

  useEffect(() => {
    if (onboardingData && !currentScreenId) {
      if (!onboardingData.isEnabled) {
        completeOnboarding();
        router.push('/home', 'root', 'replace');
        return;
      }
      setCurrentScreenId(onboardingData.initialScreenId);
      setScreenHistory([onboardingData.initialScreenId]);
    }
  }, [onboardingData, currentScreenId, router]);

  const handleSelect = (fieldId: string) => {
    if (!currentScreenId) return;

    // If user changed selection on a screen that's not the last in history,
    // truncate history and clear downstream selections/texts
    const currentIndex = screenHistory.indexOf(currentScreenId);
    if (currentIndex >= 0 && currentIndex < screenHistory.length - 1) {
      const downstreamScreens = screenHistory.slice(currentIndex + 1);
      setScreenHistory((prev) => prev.slice(0, currentIndex + 1));
      setSelections((prev) => {
        const cleaned = { ...prev, [currentScreenId]: fieldId };
        downstreamScreens.forEach((id) => delete cleaned[id]);
        return cleaned;
      });
      setOtherTexts((prev) => {
        const cleaned = { ...prev, [currentScreenId]: '' };
        downstreamScreens.forEach((id) => delete cleaned[id]);
        return cleaned;
      });
    } else {
      setSelections((prev) => ({ ...prev, [currentScreenId]: fieldId }));
      setOtherTexts((prev) => ({ ...prev, [currentScreenId]: '' }));
    }
  };

  const handleBack = () => {
    if (screenHistory.length <= 1) return;
    const newHistory = screenHistory.slice(0, -1);
    setScreenHistory(newHistory);
    setCurrentScreenId(newHistory[newHistory.length - 1] ?? null);
  };

  const handleNext = () => {
    if (!onboardingData || !currentScreenId) return;
    const screen = onboardingData.screens[currentScreenId];
    if (!screen) return;
    const selectedFieldId = selections[currentScreenId];
    const selectedField = screen.fields.find((f) => f.id === selectedFieldId);
    const nextId = screen.nextScreenId ?? selectedField?.nextScreenId;
    if (nextId) {
      if (onboardingData.screens[nextId]) {
        setCurrentScreenId(nextId);
        setScreenHistory((prev) => [...prev, nextId]);
      } else {
        console.error(`Invalid nextScreenId: "${nextId}" does not exist in onboarding screens`);
      }
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !userId) return;
    setIsSubmitting(true);

    const formattedData: Record<string, { values: string[] }> = {};
    Object.entries(selections).forEach(([screenId, fieldId]) => {
      const screen = onboardingData?.screens[screenId];
      const field = screen?.fields.find((f) => f.id === fieldId);
      const value = field?.requiresTextInput && otherTexts[screenId] ? otherTexts[screenId] : fieldId;
      formattedData[screenId] = { values: [value] };
    });

    try {
      await userService.updateUser({
        userId,
        framework: { onboardingDetails: { isSkipped: false, data: formattedData } },
      });
    } catch (err) {
      console.error('Failed to save onboarding', err);
      setToastMessage(t('onboarding.somethingWentWrong'));
    } finally {
      // Always move forward — don't block the user if the API call fails.
      completeOnboarding();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      router.push('/home', 'root', 'replace');
      setIsSubmitting(false);
    }
  };

  const handleSkip = useCallback(async () => {
    if (isSubmitting || userId === undefined) return;
    if (userId === null) { router.push('/', 'root', 'replace'); return; }
    setIsSubmitting(true);
    try {
      await userService.updateUser({
        userId,
        framework: { onboardingDetails: { isSkipped: true, data: {} } },
      });
    } catch (err) {
      console.error('Failed to skip onboarding', err);
      setToastMessage(t('onboarding.somethingWentWrong'));
    } finally {
      completeOnboarding();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      router.push('/home', 'root', 'replace');
      setIsSubmitting(false);
    }
  }, [isSubmitting, userId, router, completeOnboarding, queryClient, t]);

  // Android hardware back button: treat as skip onboarding
  useBackButtonOverride('/onboarding', useCallback(() => {
    handleSkip();
    return true;
  }, [handleSkip]));

  // Loading state
  if (isLoading || (onboardingData && !currentScreenId)) {
    return (
      <IonPage className="onboarding-page">
        <IonContent fullscreen className="onboarding-content">
          <div className="onboarding-loader">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (isError || !onboardingData || !currentScreenId) {
    return (
      <IonPage className="onboarding-page">
        <IonContent fullscreen className="onboarding-content">
          <div className="onboarding-loader">
            <p className="onboarding-error-text">
              {t('onboarding.failedToLoad')}{' '}
              <button type="button" onClick={handleSkip} className="onboarding-error-link">
                {t('onboarding.skip')}
              </button>
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentScreen = onboardingData.screens[currentScreenId];
  if (!currentScreen) {
    return (
      <IonPage className="onboarding-page">
        <IonContent fullscreen className="onboarding-content">
          <div className="onboarding-loader">
            <p className="onboarding-error-text">
              {t('onboarding.somethingWentWrong')}{' '}
              <button type="button" onClick={handleSkip} className="onboarding-error-link">
                {t('onboarding.goToHome')}
              </button>
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const totalSteps = computeTotalSteps(onboardingData, screenHistory, currentScreenId, selections);
  const currentStep = screenHistory.length;
  const isFirstScreen = currentScreenId === onboardingData.initialScreenId;
  const selectedFieldId = selections[currentScreenId] ?? '';
  const selectedField = currentScreen.fields.find((f) => f.id === selectedFieldId);
  const hasScreenNext = !!currentScreen.nextScreenId;
  const anyFieldHasNext = currentScreen.fields.some((f) => !!f.nextScreenId);
  const selectedFieldHasNext = !!selectedField?.nextScreenId;
  const showNextButton = hasScreenNext || (anyFieldHasNext && (!selectedFieldId || selectedFieldHasNext));
  const showOtherInput = !!selectedField?.requiresTextInput;
  const sortedFields = [...currentScreen.fields].sort((a, b) => a.index - b.index);
  const otherText = otherTexts[currentScreenId] ?? '';
  const isSubmitDisabled = isSubmitting || !userId || !selectedFieldId || (showOtherInput && !otherText.trim());

  return (
    <IonPage className="onboarding-page">
      <IonContent fullscreen className="onboarding-content">
        <div className="onboarding-container">
          {/* Brand */}
          <img src={sunbirdLogo} alt="Sunbird" className="onboarding-brand" />

          {/* Subtitle */}
          <h1 className="onboarding-subtitle">
            {t('onboarding.subtitle')}
          </h1>

          {/* Progress with integrated back button */}
          <ProgressBar
            totalSteps={totalSteps}
            currentStep={currentStep}
            onBack={handleBack}
            showBack={!isFirstScreen}
            isSubmitting={isSubmitting}
            backLabel={t('onboarding.goBack')}
          />

          {/* Screen question */}
          <h2 className="onboarding-question">{currentScreen.title}</h2>

          {/* Option chips — always visible so users can switch selections */}
          <div className="onboarding-grid">
            {sortedFields.map((field) => (
              <OptionChip
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onClick={() => handleSelect(field.id)}
              />
            ))}
          </div>

          {/* Text input — shown below chips when "Other" is selected */}
          {showOtherInput && (
            <div className="onboarding-text-input-wrapper">
              <input
                type="text"
                className="onboarding-text-input"
                aria-label={t('onboarding.enterPreference')}
                placeholder={t('onboarding.enterPreference')}
                value={otherText}
                onChange={(e) =>
                  setOtherTexts((prev) => ({ ...prev, [currentScreenId]: e.target.value }))
                }
              />
            </div>
          )}

          {/* Spacer */}
          <div className="onboarding-spacer" />

          {/* CTA Button */}
          {showNextButton ? (
            <button
              type="button"
              className="onboarding-cta"
              disabled={!selectedFieldId}
              onClick={handleNext}
            >
              {t('onboarding.saveAndProceed')}
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-cta"
              disabled={isSubmitDisabled}
              onClick={handleSubmit}
            >
              {isSubmitting ? <IonSpinner name="crescent" color="light" /> : t('onboarding.submit')}
            </button>
          )}

          {/* Skip */}
          <button
            type="button"
            className="onboarding-skip"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            {t('onboarding.skipOnboarding')}
          </button>
        </div>
      </IonContent>

      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage('')}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />
    </IonPage>
  );
};

export default OnboardingPage;

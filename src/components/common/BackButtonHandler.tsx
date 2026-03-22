import { useHardwareBackButton } from '../../hooks/useBackButton';

/**
 * Invisible component that registers the Android hardware back button handler.
 * Must be placed inside <IonRouterOutlet> so that useIonRouter() is available.
 */
const HardwareBackButtonHandler: React.FC = () => {
  useHardwareBackButton();
  return null;
};

export default HardwareBackButtonHandler;

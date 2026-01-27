import React from 'react';
import { IonButton, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/react';
import { bookOutline, qrCodeOutline, downloadOutline, personOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const QuickActions: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const actions = [
    { icon: bookOutline, label: 'courses', path: '/courses', color: 'primary' },
    { icon: qrCodeOutline, label: 'scan', path: '/scan', color: 'secondary' },
    { icon: downloadOutline, label: 'downloads', path: '/downloads', color: 'success' },
    { icon: personOutline, label: 'profile', path: '/profile', color: 'warning' },
  ];

  return (
    <IonGrid>
      <IonRow>
        {actions.map((action) => (
          <IonCol size="3" key={action.path}>
            <div style={{ textAlign: 'center' }}>
              <IonButton
                fill="clear"
                onClick={() => history.push(action.path)}
                style={{ flexDirection: 'column', height: 'auto' }}
              >
                <IonIcon icon={action.icon} style={{ fontSize: '2rem' }} color={action.color} />
              </IonButton>
              <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>{t(action.label)}</p>
            </div>
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  );
};

export default QuickActions;

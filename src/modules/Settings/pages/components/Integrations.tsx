import {
   INTEGRATION_STATES,
   INTEGRATIONS,
   type IntegrationState,
} from '@modules/Settings/constants';
import { Badge, Card } from '@shared/components';
import type { SettingsState } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface IntegrationsProps {
   data: SettingsState;
}

// Where the platform's data comes from and goes to, and how today.
const Integrations = ({ data }: IntegrationsProps) => {
   const { t } = useTranslation('settings');

   return (
      <>
         <div className='gap-section stagger grid md:grid-cols-2 2xl:grid-cols-3'>
            {INTEGRATIONS.map((integration) => {
               const state: IntegrationState =
                  integration.state === 'site'
                     ? data.site
                        ? 'differs'
                        : 'synced'
                     : integration.state;
               return (
                  <Card key={integration.id} className='p-5'>
                     <div className='flex items-start justify-between gap-3'>
                        <h2 className='text-title font-bold'>
                           {t(integration.title)}
                        </h2>
                        <Badge tone={INTEGRATION_STATES[state].tone}>
                           {t(INTEGRATION_STATES[state].label)}
                        </Badge>
                     </div>
                     <p className='text-ink-soft mt-2'>{t(integration.text)}</p>
                  </Card>
               );
            })}
         </div>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Подключения к банку, налоговой и etender появятся вместе с сервером платформы; до этого данные загружаются файлами.',
            )}
         </p>
      </>
   );
};

export default Integrations;

import { Card, NoData, PageBody, PageHeader } from '@shared/components';
import { useTranslation } from 'react-i18next';
import type { UpcomingSection } from './constants';

interface ComingSoonProps {
   section: UpcomingSection;
}

// Stands in for a section until its screens are built.
const ComingSoon = ({ section }: ComingSoonProps) => {
   const { t } = useTranslation('layout');

   return (
      <>
         <PageHeader
            section={t(section.group)}
            title={t(section.title)}
            meta={t(section.description)}
         />
         <PageBody className='flex flex-col'>
            <Card className='grid flex-1 place-items-center'>
               <NoData>
                  {t('Экран этого раздела ещё не перенесён из макета')}
               </NoData>
            </Card>
         </PageBody>
      </>
   );
};

export default ComingSoon;

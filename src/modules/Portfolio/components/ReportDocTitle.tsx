import { reportDocName, reportTemplate } from '@modules/Portfolio/helpers';
import { useTranslation } from 'react-i18next';

interface ReportDocTitleProps {
   doc: string;
}

// A report document's name, with the template the company fills in when the
// fund keeps one (Настройки → Отчётность).
const ReportDocTitle = ({ doc }: ReportDocTitleProps) => {
   const { t } = useTranslation('portfolio');
   const template = reportTemplate(doc);

   return (
      <>
         {reportDocName(t, doc)}
         {template && (
            <a
               className='text-accent ml-1.5 text-xs font-medium hover:underline'
               data-hint={t('Открыть шаблон этого документа')}
               href={template.url}
               rel='noreferrer'
               target='_blank'
            >
               {t('шаблон')}
            </a>
         )}
      </>
   );
};

export default ReportDocTitle;

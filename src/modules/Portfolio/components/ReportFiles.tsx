import { useAttachments } from '@shared/hooks';
import { useTranslation } from 'react-i18next';

interface ReportFilesProps {
   companyId: string;
   quarter: string;
   doc: string;
}

// The files a company sent for a document of the quarter from the startup
// cabinet (attachments, section `report`, item `<quarter>:<doc>`).
const ReportFiles = ({ companyId, quarter, doc }: ReportFilesProps) => {
   const { t } = useTranslation('portfolio');
   const files = useAttachments({
      companyId,
      section: 'report',
      itemId: `${quarter}:${doc}`,
   });
   if (!files.length) return null;
   return (
      <ul className='mt-1 flex max-w-40 flex-col gap-0.5'>
         {files.map((file) => (
            <li key={file.id} className='truncate'>
               <a
                  className='text-accent text-xs hover:underline'
                  data-hint={t('Открыть файл в новой вкладке')}
                  href={file.url}
                  rel='noreferrer'
                  target='_blank'
               >
                  {file.title}
               </a>
            </li>
         ))}
      </ul>
   );
};

export default ReportFiles;

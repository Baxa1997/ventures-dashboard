import type { FinanceData } from '@modules/Finance/hooks';
import finance from '@modules/Finance/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AttachDialogProps {
   data: FinanceData;
   open: boolean;
   onClose: () => void;
}

/* Attaches a file to one of the month's reports. There is no file storage
   yet: the name is recorded, the file itself stays on the computer. */
const AttachDialog = ({ data, open, onClose }: AttachDialogProps) => {
   const { t } = useTranslation('finance');
   const [reportId, setReportId] = useState('');
   const [file, setFile] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setReportId('');
      setFile('');
      setError('');
      onClose();
   };

   return (
      <Modal open={open} title={t('Прикрепить документ')} onClose={close}>
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!reportId || !file) {
                  setError(t('Выберите отчёт и файл'));
                  return;
               }
               await finance.attachReport(reportId, file);
               close();
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  <Field label={t('Отчёт')}>
                     <select
                        className='field-input'
                        value={reportId}
                        onChange={(event) => {
                           setReportId(event.target.value);
                           setError('');
                        }}
                     >
                        <option value=''>{t('Выберите отчёт')}</option>
                        {data.reports.map((report) => (
                           <option key={report.id} value={report.id}>
                              {report.title}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field error={error} label={t('Файл')}>
                     <input
                        key={String(open)}
                        className='field-input pt-2'
                        type='file'
                        onChange={(event) => {
                           setFile(event.target.files?.[0]?.name ?? '');
                           setError('');
                        }}
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t('Сохраняется имя файла: хранилища файлов пока нет')}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Прикрепить')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default AttachDialog;

import portfolio from '@modules/Portfolio/services';
import {
   Attachments,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   ItemActions,
   NoData,
} from '@shared/components';
import { formatDate, personName } from '@shared/helpers';
import { useAttachments, useRequest } from '@shared/hooks';
import type {
   CompanyDataRequest,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { FileText } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DataRequestDialog from './DataRequestDialog';

interface RowProps {
   company: PortfolioCompany;
   request: CompanyDataRequest;
   onEdit: (request: CompanyDataRequest) => void;
   onAskMore: (title: string) => void;
}

/* One request for data: what was asked, by when, and what the company
   answered in the cabinet with its files. The fund accepts the answer, asks
   for more, or records an answer that came another way. */
const DataRequestRow = ({ company, request, onEdit, onAskMore }: RowProps) => {
   const { t } = useTranslation('portfolio');
   const [answering, setAnswering] = useState(false);
   const [answer, setAnswer] = useState('');
   const [removing, setRemoving] = useState(false);
   const accepting = useRequest({ success: t('Ответ принят') });
   const recording = useRequest({ success: t('Запрос закрыт') });
   const fund = { companyId: company.id, section: 'data_request', itemId: request.id };
   const sent = useAttachments({ companyId: company.id, section: 'data_answer', itemId: request.id });
   const waiting = request.status === 'waiting';
   const answered = request.status === 'answered';

   const record = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!answer.trim()) return;
      if (await recording.run(() => portfolio.recordDataAnswer(request.id, answer.trim())))
         setAnswering(false);
   };

   return (
      <li className='py-3.5'>
         <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0'>
               <div className='font-semibold'>{request.title}</div>
               <div className='text-ink-soft mt-0.5 text-xs'>
                  {t('Запросил {{name}} · {{date}}', {
                     name: personName(request.byId) || '—',
                     date: formatDate(request.sentAt),
                  })}
                  {' · '}
                  {waiting
                     ? t('ответ до {{date}}', { date: formatDate(request.dueDate) })
                     : t('ответ {{date}}', { date: formatDate(request.closedAt) })}
               </div>
               {request.text && <p className='text-meta mt-1 whitespace-pre-line'>{request.text}</p>}
            </div>
            {waiting ? (
               <Badge tone='warning'>{t('Ждём ответа')}</Badge>
            ) : answered ? (
               <Badge tone='accent'>{t('Ответ получен — проверьте')}</Badge>
            ) : (
               <Badge tone='success'>{t('Принят')}</Badge>
            )}
         </div>
         {request.answer && (
            <p className='text-meta mt-1.5 whitespace-pre-line'>
               <span className='text-ink-soft'>
                  {request.answeredBy
                     ? t('Ответ из кабинета ({{email}})', { email: request.answeredBy })
                     : t('Ответ')}
                  :{' '}
               </span>
               {request.answer}
            </p>
         )}
         {sent.length > 0 && (
            <ul className='mt-1.5 flex flex-col gap-1'>
               {sent.map((file) => (
                  <li key={file.id}>
                     <a
                        className='text-accent text-meta inline-flex items-center gap-2 hover:underline'
                        href={file.url}
                        rel='noreferrer'
                        target='_blank'
                     >
                        <FileText aria-hidden className='size-3.5 shrink-0' />
                        {file.title}
                     </a>
                  </li>
               ))}
            </ul>
         )}
         <div className='text-ink-soft mt-2.5 text-xs font-medium'>{t('Файлы для компании')}</div>
         <Attachments className='mt-1.5' editable={waiting} place={fund} />
         {answered && (
            <div className='mt-2.5 flex flex-wrap gap-2.5'>
               <Button
                  className='h-8 px-3 text-xs'
                  loading={accepting.pending}
                  onClick={() => accepting.run(() => portfolio.acceptDataAnswer(request.id))}
               >
                  {t('Принять')}
               </Button>
               <Button className='h-8 px-3 text-xs' variant='ghost' onClick={() => onAskMore(request.title)}>
                  {t('Запросить ещё')}
               </Button>
            </div>
         )}
         {!answering && (
            <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
               {waiting && (
                  <button type='button' className='link' onClick={() => setAnswering(true)}>
                     {t('Ответ получен')}
                  </button>
               )}
               <ItemActions
                  name={request.title}
                  onDelete={() => setRemoving(true)}
                  onEdit={() => onEdit(request)}
               />
            </div>
         )}
         {answering && (
            <form className='mt-3' onSubmit={record}>
               <textarea
                  aria-label={t('Ответ компании')}
                  autoFocus
                  className='field-input text-meta'
                  maxLength={4000}
                  placeholder={t('Что ответила компания, если ответ пришёл не через кабинет')}
                  rows={2}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
               />
               <div className='mt-2.5 flex gap-2.5'>
                  <Button className='h-9' disabled={!answer.trim()} loading={recording.pending} type='submit'>
                     {t('Закрыть запрос')}
                  </Button>
                  <Button className='h-9' disabled={recording.pending} variant='text' onClick={() => setAnswering(false)}>
                     {t('Отмена')}
                  </Button>
               </div>
            </form>
         )}
         <ConfirmDialog
            open={removing}
            subtitle={request.title}
            title={t('Удалить запрос данных?')}
            onClose={() => setRemoving(false)}
            onConfirm={() => portfolio.removeDataRequest(request.id, company.id)}
         >
            <p>{t('Запрос уйдёт из кабинета компании вместе с файлами для неё и файлами её ответа.')}</p>
         </ConfirmDialog>
      </li>
   );
};

interface DataRequestsProps {
   company: PortfolioCompany;
   requests: CompanyDataRequest[];
   onNew: () => void;
}

// The company card's «Запросы данных»: what the fund asked the company for.
const DataRequests = ({ company, requests, onNew }: DataRequestsProps) => {
   const { t } = useTranslation('portfolio');
   const [editing, setEditing] = useState<CompanyDataRequest | null>(null);
   const [asking, setAsking] = useState<string | null>(null);

   return (
      <Card
         action={
            <button type='button' className='link' onClick={onNew}>
               {t('Новый запрос')}
            </button>
         }
         className='flex-1'
         hint={String(requests.length)}
         title={t('Запросы данных у компании')}
      >
         {requests.length ? (
            <ul className='divide-line divide-y px-5 py-1'>
               {requests.map((request) => (
                  <DataRequestRow
                     key={request.id}
                     company={company}
                     request={request}
                     onAskMore={setAsking}
                     onEdit={setEditing}
                  />
               ))}
            </ul>
         ) : (
            <NoData>{t('Запросов данных пока нет. «Запросить данные» отправит запрос в кабинет компании.')}</NoData>
         )}
         <DataRequestDialog
            company={company}
            open={!!editing || asking !== null}
            request={editing}
            title={asking ?? ''}
            onClose={() => {
               setEditing(null);
               setAsking(null);
            }}
         />
      </Card>
   );
};

export default DataRequests;

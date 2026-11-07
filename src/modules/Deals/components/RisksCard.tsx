import { Card, ConfirmDialog, InlineField, NoData } from '@shared/components';
import { newId } from '@shared/helpers';
import type { Deal, Risk } from '@shared/types/deals.types';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import deals from '../services';
import RiskList from './RiskList';

interface RisksCardProps {
   deal: Deal;
   editable: boolean;
   title: string;
   link?: ReactNode; // where the risks are looked at further
}

/* The deal's open risks, from DD: each with how grave it is and who owns it.
   The owner adds a risk by typing its name, changes each part where it
   stands, and deletes it once it is dealt with. A risk given a severity also goes into the memorandum's
   matrix. */
const RisksCard = ({ deal, editable, title, link }: RisksCardProps) => {
   const { t } = useTranslation('deals');
   const [removing, setRemoving] = useState<Risk | null>(null);
   const [adding, setAdding] = useState(false);
   const risks = deal.risks ?? [];

   return (
      <Card
         action={
            (editable || link) && (
               <span className='flex gap-4'>
                  {editable && (
                     <button
                        type='button'
                        className='link'
                        data-hint={t('Добавить риск по этой сделке')}
                        onClick={() => setAdding(true)}
                     >
                        {t('Добавить риск')}
                     </button>
                  )}
                  {link}
               </span>
            )
         }
         hint={t('{{count}} открытый', { count: risks.length })}
         title={title}
      >
         {risks.length ? (
            <RiskList
               risks={risks}
               onRemove={editable ? setRemoving : undefined}
               onSave={
                  editable ? (risk) => deals.saveRisk(deal.id, risk) : undefined
               }
            />
         ) : (
            !adding && <NoData>{t('Открытых рисков нет')}</NoData>
         )}
         {editable && adding && (
            <div className='border-line text-meta border-t px-5 py-3'>
               <InlineField
                  autoFocus
                  className='font-medium'
                  label={t('Новый риск')}
                  maxLength={160}
                  placeholder={t('Назовите риск и нажмите Enter')}
                  value=''
                  onDone={() => setAdding(false)}
                  onSave={(name) =>
                     deals.saveRisk(deal.id, {
                        id: newId(),
                        level: 'medium',
                        title: name,
                        note: '',
                        ownerId: '',
                     })
                  }
               />
            </div>
         )}
         <ConfirmDialog
            open={removing !== null}
            subtitle={deal.company}
            title={t('Удалить риск «{{name}}»?', {
               name: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && deals.removeRisk(deal.id, removing.id)}
         >
            <p>
               {t('Риск уйдёт из карточки и из матрицы рисков меморандума.')}
            </p>
         </ConfirmDialog>
      </Card>
   );
};

export default RisksCard;

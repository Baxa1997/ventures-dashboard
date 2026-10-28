import {
   checkMandate,
   mandateTone,
   triageDue,
   triageState,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { Badge, Card } from '@shared/components';
import { TEAM } from '@shared/constants';
import { formatNumericDate, shortName } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MandateCardProps {
   deal: Deal;
}

const MARKS = {
   ok: { icon: Check, className: 'text-success-ink' },
   attention: { icon: TriangleAlert, className: 'text-warning-ink' },
   fail: { icon: X, className: 'text-danger' },
};

/* A new application, before it is taken into screening: the automatic check
   against the published mandate, by when it has to be decided, and who will
   own it — «Взять в скрининг» gives it to them. */
const MandateCard = ({ deal }: MandateCardProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const check = checkMandate(t, deal, language);
   const owning = useAction(
      (ownerId: string) => deals.setOwner(deal.id, ownerId),
      { success: t('Владелец назначен') },
   );
   const state = triageState(deal);

   return (
      <Card
         title={t('Проверка мандата')}
         action={
            <Badge tone={mandateTone(check.verdict.state)}>
               {check.verdict.label}
            </Badge>
         }
      >
         <ul className='text-meta grid gap-2 px-4.5 pt-3.5'>
            {check.rows.map((row) => {
               const { icon: Icon, className } = MARKS[row.state];
               return (
                  <li
                     key={row.key}
                     className='grid grid-cols-[1.25rem_6rem_minmax(0,1fr)] items-start gap-x-2'
                  >
                     <Icon
                        aria-hidden
                        className={clsx('mt-0.5 size-4', className)}
                        strokeWidth={2.5}
                     />
                     <span className='text-ink-soft'>{row.label}</span>
                     <span>{row.value}</span>
                  </li>
               );
            })}
         </ul>
         <p className='text-ink-soft px-4.5 pt-2.5 text-xs'>
            {t(
               'Правила проверки не оценивают качество проекта — только соответствие опубликованному мандату.',
            )}
         </p>
         <div className='text-meta grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2.5 px-4.5 py-3.5'>
            <span className='text-ink-soft'>{t('Решить до')}</span>
            <span
               className={clsx(
                  state === 'overdue' && 'text-danger font-semibold',
                  state === 'today' && 'text-warning-ink font-semibold',
               )}
            >
               {state === 'waiting'
                  ? t('ждём заявителя')
                  : formatNumericDate(triageDue(deal))}
            </span>
            <label className='text-ink-soft' htmlFor={`owner-${deal.id}`}>
               {t('Владелец')}
            </label>
            <select
               className='field-input w-auto'
               disabled={owning.pending}
               id={`owner-${deal.id}`}
               value={deal.ownerId || deal.proposedOwnerId}
               onChange={(event) => owning.run(event.target.value)}
            >
               <option value=''>{t('Не назначен')}</option>
               {TEAM.map(({ id, name }) => (
                  <option key={id} value={id}>
                     {shortName(name)}
                  </option>
               ))}
            </select>
         </div>
      </Card>
   );
};

export default MandateCard;

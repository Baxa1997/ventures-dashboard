import {
   RECOMMENDATION_NAMES,
   RECOMMENDATIONS,
   SEVERE_FROM,
} from '@modules/Deals/constants';
import { formatStamp, isOpen, personName } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Avatar,
   Card,
   CheckList,
   FactList,
   NoData,
   Spinner,
   STACK,
} from '@shared/components';
import { employeeOf } from '@shared/constants';
import { useAction } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MemorandumProps {
   deal: Deal;
}

// Sections of the template whose text the sample has.
const WRITTEN = [0, 1, 8];

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

// The investment memorandum: the fund's template on the left, the document
// in the middle, and what must be closed before the committee on the right.
const Memorandum = ({ deal }: MemorandumProps) => {
   const { t } = useTranslation('deals');
   const [active, setActive] = useState(1);
   const recommending = useAction(
      (value: (typeof RECOMMENDATIONS)[number]) =>
         deals.setRecommendation(deal.id, value),
      { success: t('Рекомендация сохранена') },
   );
   // the recommendation being saved, for its spinner
   const [choosing, setChoosing] = useState('');
   const { memo } = deal;

   if (!memo)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Меморандум по этой сделке ещё не начат')}</NoData>
         </Card>
      );

   const locked = !isOpen(deal) || !!memo.approvedAt;
   const commenter = memo.comment ? employeeOf(memo.comment.byId) : undefined;
   const risks = (deal.risks ?? []).filter(({ severity }) => severity);

   const goTo = (n: number) => {
      setActive(n);
      document
         .getElementById(`memo-${n}`)
         ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
   };

   return (
      <div className='gap-section grid flex-1 lg:grid-cols-[14.5rem_minmax(0,1fr)] xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]'>
         <Card className='print-hidden p-3'>
            <h2 className='text-ink-soft px-2 pt-1 pb-2 text-xs'>
               {t('Разделы по шаблону фонда')}
            </h2>
            <ol>
               {memo.sections.map(({ n, title, done }) => {
                  const row = (
                     <>
                        <span
                           aria-hidden
                           className={clsx(
                              'mt-px grid size-4 shrink-0 place-items-center rounded-[4px] border',
                              done
                                 ? 'border-success-ink bg-success-ink text-white'
                                 : 'border-warning-ink bg-warning-tint text-transparent',
                           )}
                        >
                           <Check className='size-3' strokeWidth={3.5} />
                        </span>
                        <span className='text-ink-faint w-4 text-xs leading-[18px] tabular-nums'>
                           {n}
                        </span>
                        <span
                           className={clsx(
                              'min-w-0 flex-1',
                              !done && 'text-warning-ink',
                              n === active && 'text-accent',
                           )}
                        >
                           {title}
                           <span className='sr-only'>
                              {' — '}
                              {done ? t('Выполнено') : t('Не выполнено')}
                           </span>
                        </span>
                     </>
                  );
                  const className = clsx(
                     'text-meta flex w-full gap-2.5 rounded-md px-2 py-1.5 text-left',
                     n === active && 'bg-accent-tint',
                  );
                  return (
                     <li key={n}>
                        {WRITTEN.includes(n) ? (
                           <button
                              type='button'
                              aria-current={n === active ? 'true' : undefined}
                              className={clsx(className, 'hover:bg-ground')}
                              onClick={() => goTo(n)}
                           >
                              {row}
                           </button>
                        ) : (
                           <div className={className}>{row}</div>
                        )}
                     </li>
                  );
               })}
            </ol>
         </Card>

         <Card className='px-6 py-6 sm:px-8'>
            <section id='memo-0' className='scroll-mt-4'>
               <h2 className='text-lg font-bold'>0. Snapshot</h2>
               <p className='mt-2 leading-[1.6]'>{memo.snapshot}</p>
            </section>

            <section id='memo-1' className='mt-7 scroll-mt-4'>
               <h2 className='text-lg font-bold'>1. {t('Рекомендация')}</h2>
               <div
                  role='radiogroup'
                  aria-label={t('Рекомендация')}
                  className='mt-3 flex flex-wrap gap-2'
               >
                  {RECOMMENDATIONS.map((value) => {
                     const chosen = memo.recommendation === value;
                     return (
                        <button
                           key={value}
                           type='button'
                           role='radio'
                           aria-checked={chosen}
                           aria-busy={
                              (recommending.pending && choosing === value) ||
                              undefined
                           }
                           className={clsx(
                              'text-meta inline-flex h-9 items-center gap-1.5 rounded-lg border px-4 font-medium transition-colors disabled:cursor-not-allowed',
                              chosen
                                 ? 'border-accent bg-accent text-white'
                                 : 'border-line-strong text-ink-soft enabled:hover:border-accent bg-white',
                           )}
                           disabled={locked || recommending.pending}
                           onClick={async () => {
                              setChoosing(value);
                              await recommending.run(value);
                              setChoosing('');
                           }}
                        >
                           {recommending.pending && choosing === value && (
                              <Spinner className='size-3.5' />
                           )}
                           {RECOMMENDATION_NAMES[value]}
                        </button>
                     );
                  })}
               </div>
               <FactList
                  divided
                  className='text-meta mt-3'
                  labelWidth='38%'
                  rows={memo.summary.map(([label, value]) => ({
                     label,
                     value,
                  }))}
               />
               {memo.comment && (
                  <div className='bg-accent-tint mt-2 flex gap-3 rounded-lg px-4 py-3.5'>
                     {commenter && <Avatar name={commenter.name} />}
                     <div className='min-w-0'>
                        <div className='text-ink-soft text-xs'>
                           {personName(memo.comment.byId)} ·{' '}
                           {formatStamp(memo.comment.at)}
                        </div>
                        <p className='text-meta mt-1 font-medium'>
                           {memo.comment.text}
                        </p>
                     </div>
                  </div>
               )}
            </section>

            <section id='memo-8' className='mt-7 scroll-mt-4'>
               <h2 className='text-lg font-bold'>8. {t('Риски и меры')}</h2>
               <p className='text-ink-soft mt-2 text-xs'>
                  {t(
                     'Шаблон требует минимум 5 рисков. Риски подтягиваются из DD-трекера, правка здесь меняет запись в трекере.',
                  )}
               </p>
               <div className='border-line mt-3 overflow-x-auto rounded-lg border'>
                  <table className='text-meta w-full min-w-md border-collapse text-left'>
                     <thead>
                        <tr className='bg-ground border-line border-b'>
                           <th className={`${TH} pl-4`}>{t('Риск')}</th>
                           <th className={TH}>{t('Тяжесть')}</th>
                           <th className={`${TH} pr-4`}>{t('Мера')}</th>
                        </tr>
                     </thead>
                     <tbody className='divide-line divide-y'>
                        {risks.map((risk) => (
                           <tr key={risk.id} className='align-top'>
                              <td className='w-[38%] py-3 pr-3 pl-4 font-medium'>
                                 {risk.short ?? risk.title}
                              </td>
                              <td
                                 className={clsx(
                                    'px-3 py-3 font-medium whitespace-nowrap',
                                    (risk.severity ?? 0) >= SEVERE_FROM &&
                                       'text-danger',
                                 )}
                              >
                                 {t('{{value}} из 5', { value: risk.severity })}
                              </td>
                              <td className='text-ink-soft py-3 pr-4 pl-3'>
                                 {risk.measure}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </section>
         </Card>

         <div
            className={clsx(STACK, 'print-hidden lg:col-span-2 xl:col-span-1')}
         >
            <Card hint={memo.checklistHint} title={t('Чек-лист перед ИК')}>
               <div className='p-5'>
                  <CheckList className='text-meta' items={memo.checklist} />
                  <p className='text-ink-soft mt-4 text-xs'>
                     {t(
                        'Пока чек-лист не закрыт, рассылка материалов на ИК недоступна.',
                     )}
                  </p>
               </div>
            </Card>
            <Card title={t('Версии')}>
               <ul className='divide-line divide-y px-5 py-1'>
                  {memo.versions.map(({ v, at, note }) => (
                     <li key={v} className='flex gap-4 py-3'>
                        <span
                           className={clsx(
                              'text-meta w-5 font-medium',
                              v === memo.version
                                 ? 'text-accent'
                                 : 'text-ink-soft',
                           )}
                        >
                           v{v}
                        </span>
                        <div className='min-w-0'>
                           <div className='text-meta'>{formatStamp(at)}</div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {note}
                           </div>
                        </div>
                     </li>
                  ))}
               </ul>
            </Card>
         </div>
      </div>
   );
};

export default Memorandum;

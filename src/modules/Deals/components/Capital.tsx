import {
   OTHER_SECTORS_COLOR,
   SECTOR_COLORS,
} from '@modules/Work/pages/Overview/constants';
import {
   Button,
   ChartTooltip,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
   useChartHover,
} from '@shared/components';
import { useRequest } from '@shared/hooks';
import type { Deal, DealOwner } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Plus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import deals from '../services';

const ownerName = ({ name, role }: DealOwner) =>
   role ? `${name} (${role})` : name;

// The participants' shares as one bar with its legend: each share keeps its
// colour by its place, and pointing at it names it in a note.
export const CapitalBar = ({ owners }: { owners: DealOwner[] }) => {
   const { box, hover, track, focus, leave } = useChartHover<number>();
   const colorOf = (index: number) =>
      SECTOR_COLORS[index] ?? OTHER_SECTORS_COLOR;
   const total = owners.reduce((sum, { share }) => sum + share, 0);

   return (
      <div ref={box} className='relative' onPointerLeave={leave}>
         <div className='flex h-3 gap-0.5'>
            {owners.map((owner, index) => (
               <span
                  key={`${owner.name}-${index}`}
                  aria-label={`${ownerName(owner)}: ${owner.share}%`}
                  className={clsx(
                     'min-w-1 transition-opacity first:rounded-l last:rounded-r',
                     hover !== null && hover.item !== index && 'opacity-45',
                  )}
                  role='img'
                  style={{
                     background: colorOf(index),
                     flexBasis: `${total ? (owner.share / total) * 100 : 0}%`,
                  }}
                  tabIndex={0}
                  onBlur={leave}
                  onFocus={focus(index)}
                  onPointerMove={track(index)}
               />
            ))}
         </div>
         <ul className='text-meta text-ink-soft mt-2.5 flex flex-wrap gap-x-4 gap-y-1'>
            {owners.map((owner, index) => (
               <li
                  key={`${owner.name}-${index}`}
                  className='flex items-center gap-1.5'
               >
                  <span
                     aria-hidden
                     className='size-2.5 shrink-0 rounded-sm'
                     style={{ background: colorOf(index) }}
                  />
                  {ownerName(owner)} · {owner.share}%
               </li>
            ))}
         </ul>
         {hover && (
            <ChartTooltip
               rows={[
                  {
                     color: colorOf(hover.item),
                     value: `${owners[hover.item].share}%`,
                  },
               ]}
               title={ownerName(owners[hover.item])}
               width={hover.width}
               x={hover.x}
               y={hover.y}
            />
         )}
      </div>
   );
};

const blank = (): DealOwner => ({ name: '', role: '', share: 0 });

const ROW =
   'grid grid-cols-[minmax(0,1fr)_8rem_5.5rem_2.25rem] items-center gap-2';

const CapitalForm = ({ deal, onClose }: { deal: Deal; onClose: () => void }) => {
   const { t } = useTranslation('deals');
   const [rows, setRows] = useState<DealOwner[]>(
      deal.owners.length ? deal.owners : [blank()],
   );
   const saving = useRequest();
   const total = rows.reduce((sum, { share }) => sum + share, 0);
   const set = (index: number, patch: Partial<DealOwner>) =>
      setRows((prev) =>
         prev.map((row, at) => (at === index ? { ...row, ...patch } : row)),
      );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const owners = rows
         .map((row) => ({
            ...row,
            name: row.name.trim(),
            role: row.role.trim(),
         }))
         .filter(({ name }) => name);
      if (await saving.run(() => deals.setOwners(deal.id, owners))) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-2.5'>
               <div
                  aria-hidden
                  className={clsx(ROW, 'text-ink-soft text-xs font-medium')}
               >
                  <span>{t('Участник')}</span>
                  <span>{t('Роль')}</span>
                  <span className='text-right'>{t('Доля, %')}</span>
                  <span />
               </div>
               {rows.map((row, index) => (
                  <div key={index} className={ROW}>
                     <input
                        aria-label={t('Участник')}
                        className='field-input'
                        maxLength={120}
                        value={row.name}
                        onChange={(event) =>
                           set(index, { name: event.target.value })
                        }
                     />
                     <input
                        aria-label={t('Роль')}
                        className='field-input'
                        maxLength={60}
                        value={row.role}
                        onChange={(event) =>
                           set(index, { role: event.target.value })
                        }
                     />
                     <input
                        aria-label={t('Доля, %')}
                        className='field-input text-right tabular-nums'
                        inputMode='decimal'
                        value={row.share || ''}
                        onChange={(event) =>
                           set(index, {
                              share:
                                 Number(
                                    event.target.value
                                       .replace(',', '.')
                                       .replace(/[^\d.]/g, ''),
                                 ) || 0,
                           })
                        }
                     />
                     <button
                        type='button'
                        aria-label={t('Убрать участника: {{name}}', {
                           name: row.name,
                        })}
                        className='text-ink-soft hover:text-danger hover:bg-ground grid size-9 place-items-center rounded-md'
                        onClick={() =>
                           setRows((prev) =>
                              prev.filter((_, at) => at !== index),
                           )
                        }
                     >
                        <X aria-hidden className='size-4' />
                     </button>
                  </div>
               ))}
               <div className='flex items-center justify-between gap-3'>
                  <button
                     type='button'
                     className='link text-meta flex items-center gap-1.5'
                     onClick={() => setRows((prev) => [...prev, blank()])}
                  >
                     <Plus aria-hidden className='size-4' />
                     {t('Участник')}
                  </button>
                  <b
                     className={clsx(
                        'tabular-nums',
                        Math.abs(total - 100) > 0.01 && 'text-danger',
                     )}
                  >
                     {t('Всего: {{total}}%', { total })}
                  </b>
               </div>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={saving.pending} variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface CapitalDialogProps {
   deal: Deal;
   open: boolean;
   onClose: () => void;
}

// «Структура капитала» of the startup before the deal: who holds what.
export const CapitalDialog = ({ deal, open, onClose }: CapitalDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={open}
         subtitle={deal.company}
         title={t('Структура капитала')}
         onClose={onClose}
      >
         {open && <CapitalForm deal={deal} onClose={onClose} />}
      </Modal>
   );
};

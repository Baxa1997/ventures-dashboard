import { DEAL_LINK_LABELS, STATUS_LABELS } from '@modules/Deals/constants';
import { dealLinks } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { usePeopleWork } from '@modules/Settings/hooks';
import { stageName } from '@modules/Settings/services';
import { isDone, isMine, statusName, taskKey } from '@modules/Work/helpers';
import { openNewTask } from '@modules/Work/hooks';
import {
   Badge,
   Button,
   Modal,
   ModalBody,
   ModalFooter,
   NoData,
} from '@shared/components';
import { ROLE_LABELS, SECTION_PATHS } from '@shared/constants';
import { formatNumericDate } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { StaffMember } from '@shared/types/settings.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface PersonWorkProps {
   member: StaffMember | null; // null: closed
   editable: boolean; // the director
   onClose: () => void;
}

const SECTION_TITLE = 'text-ink-soft mb-1.5 text-xs font-semibold';
const LINE =
   'border-line hover:bg-hover flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-1 py-2 transition-colors last:border-b-0';

/* What is attached to a person: the deals, each with how, and their open tasks.
   It is what they see when they sign in. The director attaches a deal here (the
   person joins its team) or gives them a task. */
const PersonWork = ({ member, editable, onClose }: PersonWorkProps) => {
   const { t } = useTranslation('settings');
   const { t: tDeals } = useTranslation('deals');
   const { t: tWork } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const people = usePeopleWork();
   const [dealId, setDealId] = useState('');
   const attaching = useRequest({ success: t('Прикреплено к сделке') });

   const tasks = people?.tasks ?? [];
   const all = people?.deals ?? [];
   const attached = member
      ? all
           .map((deal) => ({ deal, links: dealLinks(deal, tasks, member.id) }))
           .filter(({ links }) => links.length)
      : [];
   const free = member
      ? all.filter(
           (deal) =>
              ['review', 'active'].includes(deal.status) &&
              !dealLinks(deal, tasks, member.id).length,
        )
      : [];
   const open = member
      ? tasks.filter((task) => !isDone(task) && isMine(task, member.id))
      : [];

   const attach = async () => {
      if (!member || !dealId) return;
      const done = await attaching.run(() =>
         deals.addTeamMember(dealId, {
            employeeId: member.id,
            role: member.position || tLayout(ROLE_LABELS[member.role]),
         }),
      );
      if (done) setDealId('');
   };

   return (
      <Modal
         open={member !== null}
         size='lg'
         subtitle={t('Что видно этому сотруднику в панели')}
         title={member?.name ?? ''}
         onClose={onClose}
      >
         <ModalBody>
            <div className='grid gap-5'>
               <section>
                  <h3 className={SECTION_TITLE}>
                     {t('Сделки ({{count}})', { count: attached.length })}
                  </h3>
                  {attached.length ? (
                     <ul>
                        {attached.map(({ deal, links }) => (
                           <li key={deal.id} className={LINE}>
                              <Link
                                 className='link min-w-0 flex-1 font-medium'
                                 data-hint={t('Открыть карточку сделки')}
                                 to={`${SECTION_PATHS.deals}/${deal.id}`}
                                 onClick={onClose}
                              >
                                 {deal.company}
                              </Link>
                              <span className='flex flex-wrap gap-1'>
                                 {links.map((link) => (
                                    <Badge key={link} tone='neutral'>
                                       {tDeals(DEAL_LINK_LABELS[link])}
                                    </Badge>
                                 ))}
                              </span>
                              <span className='text-ink-faint text-xs'>
                                 {deal.status === 'active'
                                    ? stageName(deal.stage)
                                    : tDeals(STATUS_LABELS[deal.status])}
                              </span>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Сделок пока нет.')}</NoData>
                  )}
                  {editable && free.length > 0 && (
                     <div className='mt-2.5 flex flex-wrap gap-2'>
                        <select
                           aria-label={t('Сделка')}
                           className='field-input min-w-0 flex-1'
                           value={dealId}
                           onChange={(event) => setDealId(event.target.value)}
                        >
                           <option value=''>{t('Выберите сделку')}</option>
                           {free.map(({ id, company }) => (
                              <option key={id} value={id}>
                                 {company}
                              </option>
                           ))}
                        </select>
                        <Button
                           disabled={!dealId}
                           hint={t('Прикрепить сотрудника к выбранной сделке')}
                           loading={attaching.pending}
                           variant='ghost'
                           onClick={attach}
                        >
                           {t('Прикрепить')}
                        </Button>
                     </div>
                  )}
               </section>
               <section>
                  <h3 className={SECTION_TITLE}>
                     {t('Открытые задачи ({{count}})', { count: open.length })}
                  </h3>
                  {open.length ? (
                     <ul>
                        {open.map((task) => (
                           <li key={task.id} className={LINE}>
                              <Link
                                 className='link min-w-0 flex-1'
                                 data-hint={t('Открыть задачу')}
                                 to={`${SECTION_PATHS.tasks}?task=${task.id}`}
                                 onClick={onClose}
                              >
                                 {taskKey(task)} {task.title}
                              </Link>
                              <span className='text-ink-faint text-xs'>
                                 {[
                                    statusName(tWork, task.status),
                                    task.dueDate &&
                                       formatNumericDate(task.dueDate),
                                 ]
                                    .filter(Boolean)
                                    .join(' · ')}
                              </span>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Открытых задач нет.')}</NoData>
                  )}
               </section>
            </div>
         </ModalBody>
         <ModalFooter>
            {editable && member && (
               <Button
                  hint={t('Создать задачу этому сотруднику')}
                  variant='ghost'
                  onClick={() => {
                     onClose();
                     openNewTask({ assigneeId: member.id });
                  }}
               >
                  {t('Поставить задачу')}
               </Button>
            )}
            <Button hint={t('Закрыть это окно')} onClick={onClose}>
               {t('Готово')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default PersonWork;

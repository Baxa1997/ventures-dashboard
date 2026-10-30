import portfolio from '@modules/Portfolio/services';
import { listOf, nameOf } from '@modules/Settings/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   CompanyInput,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CompanyDialogProps {
   company: PortfolioCompany | null; // null: the dialog is closed
   onClose: () => void;
}

const CompanyForm = ({
   company,
   onClose,
}: {
   company: PortfolioCompany;
   onClose: () => void;
}) => {
   const { t } = useTranslation('portfolio');
   const [input, setInput] = useState<CompanyInput>({
      name: company.name,
      tagline: company.tagline,
      about: company.about,
      industryKey: company.industryKey,
      countries: company.countries,
      ownerId: company.ownerId,
      now: company.now,
   });
   const [error, setError] = useState('');
   const saving = useAction(
      (value: CompanyInput) => portfolio.updateCompany(company.id, value),
      { success: t('Данные компании сохранены') },
   );
   const change = (patch: Partial<CompanyInput>) =>
      setInput((prev) => ({ ...prev, ...patch }));
   const industries = listOf('industries');

   return (
      <form
         noValidate
         className={MODAL_FORM}
         onSubmit={async (event) => {
            event.preventDefault();
            const value = {
               ...input,
               name: input.name.trim(),
               tagline: input.tagline.trim(),
               about: input.about.trim(),
               countries: input.countries.trim(),
               now: input.now.trim(),
            };
            if (!value.name) {
               setError(t('Назовите компанию'));
               return;
            }
            if (await saving.run(value)) onClose();
         }}
      >
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field error={error} label={t('Название')}>
                  <input
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input'
                     value={input.name}
                     onChange={(event) => {
                        change({ name: event.target.value });
                        setError('');
                     }}
                  />
               </Field>
               <Field label={t('Отрасль')}>
                  <select
                     className='field-input select-chevron'
                     value={input.industryKey}
                     onChange={(event) =>
                        change({ industryKey: event.target.value })
                     }
                  >
                     <option value=''>—</option>
                     {industries.map((item) => (
                        <option key={item.key} value={item.key}>
                           {nameOf(item)}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t('Строка под названием в списке')}
                  label={t('Коротко')}
               >
                  <input
                     className='field-input'
                     value={input.tagline}
                     onChange={(event) =>
                        change({ tagline: event.target.value })
                     }
                  />
               </Field>
               <Field className='sm:col-span-2' label={t('О компании')}>
                  <textarea
                     className='field-input field-sizing-content min-h-20 resize-none'
                     value={input.about}
                     onChange={(event) => change({ about: event.target.value })}
                  />
               </Field>
               <Field label={t('Страны')}>
                  <input
                     className='field-input'
                     value={input.countries}
                     onChange={(event) =>
                        change({ countries: event.target.value })
                     }
                  />
               </Field>
               <Field label={t('Ответственный')}>
                  <select
                     className='field-input select-chevron'
                     value={input.ownerId}
                     onChange={(event) =>
                        change({ ownerId: event.target.value })
                     }
                  >
                     <option value=''>{t('Не назначен')}</option>
                     {TEAM.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {shortName(name)}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t(
                     'Список показывает это, когда нет ничего срочнее: неотвеченного запроса или отчёта на проверку',
                  )}
                  label={t('Что происходит')}
               >
                  <input
                     className='field-input'
                     value={input.now}
                     onChange={(event) => change({ now: event.target.value })}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// What the fund changes about a company: its name and lines, its sector and
// countries, who is responsible and what is going on.
const CompanyDialog = ({ company, onClose }: CompanyDialogProps) => {
   const { t } = useTranslation('portfolio');
   return (
      <Modal
         open={company !== null}
         size='wide'
         title={t('Данные компании')}
         onClose={onClose}
      >
         {company && (
            <CompanyForm key={company.id} company={company} onClose={onClose} />
         )}
      </Modal>
   );
};

export default CompanyDialog;

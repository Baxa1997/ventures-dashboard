import { CATEGORIES } from '@modules/Documents/constants';
import { type FilePath, pathFrom } from '@modules/Documents/helpers';
import { useFilesData } from '@modules/Documents/hooks';
import { Loading, PageBody, PageHeader } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { FileManager, type FileView, Issues } from './components';

/* Документы: one file manager over the fund's documents, the deals' data
   rooms and the committee's materials, and the open questions of corporate
   governance beside the fund's documents. The address keeps the open
   folder (?in=fund/orders) and the tiles (?view=grid); the old register's
   ?tab=orders opens that section, and ?doc=<id> marks a fund document in
   its own. */
const DocumentsPage = () => {
   const { t } = useTranslation('documents');
   const { t: tLayout } = useTranslation('layout');
   const data = useFilesData();
   const [params, setParams] = useSearchParams();
   const marked = params.get('doc') ?? '';
   const markedDocument = data?.fund.documents.find(({ id }) => id === marked);
   const section = CATEGORIES.find((id) => id === params.get('tab'));
   const path: FilePath = params.has('in')
      ? pathFrom(params.get('in'))
      : markedDocument
        ? ['fund', markedDocument.category]
        : section
          ? ['fund', section]
          : [];
   const view: FileView = params.get('view') === 'grid' ? 'grid' : 'list';

   const show = (
      next: FilePath,
      { tiles = view === 'grid', doc = '', replace = false } = {},
   ) => {
      const query = new URLSearchParams();
      if (next.length) query.set('in', next.join('/'));
      if (tiles) query.set('view', 'grid');
      if (doc) query.set('doc', doc);
      setParams(query, { replace });
   };

   const header = (
      <PageHeader
         label={t('Документы')}
         meta={t(
            'Документы всех модулей в одном месте: папки фонда, дата румы сделок и материалы Инвесткомитета.',
         )}
         section={tLayout('Фонд')}
         title={t('Файлы и документы')}
      />
   );

   if (!data)
      return (
         <>
            {header}
            <Loading />
         </>
      );

   return (
      <>
         {header}
         <PageBody className='flex flex-col'>
            <FileManager
               data={data}
               marked={marked}
               path={path}
               view={view}
               onGo={(next) => show(next)}
               onSaved={(id, category) =>
                  show(['fund', category], { doc: id, replace: true })
               }
               onView={(next) =>
                  show(path, { tiles: next === 'grid', replace: true })
               }
            />
            {(!path.length || path[0] === 'fund') && (
               <Issues issues={data.fund.issues} />
            )}
         </PageBody>
      </>
   );
};

export default DocumentsPage;

import { formatMoic, positionOf } from '@modules/Portfolio/helpers';
import { StatTile } from '@shared/components';
import { formatMoneyShort } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { Briefcase, Percent, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PortfolioTilesProps {
   companies: PortfolioCompany[];
}

/* The portfolio's four figures, as the design draws them: the companies held
   and exited, the money invested, what the portfolio is worth and its MOIC.
   A company whose stake or valuation is not known yet counts at what was
   invested in it. */
const PortfolioTiles = ({ companies }: PortfolioTilesProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const active = companies.filter(({ status }) => status === 'active');
   const invested = companies.reduce((sum, item) => sum + item.invested, 0);
   const worth = companies.reduce(
      (sum, item) => sum + (positionOf(item).value ?? item.invested),
      0,
   );

   return (
      <div className='gap-section stagger mb-4 grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]'>
         <StatTile
            color='sky'
            icon={Briefcase}
            label={t('Компаний')}
            note={t('активные + выходы')}
            value={`${active.length} + ${companies.length - active.length}`}
         />
         <StatTile
            color='info'
            icon={Wallet}
            label={t('Вложено')}
            note={t('по всем сделкам')}
            value={formatMoneyShort(invested)}
         />
         <StatTile
            color='success'
            icon={TrendingUp}
            label={t('Стоимость портфеля')}
            note={t('по последней оценке и выходам')}
            value={formatMoneyShort(worth)}
         />
         <StatTile
            color='indigo'
            icon={Percent}
            label={t('MOIC портфеля')}
            note={t('стоимость / вложено')}
            value={invested ? formatMoic(worth / invested, language) : '—'}
         />
      </div>
   );
};

export default PortfolioTiles;

import '@assets/styles/fonts.css';
import '@assets/styles/tailwind.css';
import i18n from '@shared/i18n';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';

const Providers = ({ children }: PropsWithChildren) => (
   <I18nextProvider i18n={i18n}>
      <BrowserRouter>{children}</BrowserRouter>
   </I18nextProvider>
);

export default Providers;

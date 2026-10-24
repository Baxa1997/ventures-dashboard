import { Toaster } from '@shared/components';
import Modules from '../modules';
import Providers from './Providers';

const App = () => (
   <Providers>
      <Modules />
      <Toaster />
   </Providers>
);

export default App;

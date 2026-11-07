import TelegramSetup from '@modules/Chat/components/TelegramSetup';

/* Настройки → Интеграции: for now only Telegram, the deals' groups, at the
   user's word (7 Nov). The other channels (mail, AI, content) and the fund's
   systems come back here as they are connected: CHANNELS and INTEGRATIONS in
   ../../constants keep their texts. */
const Integrations = () => <TelegramSetup />;

export default Integrations;

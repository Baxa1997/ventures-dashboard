export { axisTicks, formatMoneyShort } from '@shared/helpers';

// The first word of a name, for the greeting: «Abdullo Khidoyatov» → Abdullo.
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';


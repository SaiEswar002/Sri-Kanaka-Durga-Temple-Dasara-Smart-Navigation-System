import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import enMessages from './locales/en.json';
import teMessages from './locales/te.json';

const messagesMap: Record<string, typeof enMessages> = {
  en: enMessages,
  te: teMessages,
};

export default getRequestConfig(async () => {
  let locale = 'en';
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('locale')?.value;
    if (localeCookie === 'te') {
      locale = 'te';
    }
  } catch {
    locale = 'en';
  }

  return {
    locale,
    messages: messagesMap[locale] || enMessages,
  };
});

import { useState, useCallback, useEffect } from 'react';

type Language = 'en' | 'ru' | 'uk';

export const useLocalization = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, Record<string, string>> | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const [enRes, ruRes, ukRes] = await Promise.all([
          fetch('/locales/en.json'),
          fetch('/locales/ru.json'),
          fetch('/locales/uk.json'),
        ]);

        if (!enRes.ok || !ruRes.ok || !ukRes.ok) {
          console.error('Failed to fetch one or more translation files.');
          return;
        }

        const [en, ru, uk] = await Promise.all([
            enRes.json(),
            ruRes.json(),
            ukRes.json(),
        ]);
        
        setTranslations({ en, ru, uk });
      } catch (error) {
        console.error("Failed to load translations:", error);
      }
    };
    loadTranslations();
  }, []);

  const t = useCallback((key: string): string => {
    if (!translations) {
      return key;
    }
    return (translations[language] && translations[language][key]) || key;
  }, [language, translations]);

  return { language, setLanguage, t };
};

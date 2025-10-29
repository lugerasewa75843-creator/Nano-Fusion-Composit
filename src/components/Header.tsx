
import React from 'react';
import { HelpIcon, SidePanelIcon } from './icons';

interface HeaderProps {
  language: 'en' | 'ru' | 'uk';
  onLanguageChange: (lang: 'en' | 'ru' | 'uk') => void;
  t: (key: string) => string;
  onToggleDrawer: () => void;
  onToggleHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ language, onLanguageChange, t, onToggleDrawer, onToggleHelp }) => {
  return (
    <header className="flex justify-between items-center py-4 px-6 2xl:px-0">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary flex items-baseline gap-2 flex-wrap">
        <span>
          <span className="text-primary">Nano</span> Fusion
        </span>
        {/* Fix: Incremented version number for bug fix. */}
        <span className="text-sm font-normal text-text-secondary">v2.18.0-alpha</span>
      </h1>
      <div className="flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as 'en' | 'ru' | 'uk')}
          className="bg-surface border border-border text-text-primary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 appearance-none cursor-pointer"
          aria-label="Language selector"
        >
          <option value="en">{t('lang_en')}</option>
          <option value="ru">{t('lang_ru')}</option>
          <option value="uk">{t('lang_uk')}</option>
        </select>
         <button
          onClick={onToggleHelp}
          className="p-2 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full transition-colors"
          aria-label="Toggle help modal"
        >
          <HelpIcon />
        </button>
        <button
          onClick={onToggleDrawer}
          className="p-2 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full transition-colors"
          aria-label="Toggle side panel"
        >
          <SidePanelIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;
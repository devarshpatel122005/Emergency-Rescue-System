import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
      aria-label="Language"
      value={i18n.language}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
    >
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
    </select>
  );
}

export default LanguageSwitcher;

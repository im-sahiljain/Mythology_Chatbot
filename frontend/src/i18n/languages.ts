export interface LanguageOption {
  code: string;           // ISO 639-1 / 639-2 code
  name: string;           // English name
  nativeName: string;     // Script name
  region?: string;        // Region / State
  scriptDirection?: 'ltr' | 'rtl';
  isCommon?: boolean;
}

export const ALL_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global / India', isCommon: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North / Central India', isCommon: true },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Ancient / Vedic', isCommon: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu & Puducherry', isCommon: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh & Telangana', isCommon: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal & Tripura', isCommon: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra', isCommon: true },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat', isCommon: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka', isCommon: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala', isCommon: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab', isCommon: true },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha', isCommon: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam', isCommon: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'North / Deccan India', scriptDirection: 'rtl', isCommon: true },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', region: 'Bihar' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', region: 'Jammu & Kashmir' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'Sikkim & West Bengal' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिंधी', region: 'Western India' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', region: 'Goa & Coastal Karnataka' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', region: 'Jammu' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', region: 'Assam' },
  { code: 'sat', name: 'Santali', nativeName: 'संताली /  Ol Chiki', region: 'Jharkhand & Odisha' },
];

export const getLanguageByCode = (code: string): LanguageOption => {
  const found = ALL_LANGUAGES.find((lang) => lang.code.toLowerCase() === code.toLowerCase());
  return found || { code, name: code.toUpperCase(), nativeName: code.toUpperCase(), isCommon: false };
};

export const formatLanguageLabel = (code: string): string => {
  const lang = getLanguageByCode(code);
  if (lang.code === 'en') return 'English';
  return `${lang.nativeName} (${lang.name})`;
};

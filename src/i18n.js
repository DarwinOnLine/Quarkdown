// Internationalization module

export class I18n {
  constructor({ languages = ['en'], defaultLanguage = 'en', translations = {} }) {
    this.languages = languages;
    this.defaultLanguage = defaultLanguage;
    this.translations = translations;
    this.currentLang = defaultLanguage;
  }

  /** Detect language from browser preferences */
  detectLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0];
    return this.languages.includes(browserLang) ? browserLang : this.defaultLanguage;
  }

  /** Resolve language: explicit > URL-detected > browser > default */
  resolve(langFromUrl) {
    if (langFromUrl && this.languages.includes(langFromUrl)) {
      this.currentLang = langFromUrl;
    } else {
      this.currentLang = this.detectLanguage();
    }
    return this.currentLang;
  }

  /** Get translation by dot-notation key */
  t(key) {
    const keys = key.split('.');
    let result = this.translations[this.currentLang];
    for (const k of keys) {
      result = result?.[k];
    }
    return result || key;
  }

  /** Get the other language(s) for switcher UI */
  otherLanguages() {
    return this.languages.filter(l => l !== this.currentLang);
  }
}

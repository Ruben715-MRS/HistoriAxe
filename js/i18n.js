// =========================================================================
// === HISTORIAXE — MOTEUR D'INTERNATIONALISATION (i18n & PACKS DE LANGUE) ===
// =========================================================================

const I18N_DATA_CACHE = 'historiaxe-data-v1.0.0';

const AVAILABLE_LANGUAGES = [
    { code: 'fr', name: 'Français', flag: '🇫🇷', version: '1.0.0', size: '10.5 Mo (Intégral)', isDefault: true },
    { code: 'en', name: 'English', flag: '🇬🇧', version: '1.0.0', size: '150 Ko (Démo)', isDefault: false },
    { code: 'es', name: 'Español', flag: '🇪🇸', version: '1.0.0', size: '150 Ko (Démo)', isDefault: false }
];

class I18nManager {
    constructor() {
        this.currentLang = 'fr';
        this.installedLanguages = ['fr'];
        this.uiStrings = {};
        this.fallbackStrings = {};
        this.isLoading = false;
    }

    async init() {
        try {
            const savedLang = localStorage.getItem(LANG_KEY);
            const savedInstalled = JSON.parse(localStorage.getItem(INSTALLED_LANGS_KEY));
            if (Array.isArray(savedInstalled) && savedInstalled.includes('fr')) {
                this.installedLanguages = savedInstalled;
            } else {
                this.installedLanguages = ['fr'];
                localStorage.setItem(INSTALLED_LANGS_KEY, JSON.stringify(this.installedLanguages));
            }

            if (savedLang && this.installedLanguages.includes(savedLang)) {
                this.currentLang = savedLang;
            } else {
                this.currentLang = 'fr';
            }
        } catch (e) {
            this.currentLang = 'fr';
            this.installedLanguages = ['fr'];
        }

        try {
            const frUiRes = await fetch('ui/fr.json');
            this.fallbackStrings = await frUiRes.json();
        } catch (e) {
            console.warn('Could not load fallback ui/fr.json:', e);
        }

        await this.loadLanguage(this.currentLang, false);
    }

    async loadLanguage(lang, reloadUI = true) {
        this.isLoading = true;
        try {
            let uiData = null;
            if (lang === 'fr' && Object.keys(this.fallbackStrings).length > 0) {
                uiData = this.fallbackStrings;
            } else {
                const uiRes = await fetch(`ui/${lang}.json`);
                uiData = await uiRes.json();
            }
            this.uiStrings = uiData;

            const dataRes = await fetch(`data/${lang}.json`);
            const dataJson = await dataRes.json();
            
            window.bdd = dataJson.categories || [];
            if (typeof ensureCustomCategoryInBdd === 'function') ensureCustomCategoryInBdd();
            else if (typeof bdd !== 'undefined') bdd = window.bdd;
            this.currentLang = lang;
            localStorage.setItem(LANG_KEY, lang);

            document.documentElement.lang = lang;

            if (reloadUI) {
                this.applyTranslations();
                if (typeof initCategories === 'function') initCategories();
                if (typeof renderSettingsUI === 'function') renderSettingsUI();
                showToast(`🌐 Langue active : ${this.getLanguageName(lang)}`, 3000);
            }
        } catch (err) {
            console.error(`Failed to load language pack [${lang}]:`, err);
            if (lang !== 'fr') {
                showToast(`⚠️ Erreur de chargement du pack ${lang}. Repli sur Français.`, 4000);
                await this.loadLanguage('fr', reloadUI);
            }
        } finally {
            this.isLoading = false;
        }
    }

    t(key, params = {}) {
        if (!key) return '';
        const keys = key.split('.');
        let val = this.resolveKey(this.uiStrings, keys);
        if (val === undefined || val === null) {
            val = this.resolveKey(this.fallbackStrings, keys);
        }
        if (val === undefined || val === null) {
            return key;
        }

        if (typeof val === 'string' && params && typeof params === 'object') {
            for (const [k, v] of Object.entries(params)) {
                val = val.replaceAll(`{${k}}`, v);
            }
        }
        return val;
    }

    resolveKey(obj, keys) {
        let curr = obj;
        for (const k of keys) {
            if (!curr || typeof curr !== 'object') return undefined;
            curr = curr[k];
        }
        return curr;
    }

    getLanguageName(code) {
        const item = AVAILABLE_LANGUAGES.find(l => l.code === code);
        return item ? `${item.flag} ${item.name}` : code;
    }

    async downloadLanguagePack(lang, onProgress = null) {
        if (!navigator.onLine) {
            showToast('⚠️ Connexion Internet requise pour télécharger un pack.', 4000);
            return false;
        }

        try {
            if (typeof onProgress === 'function') onProgress(10);

            const uiUrl = `ui/${lang}.json`;
            const dataUrl = `data/${lang}.json`;

            const [uiRes, dataRes] = await Promise.all([
                fetch(uiUrl),
                fetch(dataUrl)
            ]);

            if (!uiRes.ok || !dataRes.ok) {
                throw new Error('HTTP error downloading pack files');
            }

            if (typeof onProgress === 'function') onProgress(60);

            if ('caches' in window) {
                const cache = await caches.open(I18N_DATA_CACHE);
                await Promise.all([
                    cache.put(uiUrl, uiRes.clone()),
                    cache.put(dataUrl, dataRes.clone())
                ]);
            }

            if (typeof onProgress === 'function') onProgress(100);

            if (!this.installedLanguages.includes(lang)) {
                this.installedLanguages.push(lang);
                localStorage.setItem(INSTALLED_LANGS_KEY, JSON.stringify(this.installedLanguages));
            }

            showToast(`✨ Pack ${this.getLanguageName(lang)} installé et prêt hors-ligne !`, 3500);
            this.renderLanguagePacksSettingsUI();
            return true;
        } catch (err) {
            console.error(`Error downloading pack ${lang}:`, err);
            showToast(`⚠️ Échec du téléchargement du pack ${lang}.`, 4000);
            return false;
        }
    }

    async deleteLanguagePack(lang) {
        if (lang === 'fr') {
            showToast('⚠️ Le pack Français de base ne peut pas être supprimé.', 3000);
            return;
        }

        try {
            if ('caches' in window) {
                const cache = await caches.open(I18N_DATA_CACHE);
                await Promise.all([
                    cache.delete(`ui/${lang}.json`),
                    cache.delete(`data/${lang}.json`)
                ]);
            }

            this.installedLanguages = this.installedLanguages.filter(l => l !== lang);
            localStorage.setItem(INSTALLED_LANGS_KEY, JSON.stringify(this.installedLanguages));

            if (this.currentLang === lang) {
                await this.loadLanguage('fr', true);
            }

            showToast(`🗑️ Pack ${this.getLanguageName(lang)} supprimé.`, 3000);
            this.renderLanguagePacksSettingsUI();
        } catch (e) {
            console.error(`Error deleting pack ${lang}:`, e);
        }
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = this.t(key);
            if (translated && translated !== key) {
                el.innerText = translated;
            }
        });

        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const pairs = el.getAttribute('data-i18n-attr').split(';');
            pairs.forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) {
                    const translated = this.t(key);
                    if (translated && translated !== key) {
                        el.setAttribute(attr, translated);
                    }
                }
            });
        });
    }

    renderLanguagePacksSettingsUI() {
        const container = document.getElementById('settings-lang-packs-container');
        if (!container) return;
        container.innerHTML = '';

        AVAILABLE_LANGUAGES.forEach(langItem => {
            const isInstalled = this.installedLanguages.includes(langItem.code);
            const isActive = this.currentLang === langItem.code;

            const card = document.createElement('div');
            card.className = 'lang-pack-card';

            let statusBadge = '';
            if (isActive) {
                statusBadge = `<span class="lang-pack-status-badge active">${this.t('settings.active_badge') || 'Actif'}</span>`;
            } else if (isInstalled) {
                statusBadge = `<span class="lang-pack-status-badge installed">${this.t('settings.installed_badge') || 'Installé'}</span>`;
            }

            let actionBtns = '';
            if (isActive) {
                actionBtns = `<span style="font-size:13px; font-weight:700; color:var(--primary-blue);">✓</span>`;
            } else if (isInstalled) {
                actionBtns = `
                    <button class="btn-pack-action btn-primary" onclick="i18n.loadLanguage('${langItem.code}', true)">${this.t('nav.validate') || 'Activer'}</button>
                    ${!langItem.isDefault ? `<button class="btn-pack-action btn-danger" onclick="i18n.deleteLanguagePack('${langItem.code}')" title="${this.t('settings.delete_btn') || 'Supprimer'}">🗑️</button>` : ''}
                `;
            } else {
                actionBtns = `
                    <button class="btn-pack-action btn-primary" id="btn-dl-${langItem.code}" onclick="i18n.downloadLanguagePack('${langItem.code}')">
                        📥 ${this.t('settings.download_btn') || 'Télécharger'}
                    </button>
                `;
            }

            card.innerHTML = `
                <div class="lang-pack-left">
                    <span class="lang-pack-flag">${langItem.flag}</span>
                    <div class="lang-pack-info">
                        <div class="lang-pack-name">
                            ${langItem.name}
                            ${statusBadge}
                        </div>
                        <div class="lang-pack-details">${langItem.size} • v${langItem.version}</div>
                    </div>
                </div>
                <div class="lang-pack-actions">
                    ${actionBtns}
                </div>
            `;
            container.appendChild(card);
        });
    }
}

const i18n = new I18nManager();
const t = (key, params) => i18n.t(key, params);

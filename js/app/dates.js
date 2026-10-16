// Extrait de l'ancien js/app.js — Formats de dates et d'années.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// =========================================================================
// === HISTORIAXE — CONTRÔLEUR PRINCIPAL & MOTEURS DE JEU (APP.JS) ===
// =========================================================================

// =========================================================================
// === FONCTIONS UTILITAIRES POUR LES DATES ===
// Perdues lors de l'extraction de l'ancien <script> monolithique vers ce
// fichier (refactor PWA/i18n/gamification) : elles n'étaient référencées que
// depuis le HTML d'origine et n'ont jamais été reportées ici, ce qui cassait
// silencieusement (ReferenceError) le lancement de toute partie ou frise.
// =========================================================================
// Séparateur décimal localisé pour les temps chronométrés affichés au joueur
// (« 12,3 s » en français/allemand, « 12.3 s » ailleurs) — évite d'imposer la
// virgule française à toutes les langues.
function formatDecimal(n) {
    const str = n.toFixed(1);
    const commaLangs = ['fr', 'de'];
    const lang = (typeof i18n !== 'undefined' && i18n.currentLang) || 'fr';
    return commaLangs.includes(lang) ? str.replace('.', ',') : str;
}

// Seuil (en valeur absolue) à partir duquel une année reçoit un séparateur
// de milliers, ex. « 3 300 000 av. J.-C. » (Préhistoire). En dessous, les
// dates courantes (jusqu'à 4 chiffres, ex. 2026 ou 776 av. J.-C.) restent
// affichées telles quelles : un espace entre centaines et milliers y serait
// incongru (« 2 026 »).
const LONG_YEAR_THRESHOLD = 10000;

// Locale utilisée pour le regroupement par milliers (espace insécable fin
// en français, virgule en anglais, etc.), alignée sur la langue de l'UI
// plutôt que sur celle du navigateur.
const YEAR_GROUPING_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', ja: 'ja-JP' };

function isLongYear(year) {
    return Math.abs(year) >= LONG_YEAR_THRESHOLD;
}

function formatYear(year) {
    const abs = Math.abs(year);
    const display = isLongYear(year)
        ? abs.toLocaleString(YEAR_GROUPING_LOCALES[i18n.currentLang] || 'fr-FR')
        : abs;
    if (year < 0) return display + " " + t('game.era_bc');
    return display;
}

function formatEventDate(evt) {
    if (!evt || evt.date == null) return "";
    if (evt.dateFin != null && evt.dateFin !== evt.date) {
        return `${formatYear(evt.date)} – ${formatYear(evt.dateFin)}`;
    }
    return `${formatYear(evt.date)}`;
}

function formatEventDuration(evt) {
    if (!evt || evt.dateFin == null || evt.dateFin === evt.date) return null;
    const diff = Math.abs(evt.dateFin - evt.date);
    if (diff >= 1) return t('game.duration_years', { n: diff });
    return null;
}

function toRoman(num) {
    if (!num || num <= 0) return '';
    const lookup = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let roman = '';
    for (const [val, str] of lookup) {
        while (num >= val) {
            roman += str;
            num -= val;
        }
    }
    return roman;
}

// Le numéral utilisé dans « game.century_label » est en chiffres romains pour
// le français (« IIe siècle »), en chiffres arabes pour les autres langues
// (« 2nd century », « 2. Jahrhundert »…) — voir ui/<lang>.json.
function getCenturyLabel(year) {
    if (year == null) return '';
    const isBC = year < 0;
    const c = isBC ? Math.ceil(Math.abs(year) / 100) : Math.ceil((year === 0 ? 1 : year) / 100);
    const useRoman = (typeof i18n !== 'undefined' && i18n.currentLang === 'fr');
    const label = (c === 1) ? t('game.century_label_1') : t('game.century_label', { n: useRoman ? toRoman(c) : c });
    if (!isBC) return label;
    // L'ordre « ère puis siècle » (japonais) diffère de « siècle puis ère »
    // (français, anglais, espagnol, allemand, italien).
    const era = t('game.era_bc');
    return (typeof i18n !== 'undefined' && i18n.currentLang === 'ja') ? `${era}${label}` : `${label} ${era}`;
}

function getPeriodSliceLabel(year, span) {
    const step = (span > 300) ? 100 : ((span <= 60) ? 10 : ((span <= 150) ? 25 : 50));
    const start = Math.floor(year / step) * step;
    if (step === 10 && start >= 1000) {
        return t('game.decade_label', { start });
    }
    const end = start + step;
    return `${formatYear(start)} – ${formatYear(end)}`;
}


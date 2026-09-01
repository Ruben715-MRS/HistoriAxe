// =========================================================================
// === HISTORIAXE API — CONNEXION POSTGRES (Neon / Supabase / Vercel PG) ===
// =========================================================================
// Nécessite la variable d'environnement DATABASE_URL (chaîne de connexion
// Postgres standard, ex: postgres://user:pass@host/db?sslmode=require).
// Voir README.md pour la configuration côté Vercel.

const { Pool } = require('pg');

let pool = null;
let schemaReady = null;

function getPool() {
    if (pool) return pool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        const err = new Error(
            "DATABASE_URL n'est pas configuré. Ajoutez cette variable d'environnement " +
            '(Vercel → Project Settings → Environment Variables) avec la chaîne de connexion ' +
            "de votre base Postgres (Neon, Supabase, ou Vercel Postgres)."
        );
        err.statusCode = 500;
        throw err;
    }
    // Les providers hébergés (Neon, Supabase, Vercel Postgres) exigent TLS ;
    // leur certificat n'est pas toujours dans la chaîne de confiance par
    // défaut du runtime Node de la lambda, d'où rejectUnauthorized: false
    // (chiffrement actif, on ne valide juste pas la CA — acceptable ici, la
    // chaîne de connexion elle-même est un secret gardé côté serveur).
    const needsSsl = /sslmode=require|neon\.tech|supabase\.co|vercel-storage\.com/i.test(connectionString);
    pool = new Pool({
        connectionString,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        max: 3,
        idleTimeoutMillis: 10000,
    });
    return pool;
}

async function query(text, params) {
    const p = getPool();
    return p.query(text, params);
}

// Auto-migration idempotente : crée les tables si elles n'existent pas
// encore. Exécutée une seule fois par instance de fonction "chaude" (le
// résultat de la promesse est mis en cache), pour éviter de refaire ces
// `create table if not exists` à chaque requête.
async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = (async () => {
        await query(`
            create table if not exists players (
                id            uuid primary key,
                device_id     text unique not null,
                pseudo        text not null default 'Anonyme',
                created_at    timestamptz not null default now(),
                last_seen_at  timestamptz not null default now()
            );
        `);
        await query(`
            create table if not exists daily_scores (
                id             bigserial primary key,
                player_id      uuid not null references players(id) on delete cascade,
                challenge_date date not null,
                lang           text not null,
                score          integer not null,
                time_seconds   numeric(6,1) not null default 0,
                rounds_played  smallint not null default 0,
                rounds_total   smallint not null default 0,
                won            boolean not null default false,
                suspicious     boolean not null default false,
                created_at     timestamptz not null default now(),
                updated_at     timestamptz not null default now(),
                unique (player_id, challenge_date, lang)
            );
        `);
        await query(`
            create index if not exists idx_daily_scores_leaderboard
                on daily_scores (challenge_date, lang, score desc, time_seconds asc);
        `);
        await query(`
            create index if not exists idx_daily_scores_player
                on daily_scores (player_id);
        `);
        await query(`
            create table if not exists player_progress (
                player_id   uuid primary key references players(id) on delete cascade,
                data        jsonb not null default '{}'::jsonb,
                updated_at  timestamptz not null default now()
            );
        `);
    })().catch((err) => {
        // En cas d'échec (permissions restreintes, base non joignable...),
        // on ne met pas le résultat en cache : la prochaine requête réessaiera.
        schemaReady = null;
        throw err;
    });
    return schemaReady;
}

module.exports = { getPool, query, ensureSchema };

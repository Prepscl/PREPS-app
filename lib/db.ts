import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

type DB = ReturnType<typeof Database>;

const globalDB = global as typeof globalThis & { db: DB };

function initDB(): DB {
  const dbPath = path.join(process.cwd(), 'preps.db');
  const db: DB = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      numero       TEXT    UNIQUE NOT NULL,
      tipo         TEXT    NOT NULL,
      cliente      TEXT    DEFAULT '',
      telefono     TEXT    DEFAULT '',
      items        TEXT    NOT NULL,
      total        INTEGER NOT NULL,
      costo        INTEGER NOT NULL DEFAULT 0,
      estado       TEXT    NOT NULL DEFAULT 'PENDIENTE_PAGO',
      origen       TEXT    DEFAULT 'WEB',
      notas        TEXT    DEFAULT '',
      created_at   TEXT    DEFAULT (datetime('now','localtime')),
      accepted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id   INTEGER NOT NULL,
      monto       INTEGER NOT NULL,
      costo       INTEGER NOT NULL,
      iva         INTEGER NOT NULL,
      ganancia    INTEGER NOT NULL,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    );

    CREATE TABLE IF NOT EXISTS despensa (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ingrediente TEXT    UNIQUE NOT NULL,
      stock_g     INTEGER NOT NULL DEFAULT 0,
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    );

    INSERT OR IGNORE INTO despensa (ingrediente, stock_g) VALUES
      ('pollo',   50000),
      ('arroz',   50000),
      ('brocoli', 50000);
  `);

  return db;
}

if (!globalDB.db) {
  globalDB.db = initDB();
}

export const db = globalDB.db;

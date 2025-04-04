CREATE TABLE group_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    remark TEXT
);

CREATE TABLE proxy_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    remark TEXT
);

CREATE TABLE profile_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    group_id INTEGER,
    proxy_id INTEGER,
    remark TEXT,
    FOREIGN KEY (group_id) REFERENCES group_table(id) ON DELETE SET NULL,
    FOREIGN KEY (proxy_id) REFERENCES proxy_table(id) ON DELETE SET NULL
);

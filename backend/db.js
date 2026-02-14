const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "data.sqlite");

const db = new Database(dbPath);
console.log("✅ Using SQLite DB:", dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);


  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

  -- REFRESH TOKENS
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

  -- ROOMS
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    creator_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
  CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
  CREATE INDEX IF NOT EXISTS idx_rooms_deleted ON rooms(deleted_at);

  -- ROOM INVITES
  CREATE TABLE IF NOT EXISTS room_invites (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    invite_token TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    used_count INTEGER DEFAULT 0,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_invites_room ON room_invites(room_id);
  CREATE INDEX IF NOT EXISTS idx_invites_token ON room_invites(invite_token);
  CREATE INDEX IF NOT EXISTS idx_invites_expires ON room_invites(expires_at);

  -- MESSAGES (enhanced)
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room TEXT NOT NULL,
    user_id TEXT,
    client_id TEXT,
    username TEXT,
    text TEXT NOT NULL,
    system INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    edited_at INTEGER,
    deleted_at INTEGER,
    deleted_for_all INTEGER,
    reply_to_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room_time
    ON messages(room, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_id);

  -- MESSAGE STATUS (read receipts)
  CREATE TABLE IF NOT EXISTS message_status (
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'delivered',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(message_id, user_id),
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_status_message ON message_status(message_id);
  CREATE INDEX IF NOT EXISTS idx_status_user ON message_status(user_id);

  -- OTP (persist; survives restart)
  CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    username TEXT NOT NULL,
    pass_hash TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
`);

function ensureColumn(table, column, sqlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const has = cols.some((c) => c.name === column);
  if (!has) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType};`);
    console.log(`✅ Migration: added ${table}.${column}`);
  }
}

try {
  ensureColumn("refresh_tokens", "revoked_at", "INTEGER");
  ensureColumn("messages", "client_id", "TEXT");
  ensureColumn("messages", "user_id", "TEXT");
  ensureColumn("messages", "edited_at", "INTEGER");
  ensureColumn("messages", "deleted_at", "INTEGER");
  ensureColumn("messages", "deleted_for_all", "INTEGER");
  ensureColumn("messages", "reply_to_id", "TEXT");
} catch (e) {
  console.log("❌ Migration error:", e?.message || e);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function normalizeUsername(username) {
  return String(username || "").trim();
}
function isEmailLike(s) {
  return /.+@.+\..+/.test(String(s || "").trim());
}

function createUser({ id, username, email, passHash }) {
  db.prepare(`
    INSERT INTO users (id, username, email, pass_hash, created_at)
    VALUES (@id, @username, @email, @pass_hash, @created_at)
  `).run({
    id,
    username: normalizeUsername(username),
    email: normalizeEmail(email),
    pass_hash: passHash,
    created_at: Date.now(),
  });
}

function findUserByEmail(email) {
  const e = normalizeEmail(email);
  return db
    .prepare(
      `SELECT id, username, email, pass_hash as passHash FROM users WHERE email = ?`
    )
    .get(e);
}

function findUserByUsername(username) {
  const u = normalizeUsername(username);
  return db
    .prepare(
      `SELECT id, username, email, pass_hash as passHash FROM users WHERE username = ?`
    )
    .get(u);
}

function findUserById(id) {
  return db
    .prepare(
      `SELECT id, username, email, pass_hash as passHash FROM users WHERE id = ?`
    )
    .get(String(id));
}

function findUserByIdentifier(identifier) {
  const id = String(identifier || "").trim();
  if (!id) return null;

  if (isEmailLike(id)) return findUserByEmail(id);
  return findUserByUsername(id) || findUserByEmail(id);
}

function storeRefreshToken({ token, userId, expiresAt }) {
  db.prepare(`
    INSERT OR REPLACE INTO refresh_tokens (token, user_id, created_at, expires_at, revoked_at)
    VALUES (?, ?, ?, ?, NULL)
  `).run(String(token), String(userId), Date.now(), Number(expiresAt));
}

function revokeRefreshToken(token) {
  db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = ?
    WHERE token = ? AND revoked_at IS NULL
  `).run(Date.now(), String(token));
}

function revokeAllRefreshTokensForUser(userId) {
  db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(Date.now(), String(userId));
}

function getRefreshTokenRecord(token) {
  return db
    .prepare(
      `
      SELECT token, user_id as userId, expires_at as expiresAt, revoked_at as revokedAt
      FROM refresh_tokens
      WHERE token = ?
    `
    )
    .get(String(token));
}

function deleteExpiredRefreshTokens() {
  db.prepare(`
    DELETE FROM refresh_tokens
    WHERE expires_at < ? OR revoked_at IS NOT NULL
  `).run(Date.now());
}

function upsertOtp({ email, codeHash, expiresAt, username, passHash }) {
  db.prepare(`
    INSERT INTO otp_codes (email, code_hash, expires_at, username, pass_hash)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      code_hash=excluded.code_hash,
      expires_at=excluded.expires_at,
      username=excluded.username,
      pass_hash=excluded.pass_hash
  `).run(
    normalizeEmail(email),
    String(codeHash),
    Number(expiresAt),
    normalizeUsername(username),
    String(passHash)
  );
}

function getOtp(email) {
  return db
    .prepare(`
      SELECT email, code_hash as codeHash, expires_at as expiresAt, username, pass_hash as passHash
      FROM otp_codes
      WHERE email = ?
    `)
    .get(normalizeEmail(email));
}

function deleteOtp(email) {
  db.prepare(`DELETE FROM otp_codes WHERE email = ?`).run(normalizeEmail(email));
}

function deleteExpiredOtps() {
  db.prepare(`DELETE FROM otp_codes WHERE expires_at < ?`).run(Date.now());
}

function addMessage({ id, room, clientId, username, text, system, createdAt }) {
  db.prepare(`
    INSERT INTO messages (id, room, client_id, username, text, system, created_at)
    VALUES (@id, @room, @client_id, @username, @text, @system, @created_at)
  `).run({
    id: String(id),
    room: String(room),
    client_id: clientId ? String(clientId) : null,
    username: username ?? null,
    text: String(text),
    system: system ? 1 : 0,
    created_at: typeof createdAt === "number" ? createdAt : Date.now(),
  });
}

function getRecentMessages(room, limit = 50) {
  const rows = db
    .prepare(
      `
      SELECT id, room, client_id as clientId, user_id as userId, username, text, system, created_at as createdAt, edited_at as editedAt, deleted_at as deletedAt, deleted_for_all as deletedForAll, reply_to_id as replyToId
      FROM messages
      WHERE room = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `
    )
    .all(String(room), Number(limit));

  return rows.reverse();
}

// ROOM FUNCTIONS
function createRoom({ id, name, creatorId }) {
  db.prepare(`
    INSERT INTO rooms (id, name, creator_id, created_at)
    VALUES (@id, @name, @creator_id, @created_at)
  `).run({
    id: String(id),
    name: String(name),
    creator_id: String(creatorId),
    created_at: Date.now(),
  });
}

function getRoomById(id) {
  return db
    .prepare(`
      SELECT id, name, creator_id as creatorId, created_at as createdAt, deleted_at as deletedAt
      FROM rooms
      WHERE id = ?
    `)
    .get(String(id));
}

function deleteRoom(roomId) {
  db.prepare(`
    UPDATE rooms SET deleted_at = ? WHERE id = ?
  `).run(Date.now(), String(roomId));
}

function deleteOldRooms(sixMonthsAgo) {
  db.prepare(`
    DELETE FROM rooms WHERE deleted_at IS NOT NULL AND deleted_at < ?
  `).run(Number(sixMonthsAgo));
}

// INVITE FUNCTIONS
function createInvite({ id, roomId, inviteToken, createdBy, expiresAt }) {
  db.prepare(`
    INSERT INTO room_invites (id, room_id, invite_token, created_by, created_at, expires_at)
    VALUES (@id, @room_id, @invite_token, @created_by, @created_at, @expires_at)
  `).run({
    id: String(id),
    room_id: String(roomId),
    invite_token: String(inviteToken),
    created_by: String(createdBy),
    created_at: Date.now(),
    expires_at: expiresAt ? Number(expiresAt) : null,
  });
}

function getInviteByToken(token) {
  return db
    .prepare(`
      SELECT id, room_id as roomId, invite_token as inviteToken, created_by as createdBy, created_at as createdAt, expires_at as expiresAt, used_count as usedCount
      FROM room_invites
      WHERE invite_token = ? AND (expires_at IS NULL OR expires_at > ?)
    `)
    .get(String(token), Date.now());
}

function incrementInviteUsage(inviteId) {
  db.prepare(`
    UPDATE room_invites SET used_count = used_count + 1 WHERE id = ?
  `).run(String(inviteId));
}

function deleteExpiredInvites() {
  db.prepare(`
    DELETE FROM room_invites WHERE expires_at IS NOT NULL AND expires_at < ?
  `).run(Date.now());
}

// MESSAGE FUNCTIONS (enhanced)
function addMessageEnhanced({ id, room, userId, clientId, username, text, system, createdAt, replyToId }) {
  db.prepare(`
    INSERT INTO messages (id, room, user_id, client_id, username, text, system, created_at, reply_to_id)
    VALUES (@id, @room, @user_id, @client_id, @username, @text, @system, @created_at, @reply_to_id)
  `).run({
    id: String(id),
    room: String(room),
    user_id: userId ? String(userId) : null,
    client_id: clientId ? String(clientId) : null,
    username: username ?? null,
    text: String(text),
    system: system ? 1 : 0,
    created_at: typeof createdAt === "number" ? createdAt : Date.now(),
    reply_to_id: replyToId ? String(replyToId) : null,
  });
}

function getMessageWithReplies(messageId) {
  const msg = db
    .prepare(`
      SELECT id, room, user_id as userId, client_id as clientId, username, text, system, created_at as createdAt, edited_at as editedAt, deleted_at as deletedAt, deleted_for_all as deletedForAll, reply_to_id as replyToId
      FROM messages
      WHERE id = ?
    `)
    .get(String(messageId));

  if (msg && msg.replyToId) {
    msg.replyTo = db
      .prepare(`
        SELECT id, user_id as userId, username, text, created_at as createdAt
        FROM messages
        WHERE id = ?
      `)
      .get(String(msg.replyToId));
  }

  return msg;
}

function editMessage(messageId, newText) {
  db.prepare(`
    UPDATE messages SET text = ?, edited_at = ? WHERE id = ?
  `).run(String(newText), Date.now(), String(messageId));
}

function deleteMessageForUser(messageId, userId) {
  db.prepare(`
    UPDATE messages SET deleted_at = ? WHERE id = ? AND user_id = ?
  `).run(Date.now(), String(messageId), String(userId));
}

function deleteMessageForAll(messageId) {
  db.prepare(`
    UPDATE messages SET deleted_for_all = 1, deleted_at = ? WHERE id = ?
  `).run(Date.now(), String(messageId));
}

// MESSAGE STATUS FUNCTIONS
function upsertMessageStatus(messageId, userId, status) {
  db.prepare(`
    INSERT INTO message_status (message_id, user_id, status, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(message_id, user_id) DO UPDATE SET
      status=excluded.status,
      updated_at=excluded.updated_at
  `).run(String(messageId), String(userId), String(status), Date.now());
}

function getMessageStatus(messageId) {
  return db
    .prepare(`
      SELECT message_id as messageId, user_id as userId, status
      FROM message_status
      WHERE message_id = ?
      ORDER BY updated_at DESC
    `)
    .all(String(messageId));
}

module.exports = {
  db,

  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUserByIdentifier,

  storeRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  getRefreshTokenRecord,
  deleteExpiredRefreshTokens,

  upsertOtp,
  getOtp,
  deleteOtp,
  deleteExpiredOtps,

  addMessage,
  getRecentMessages,

  createRoom,
  getRoomById,
  deleteRoom,
  deleteOldRooms,

  createInvite,
  getInviteByToken,
  incrementInviteUsage,
  deleteExpiredInvites,

  addMessageEnhanced,
  getMessageWithReplies,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,

  upsertMessageStatus,
  getMessageStatus,
};

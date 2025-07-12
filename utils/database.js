/**
 * Database Manager for DaveBot V2
 * Handles SQLite database operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_PATH || './data/database.sqlite';
    }

    /**
     * Initialize database connection and create tables
     */
    async init() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    /**
     * Create all necessary tables
     */
    async createTables() {
        const tables = [
            // Users table for general user data
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                discriminator TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Age verification table
            `CREATE TABLE IF NOT EXISTS age_verification (
                user_id TEXT PRIMARY KEY,
                verified BOOLEAN DEFAULT FALSE,
                verification_date DATETIME,
                ban_expires DATETIME,
                attempts INTEGER DEFAULT 0,
                last_attempt DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Economy system
            `CREATE TABLE IF NOT EXISTS economy (
                user_id TEXT PRIMARY KEY,
                balance INTEGER DEFAULT 500,
                daily_streak INTEGER DEFAULT 0,
                last_daily DATETIME,
                last_work DATETIME,
                total_earned INTEGER DEFAULT 500,
                total_spent INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Leveling system
            `CREATE TABLE IF NOT EXISTS levels (
                user_id TEXT,
                guild_id TEXT,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                messages INTEGER DEFAULT 0,
                last_xp_gain DATETIME,
                PRIMARY KEY (user_id, guild_id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Hangman games
            `CREATE TABLE IF NOT EXISTS hangman_games (
                id TEXT PRIMARY KEY,
                channel_id TEXT,
                word TEXT,
                guessed_letters TEXT,
                wrong_guesses INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                participants TEXT,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )`,

            // Tickets system
            `CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                channel_id TEXT,
                user_id TEXT,
                category TEXT,
                status TEXT DEFAULT 'open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME,
                transcript TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Birthdays
            `CREATE TABLE IF NOT EXISTS birthdays (
                user_id TEXT PRIMARY KEY,
                birthday DATE,
                notify BOOLEAN DEFAULT TRUE,
                year INTEGER,
                timezone TEXT DEFAULT 'UTC',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Moderation logs
            `CREATE TABLE IF NOT EXISTS moderation_logs (
                id TEXT PRIMARY KEY,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                action TEXT,
                reason TEXT,
                duration INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (moderator_id) REFERENCES users (id)
            )`,

            // Trivia statistics
            `CREATE TABLE IF NOT EXISTS trivia_stats (
                user_id TEXT PRIMARY KEY,
                correct_answers INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                last_played DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // User inventory for shop items
            `CREATE TABLE IF NOT EXISTS user_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                item_id TEXT,
                item_name TEXT,
                item_type TEXT,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Lottery entries
            `CREATE TABLE IF NOT EXISTS lottery_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Guild configurations
            `CREATE TABLE IF NOT EXISTS guild_configs (
                guild_id TEXT PRIMARY KEY,
                config JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }
    }

    /**
     * Run a query that doesn't return data
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Get a single row
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Get all rows
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Create or update user
     */
    async upsertUser(user) {
        const existing = await this.get('SELECT id FROM users WHERE id = ?', [user.id]);
        
        if (existing) {
            await this.run(
                'UPDATE users SET username = ?, discriminator = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [user.username, user.discriminator, user.id]
            );
        } else {
            await this.run(
                'INSERT INTO users (id, username, discriminator) VALUES (?, ?, ?)',
                [user.id, user.username, user.discriminator]
            );
        }
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;
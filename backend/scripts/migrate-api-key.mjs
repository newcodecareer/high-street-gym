import mysql from "mysql2/promise"
import { DB_CONFIG } from "../models/DatabaseModel.mjs"

/**
 * Adds the column that stores the JSON API authentication key on each user.
 * The server-side views keep using a session cookie and are unaffected.
 *
 * Safe to run more than once: an existing column is reported and nothing
 * changes.
 */
async function main() {
    const connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
    })

    try {
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM users LIKE 'authentication_key'"
        )

        if (columns.length > 0) {
            console.log("✅ users already has authentication_key.")
            return
        }

        await connection.query(`
            ALTER TABLE users
            ADD COLUMN authentication_key VARCHAR(36) DEFAULT NULL,
            ADD UNIQUE KEY authentication_key_UNIQUE (authentication_key)
        `)

        console.log("✅ users can now hold an API authentication key.")
    } finally {
        await connection.end()
    }
}

main().catch(error => {
    console.error("❌ Migration failed:", error.message || error)
    process.exit(1)
})

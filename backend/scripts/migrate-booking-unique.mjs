import mysql from "mysql2/promise"
import { DB_CONFIG } from "../models/DatabaseModel.mjs"

/**
 * Adds the unique key that stops one member booking the same session twice.
 * The key cannot be created while duplicates exist, so each pair keeps its
 * oldest booking and the later copies are removed first.
 *
 * Safe to run more than once: an existing key is reported and nothing changes.
 */
async function main() {
    const connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
    })

    try {
        const [indexes] = await connection.query(
            "SHOW INDEX FROM bookings WHERE Key_name = 'booking_session_member_UNIQUE'"
        )

        if (indexes.length > 0) {
            console.log("✅ bookings already has booking_session_member_UNIQUE.")
            return
        }

        const [duplicates] = await connection.query(`
            SELECT session_id, member_id, GROUP_CONCAT(id ORDER BY id) AS ids
            FROM bookings
            GROUP BY session_id, member_id
            HAVING COUNT(*) > 1
        `)

        for (const duplicate of duplicates) {
            const surplus = duplicate.ids.split(",").map(Number).slice(1)

            console.log(`   Removing duplicate booking(s) ${surplus.join(", ")} for session ${duplicate.session_id}, member ${duplicate.member_id}.`)
            await connection.query("DELETE FROM bookings WHERE id IN (?)", [surplus])
        }

        await connection.query(
            "ALTER TABLE bookings ADD UNIQUE KEY booking_session_member_UNIQUE (session_id, member_id)"
        )

        console.log(`✅ Duplicate bookings can no longer be created (${duplicates.length} pair(s) cleaned up).`)
    } finally {
        await connection.end()
    }
}

main().catch(error => {
    console.error("❌ Migration failed:", error.message || error)
    process.exit(1)
})

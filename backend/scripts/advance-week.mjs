import mysql from "mysql2/promise"
import { DB_CONFIG } from "../models/DatabaseModel.mjs"

/**
 * Moves every session forward by whole weeks so the newest seeded week becomes
 * the current week. The timetable only shows the current week, so without this
 * it empties out as soon as a new week starts.
 *
 * Dates are shifted rather than re-seeded, so session ids stay the same and the
 * existing bookings keep pointing at the right classes. Safe to run more than
 * once: if the current week already has sessions, nothing changes.
 */
async function main() {
    const connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        dateStrings: true,
    })

    try {
        const currentMonday = mondayOf(new Date())
        const currentSunday = addDays(currentMonday, 6)

        const [current] = await connection.query(
            "SELECT COUNT(*) AS n FROM sessions WHERE deleted = 0 AND date BETWEEN ? AND ?",
            [toMySqlDate(currentMonday), toMySqlDate(currentSunday)]
        )

        if (current[0].n > 0) {
            console.log(`✅ The current week (${toMySqlDate(currentMonday)} to ${toMySqlDate(currentSunday)}) already has ${current[0].n} session(s). Nothing to do.`)
            return
        }

        const [rows] = await connection.query(
            "SELECT MIN(date) AS first, MAX(date) AS last FROM sessions WHERE deleted = 0"
        )

        if (rows[0].first === null) {
            console.log("❌ There are no sessions to move. Run `npm run setup-db` to seed them.")
            return
        }

        // Whole weeks between the newest session week and the current one.
        const newestMonday = mondayOf(parseMySqlDate(rows[0].last))
        const weeks = Math.round((currentMonday - newestMonday) / (7 * 24 * 60 * 60 * 1000))

        if (weeks <= 0) {
            console.log(`✅ The newest session (${rows[0].last}) is already this week or later. Nothing to do.`)
            return
        }

        await connection.query(
            `UPDATE sessions SET date = DATE_ADD(date, INTERVAL ${weeks} WEEK) WHERE deleted = 0`
        )

        const [after] = await connection.query(
            "SELECT MIN(date) AS first, MAX(date) AS last, COUNT(*) AS n FROM sessions WHERE deleted = 0"
        )

        console.log(`✅ Moved ${after[0].n} session(s) forward ${weeks} week(s).`)
        console.log(`   Sessions now run from ${after[0].first} to ${after[0].last}.`)
        console.log(`   The current week is ${toMySqlDate(currentMonday)} to ${toMySqlDate(currentSunday)}.`)
    } finally {
        await connection.end()
    }
}

/** The Monday of the week that contains `date`, at local midnight. */
function mondayOf(date) {
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    return monday
}

function addDays(date, days) {
    const copy = new Date(date)
    copy.setDate(date.getDate() + days)
    return copy
}

/** Parse a MySQL "YYYY-MM-DD" date as local time, not UTC. */
function parseMySqlDate(value) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
}

function toMySqlDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

main().catch(error => {
    console.error("❌ Advancing the week failed:", error.message || error)
    process.exit(1)
})

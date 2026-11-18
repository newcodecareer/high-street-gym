 import mysql from "mysql2/promise"

/** Database connection settings. */
export const DB_CONFIG = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "high-street-gym",
}

/**
 * Base class for the models. It owns the shared pool and the query helpers.
 * `nestTables` gives each joined table its own key, and `dateStrings` keeps
 * dates as strings so they can be compared as text.
 */
export class DatabaseModel {
    /** The shared MySQL connection pool, created once when the class loads. */
    static connection;

    static {
        this.connection = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: DB_CONFIG.database,
            nestTables: true,
            dateStrings: true,
        })
    }

    static query(sql, values) {
        return this.connection.query(sql, values).then(([result]) => result)
    }

    /**
     * Wrap a term in wildcards, escaping "%" and "_".
     * @param {string} term
     * @returns {string}
     */
    static toLikePattern(term) {
        const escaped = String(term).replace(/[\\%_]/g, character => `\\${character}`)

        return `%${escaped}%`
    }

    /**
     * Formats a JavaScript Date object into a MySQL compatible "YYYY-MM-DD"
     * date string.
     * @param {Date} date
     * @returns {string}
     */
    static toMySqlDate(date) {
        const year = date.toLocaleString("default", { year: "numeric" });
        const month = date.toLocaleString("default", { month: "2-digit" });
        const day = date.toLocaleString("default", { day: "2-digit" });

        return [year, month, day].join("-");
    }

    /**
     * Formats a JavaScript Date object into a MySQL compatible
     * "YYYY-MM-DD HH:MM:SS" datetime string.
     * @param {Date} date
     * @returns {string}
     */
    static toMySqlDateTime(date) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${this.toMySqlDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
}

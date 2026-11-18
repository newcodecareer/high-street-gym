import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"
import { DB_CONFIG } from "../models/DatabaseModel.mjs"

const DATABASE_NAME = DB_CONFIG.database

const SCHEMA = `
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password VARCHAR(70) NOT NULL,
    role ENUM('member','trainer','admin') NOT NULL DEFAULT 'member',
    deleted TINYINT NOT NULL DEFAULT 0,
    authentication_key VARCHAR(36) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    UNIQUE KEY email_UNIQUE (email),
    UNIQUE KEY authentication_key_UNIQUE (authentication_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activities (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(600) DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE locations (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    address VARCHAR(200) DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
    id INT NOT NULL AUTO_INCREMENT,
    activity_id INT NOT NULL,
    location_id INT NOT NULL,
    trainer_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 20,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    KEY session_activity_fk (activity_id),
    KEY session_location_fk (location_id),
    KEY session_trainer_fk (trainer_id),
    CONSTRAINT session_activity_fk FOREIGN KEY (activity_id) REFERENCES activities (id),
    CONSTRAINT session_location_fk FOREIGN KEY (location_id) REFERENCES locations (id),
    CONSTRAINT session_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
    id INT NOT NULL AUTO_INCREMENT,
    session_id INT NOT NULL,
    member_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    UNIQUE KEY booking_session_member_UNIQUE (session_id, member_id),
    KEY booking_session_fk (session_id),
    KEY booking_member_fk (member_id),
    CONSTRAINT booking_session_fk FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
    CONSTRAINT booking_member_fk FOREIGN KEY (member_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posts (
    id INT NOT NULL AUTO_INCREMENT,
    member_id INT NOT NULL,
    subject VARCHAR(120) NOT NULL,
    body VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    KEY post_member_fk (member_id),
    CONSTRAINT post_member_fk FOREIGN KEY (member_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

function toMySqlDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

/** Returns the seven dates (Monday..Sunday) of the current week. */
function currentWeekDates() {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)

    const dates = []
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday)
        day.setDate(monday.getDate() + i)
        dates.push(toMySqlDate(day))
    }
    return dates
}

async function main() {
    const connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        multipleStatements: true,
    })

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\``)
        await connection.query(`USE \`${DATABASE_NAME}\``)
        await connection.query(SCHEMA)

        const passwordHash = bcrypt.hashSync("password")

        // Users
        const insertUser = async (first, last, email, role) => {
            const [result] = await connection.query(
                "INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)",
                [first, last, email, passwordHash, role]
            )
            return result.insertId
        }

        const adminId = await insertUser("Grace", "Admin", "admin@hsgym.com", "admin")
        const liamId = await insertUser("Liam", "Brooks", "liam@hsgym.com", "trainer")
        const sarahId = await insertUser("Sarah", "Nguyen", "sarah@hsgym.com", "trainer")
        const jackId = await insertUser("Jack", "Smith", "jack@hsgym.com", "trainer")
        const emmaId = await insertUser("Emma", "Wilson", "emma@hsgym.com", "trainer")
        const benId = await insertUser("Ben", "Taylor", "ben@hsgym.com", "trainer")
        const chloeId = await insertUser("Chloe", "Harris", "chloe@hsgym.com", "trainer")
        const mattId = await insertUser("Matt", "Kelly", "matt@hsgym.com", "trainer")
        const priyaId = await insertUser("Priya", "Sharma", "priya@hsgym.com", "trainer")
        const avaId = await insertUser("Ava", "Smith", "ava@hsgym.com", "member")
        const ethanId = await insertUser("Ethan", "Wilson", "ethan@hsgym.com", "member")
        const miaId = await insertUser("Mia", "Taylor", "mia@hsgym.com", "member")

        // Activities
        const insertActivity = async (name, description) => {
            const [result] = await connection.query(
                "INSERT INTO activities (name, description) VALUES (?, ?)",
                [name, description]
            )
            return result.insertId
        }

        const yogaId = await insertActivity("Yoga", "A calming flow to build strength and flexibility.")
        const pilatesId = await insertActivity("Pilates", "Core-focused mat work for posture and control.")
        const absId = await insertActivity("Abs", "A quick, high-intensity core blast.")
        const hiitId = await insertActivity("HIIT", "High-intensity interval training for maximum burn.")
        const cyclingId = await insertActivity("Indoor Cycling", "A high-energy ride to the beat.")
        const boxingId = await insertActivity("Boxing", "Pads, footwork and conditioning.")
        const zumbaId = await insertActivity("Zumba", "Dance your way to fitness.")

        // Locations
        const insertLocation = async (name, address) => {
            const [result] = await connection.query(
                "INSERT INTO locations (name, address) VALUES (?, ?)",
                [name, address]
            )
            return result.insertId
        }

        const ashgroveId = await insertLocation("Ashgrove", "240 Waterworks Rd, Ashgrove QLD 4060")
        const brisbaneCityId = await insertLocation("Brisbane City", "123 Adelaide St, Brisbane QLD 4000")
        const chermsideId = await insertLocation("Chermside", "Gympie Rd, Chermside QLD 4032")
        const gracevilleId = await insertLocation("Graceville", "310 Honour Ave, Graceville QLD 4075")
        const westlakeId = await insertLocation("Westlake", "4 Lakeview Ave, Westlake QLD 4074")

        // Sessions (scheduled across the current week)
        const [mon, tue, wed, thu, fri, sat, sun] = currentWeekDates()

        const insertSession = async (activityId, locationId, trainerId, date, start, end, capacity) => {
            const [result] = await connection.query(
                "INSERT INTO sessions (activity_id, location_id, trainer_id, date, start_time, end_time, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [activityId, locationId, trainerId, date, start, end, capacity]
            )
            return result.insertId
        }

        // Eight trainers across the week; nobody is double-booked.
        const sessionIds = []
        sessionIds.push(await insertSession(yogaId, ashgroveId, liamId, mon, "07:00:00", "08:00:00", 20))
        sessionIds.push(await insertSession(hiitId, brisbaneCityId, emmaId, mon, "18:00:00", "19:00:00", 25))
        sessionIds.push(await insertSession(hiitId, gracevilleId, jackId, mon, "18:00:00", "19:00:00", 20))
        sessionIds.push(await insertSession(pilatesId, chermsideId, sarahId, tue, "09:00:00", "10:00:00", 18))
        sessionIds.push(await insertSession(boxingId, westlakeId, benId, tue, "17:30:00", "18:30:00", 15))
        sessionIds.push(await insertSession(cyclingId, brisbaneCityId, chloeId, tue, "06:00:00", "07:00:00", 30))
        sessionIds.push(await insertSession(absId, ashgroveId, mattId, wed, "12:00:00", "12:45:00", 15))
        sessionIds.push(await insertSession(zumbaId, gracevilleId, priyaId, wed, "18:00:00", "19:00:00", 30))
        sessionIds.push(await insertSession(yogaId, brisbaneCityId, liamId, wed, "07:00:00", "08:00:00", 20))
        sessionIds.push(await insertSession(hiitId, chermsideId, emmaId, thu, "06:30:00", "07:30:00", 25))
        sessionIds.push(await insertSession(cyclingId, westlakeId, jackId, thu, "18:00:00", "19:00:00", 25))
        sessionIds.push(await insertSession(pilatesId, ashgroveId, sarahId, thu, "10:00:00", "11:00:00", 18))
        sessionIds.push(await insertSession(boxingId, brisbaneCityId, benId, fri, "17:00:00", "18:00:00", 15))
        sessionIds.push(await insertSession(zumbaId, chermsideId, chloeId, fri, "18:00:00", "19:00:00", 30))
        sessionIds.push(await insertSession(absId, westlakeId, mattId, fri, "12:00:00", "12:45:00", 15))
        sessionIds.push(await insertSession(yogaId, gracevilleId, priyaId, sat, "08:00:00", "09:00:00", 20))
        sessionIds.push(await insertSession(hiitId, ashgroveId, liamId, sat, "09:30:00", "10:30:00", 25))
        sessionIds.push(await insertSession(zumbaId, brisbaneCityId, sarahId, sat, "11:00:00", "12:00:00", 30))
        sessionIds.push(await insertSession(pilatesId, westlakeId, jackId, sun, "09:00:00", "10:00:00", 18))
        sessionIds.push(await insertSession(yogaId, chermsideId, emmaId, sun, "10:30:00", "11:30:00", 20))
        sessionIds.push(await insertSession(absId, brisbaneCityId, benId, sun, "16:00:00", "16:45:00", 15))

        // Posts
        const insertPost = async (memberId, subject, body) => {
            await connection.query(
                "INSERT INTO posts (member_id, subject, body, created_at) VALUES (?, ?, ?, NOW())",
                [memberId, subject, body]
            )
        }
        await insertPost(avaId, "First HIIT class done!", "Survived my first HIIT class at Brisbane City. Absolutely wrecked but keen for next week.")
        await insertPost(ethanId, "Monday morning yoga", "Did the 7am yoga at Ashgrove today. Good way to start the week, would recommend.")
        await insertPost(miaId, "Pilates is harder than it looks", "Who knew lying on a mat could be this hard? Core is on fire. Thanks Sarah for the class!")

        // Bookings
        const insertBooking = async (sessionId, memberId) => {
            await connection.query(
                "INSERT INTO bookings (session_id, member_id, created_at) VALUES (?, ?, NOW())",
                [sessionId, memberId]
            )
        }
        await insertBooking(sessionIds[0], avaId)
        await insertBooking(sessionIds[1], ethanId)
        await insertBooking(sessionIds[4], avaId)

        console.log("✅ Database setup complete.")
        console.log(`   Database: ${DATABASE_NAME}`)
        console.log("")
        console.log("   Demo accounts (password for all: password)")
        console.log("   - admin@hsgym.com  (admin)")
        console.log("   - liam@hsgym.com   (trainer)")
        console.log("   - sarah@hsgym.com  (trainer)")
        console.log("   - ava@hsgym.com    (member)")
    } finally {
        await connection.end()
    }
}

main().catch(error => {
    console.error("❌ Database setup failed:", error.message || error)
    process.exit(1)
})

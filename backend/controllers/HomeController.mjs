import express from "express"
import { SessionDetailModel } from "../models/SessionDetailModel.mjs"
import { SessionModel } from "../models/SessionModel.mjs"

/** Public pages, plus the dashboard redirect. */
export class HomeController {
    /** Mounted at the root. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.redirectToTimetable)
        this.routes.get("/timetable", this.viewTimetable)
        this.routes.get("/dashboard", this.viewDashboard)
    }

    /**
     * @type {express.RequestHandler}
     */
    static redirectToTimetable(req, res) {
        res.redirect("/timetable")
    }

    /**
     * Redirect a signed-in user to their role's dashboard.
     * @type {express.RequestHandler}
     */
    static viewDashboard(req, res) {
        const role = req.authenticatedUser?.role

        if (role == "member") {
            res.redirect("/bookings")
        } else if (role == "trainer") {
            res.redirect("/trainer")
        } else if (role == "admin") {
            res.redirect("/admin")
        } else {
            res.redirect("/authenticate/login")
        }
    }

    /**
     * Weekly calendar of every session, viewable by any visitor.
     * @type {express.RequestHandler}
     */
    static viewTimetable(req, res) {
        const days = HomeController.currentWeek()
        const start = days[0].date
        const end = days[6].date

        SessionDetailModel.getByDateRange(start, end)
            .then(sessions => {
                HomeController.groupSessionsIntoDays(days, sessions)
                // Past days stay in the week; their Book button is disabled.
                res.render("timetable.ejs", { days, hasStarted: SessionModel.hasStarted })
            })
            .catch(error => {
                console.error(error)
                res.render("status.ejs", {
                    status: "Database Error",
                    message: "The timetable could not be loaded."
                })
            })
    }

    /**
     * Builds the seven days of the current week (Monday to Sunday).
     * @returns {Array<{name: string, short: string, date: string}>}
     */
    static currentWeek() {
        const today = new Date()
        const monday = new Date(today)
        const offset = (today.getDay() + 6) % 7 // Monday = 0 ... Sunday = 6
        monday.setDate(today.getDate() - offset)
        monday.setHours(0, 0, 0, 0)

        const days = []
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday)
            day.setDate(monday.getDate() + i)
            days.push({
                name: day.toLocaleDateString("en-au", { weekday: "long" }),
                short: day.toLocaleDateString("en-au", { weekday: "short" }),
                date: SessionDetailModel.toMySqlDate(day),
                sessions: [],
            })
        }
        return days
    }

    /**
     * Places each session into its matching day entry in `days`.
     * @param {Array<{sessions: Array}>} days
     * @param {Array<SessionDetailModel>} sessions
     */
    static groupSessionsIntoDays(days, sessions) {
        for (const sessionDetail of sessions) {
            const day = days.find(d => d.date == sessionDetail.session.date)
            if (day) {
                day.sessions.push(sessionDetail)
            }
        }
    }
}

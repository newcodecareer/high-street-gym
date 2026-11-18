import express from "express"
import { AuthenticationController } from "./AuthenticationController.mjs"
import { ActivityModel } from "../models/ActivityModel.mjs"
import { LocationModel } from "../models/LocationModel.mjs"
import { SessionModel } from "../models/SessionModel.mjs"
import { SessionDetailModel } from "../models/SessionDetailModel.mjs"
import { Validation } from "../utils/Validation.mjs"

/** The actions the session form is allowed to submit. */
const TRAINER_ACTIONS = ["create", "update", "delete"]

/** Only trainers use these routes; admins have /admin/sessions. */
const TRAINERS_ONLY = AuthenticationController.restrict(["trainer"])

/** The trainer's own sessions: search, create, edit and delete. */
export class TrainerController {
    /** Mounted under /trainer; only the trainer role may reach it. */
    static routes = express.Router()

    static {
        this.routes.get("/", TRAINERS_ONLY, this.viewSessions)
        this.routes.get("/:id", TRAINERS_ONLY, this.viewSessions)
        this.routes.post("/", TRAINERS_ONLY, this.handleSessions)
        this.routes.post("/:id", TRAINERS_ONLY, this.handleSessions)
    }

    //// Sessions

    /**
     * Lists the signed-in trainer's sessions and, when an ":id" is present,
     * preloads that session into the edit form.
     * @type {express.RequestHandler}
     */
    static async viewSessions(req, res) {
        try {
            const searchTerm = Validation.searchTerm(req.query.search_term)
            const ownSessions = await SessionDetailModel.getByTrainerId(req.authenticatedUser.id)
            const sessions = searchTerm
                ? ownSessions.filter(session => TrainerController.#matches(session, searchTerm))
                : ownSessions

            const [activities, locations] = await Promise.all([
                ActivityModel.getAll(),
                LocationModel.getAll(),
            ])

            // Look the id up in the trainer's own list, so another trainer's
            // session cannot be preloaded.
            const selectedSession = sessions.find(s => s.session.id == req.params.id)?.session
                ?? new SessionModel(null, "", "", "", "", "", "", 20)

            res.render("trainer/sessions.ejs", {
                sessions,
                selectedSession,
                activities,
                locations,
                searchTerm,
                // Cosmetic: hide Edit for started sessions and set the date minimum.
                hasStarted: SessionModel.hasStarted,
                today: SessionModel.toMySqlDate(new Date()),
            })
        } catch (error) {
            console.error(error)
            res.render("status.ejs", { status: "Database Error", message: "Your sessions could not be loaded." })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async handleSessions(req, res) {
        const action = TrainerController.#action(req, res)
        if (action === null) return

        try {
            // Resolve and authorise the target first. Create has no target.
            let id = null
            if (action != "create") {
                id = TrainerController.#idParam(req, res)
                if (id === null) return

                const existing = await TrainerController.#ownedSession(id, req, res)
                if (!existing) return

                // A started session can be deleted but not changed.
                if (action == "update" && SessionModel.hasStarted(existing)) {
                    res.status(400).render("status.ejs", {
                        status: "Invalid Input",
                        message: "This session has already started and can no longer be changed."
                    })
                    return
                }
            }

            if (action == "delete") {
                await SessionModel.delete(id)
                res.redirect("/trainer")
                return
            }

            const values = TrainerController.#accept(req, res, {
                activityId: Validation.integer("Activity", { min: 1 }),
                locationId: Validation.integer("Location", { min: 1 }),
                date: Validation.date("Date"),
                startTime: Validation.time("Start time"),
                endTime: Validation.time("End time"),
                capacity: Validation.integer("Capacity", { min: 1, max: 500 })
            })
            if (!values) return

            // Both times are HH:MM:SS, so string comparison works.
            if (values.endTime <= values.startTime) {
                res.status(400).render("status.ejs", {
                    status: "Invalid Input",
                    message: "The end time must be after the start time."
                })
                return
            }

            // A session cannot be created or moved into the past.
            if (SessionModel.hasStarted(values)) {
                res.status(400).render("status.ejs", {
                    status: "Invalid Input",
                    message: "A session cannot start in the past."
                })
                return
            }

            // Take the trainer from the session, not the form.
            const session = new SessionModel(
                id,
                values.activityId,
                values.locationId,
                req.authenticatedUser.id,
                values.date,
                values.startTime,
                values.endTime,
                values.capacity
            )

            if (action == "create") {
                await SessionModel.create(session)
            } else {
                await SessionModel.update(session)
            }

            res.redirect("/trainer")
        } catch (error) {
            console.error(error)
            res.status(500).render("status.ejs", { status: "Database Error", message: "The session could not be saved." })
        }
    }

    //// Helpers

    /**
     * Validate the action submitted by the form.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {string | null} the action, or null once a 400 has been rendered
     */
    static #action(req, res) {
        const { values, isValid } = Validation.run(req.body, {
            action: Validation.choice("Action", TRAINER_ACTIONS)
        })

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Invalid Action",
                message: "The form doesn't support this action."
            })
            return null
        }

        return values.action
    }

    /**
     * Validate a submission and render the error page if it fails.
     * @param {express.Request} req
     * @param {express.Response} res
     * @param {Record<string, import("../utils/Validation.mjs").Rule>} fields
     * @returns {Record<string, any> | null} the sanitised values, or null once
     *          the rejection has already been rendered
     */
    static #accept(req, res, fields) {
        const { values, errors, isValid } = Validation.run(req.body, fields)

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Invalid Input",
                message: Validation.summarise(errors)
            })
            return null
        }

        return values
    }

    /**
     * Validate the ":id" route parameter.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {number | null} the identifier, or null once a 404 has been rendered
     */
    static #idParam(req, res) {
        const id = Validation.toId(req.params.id)

        if (id === null) {
            res.status(404).render("status.ejs", {
                status: "Not Found",
                message: "The requested record does not exist."
            })
        }

        return id
    }

    /**
     * Load a session and confirm the signed-in trainer leads it.
     * @param {number} id
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {Promise<SessionModel | null>} the session, or null once a 404
     *          has been rendered
     */
    static async #ownedSession(id, req, res) {
        const session = await SessionModel.getById(id).catch(() => null)

        // 404 rather than 403, so the response does not confirm the id exists.
        if (!session || session.trainerId != req.authenticatedUser.id) {
            res.status(404).render("status.ejs", {
                status: "Not Found",
                message: "The requested session does not exist."
            })
            return null
        }

        return session
    }

    /**
     * Match a session against the search term.
     * @param {SessionDetailModel} sessionDetail
     * @param {string} term
     * @returns {boolean}
     */
    static #matches(sessionDetail, term) {
        const haystack = [
            sessionDetail.activity.name,
            sessionDetail.location.name,
            sessionDetail.session.date,
        ].join(" ").toLowerCase()

        return haystack.includes(term.toLowerCase())
    }
}

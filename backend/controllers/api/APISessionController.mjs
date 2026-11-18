import express from "express"
import { APIAuthenticationController } from "./APIAuthenticationController.mjs"
import { BookingModel } from "../../models/BookingModel.mjs"
import { SessionModel } from "../../models/SessionModel.mjs"
import { SessionDetailModel } from "../../models/SessionDetailModel.mjs"
import { Validation } from "../../utils/Validation.mjs"

/**
 * @openapi
 * /api/sessions:
 *   get:
 *     summary: List sessions for a date range (defaults to the current week)
 *     tags: [Sessions]
 *     parameters:
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       '200':
 *         description: Sessions in the range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionList'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create a session for the signed-in trainer
 *     tags: [Sessions]
 *     security:
 *       - ApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionInput'
 *     responses:
 *       '201':
 *         $ref: '#/components/responses/Created'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/sessions/mine:
 *   get:
 *     summary: List the signed-in trainer's sessions
 *     tags: [Sessions]
 *     security:
 *       - ApiKey: []
 *     responses:
 *       '200':
 *         description: The trainer's sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SessionDetail'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/sessions/xml:
 *   get:
 *     summary: Export the signed-in trainer's sessions for a week as XML
 *     tags: [Sessions]
 *     security:
 *       - ApiKey: []
 *     parameters:
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/SessionsXML'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/sessions/{id}:
 *   put:
 *     summary: Update one of the signed-in trainer's sessions
 *     tags: [Sessions]
 *     security:
 *       - ApiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionInput'
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     summary: Delete one of the signed-in trainer's sessions
 *     tags: [Sessions]
 *     security:
 *       - ApiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/Message'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/** The weekly timetable, plus a trainer's own sessions and their XML export. */
export class APISessionController {
    /** Mounted under /api/sessions. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.getSessions)
        this.routes.get("/mine", APIAuthenticationController.restrict(["trainer"]), this.getMySessions)
        this.routes.get("/xml", APIAuthenticationController.restrict(["trainer"]), this.getSessionsXML)
        this.routes.post("/", APIAuthenticationController.restrict(["trainer"]), this.createSession)
        this.routes.put("/:id", APIAuthenticationController.restrict(["trainer"]), this.updateSession)
        this.routes.delete("/:id", APIAuthenticationController.restrict(["trainer"]), this.deleteSession)
    }

    /**
     * Sessions in a date range, defaulting to the current week. Each session
     * also carries its booking count, so the app can show a full class, and a
     * "booked" flag for the signed-in member.
     * @type {express.RequestHandler}
     */
    static async getSessions(req, res) {
        const range = APISessionController.#range(req, res)
        if (!range) return

        try {
            const [sessions, bookings] = await Promise.all([
                SessionDetailModel.getByDateRange(range.start, range.end),
                BookingModel.getByDateRange(range.start, range.end)
            ])

            const bookedCounts = new Map()
            for (const booking of bookings) {
                bookedCounts.set(booking.sessionId, (bookedCounts.get(booking.sessionId) ?? 0) + 1)
            }

            const memberBookings = new Set()
            if (req.authenticatedUser?.role == "member") {
                const mine = await BookingModel.getByMemberId(req.authenticatedUser.id)
                for (const booking of mine) {
                    memberBookings.add(booking.sessionId)
                }
            }

            res.status(200).json({
                start: range.start,
                end: range.end,
                sessions: sessions.map(detail => ({
                    ...detail,
                    bookedCount: bookedCounts.get(detail.session.id) ?? 0,
                    booked: memberBookings.has(detail.session.id)
                }))
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Sessions could not be loaded."
            })
        }
    }

    /**
     * Every session led by the signed-in trainer.
     * @type {express.RequestHandler}
     */
    static async getMySessions(req, res) {
        try {
            res.status(200).json(await SessionDetailModel.getByTrainerId(req.authenticatedUser.id))
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Sessions could not be loaded."
            })
        }
    }

    /**
     * The trainer's sessions for the current week, as calendar XML.
     * @type {express.RequestHandler}
     */
    static async getSessionsXML(req, res) {
        const range = APISessionController.#range(req, res)
        if (!range) return

        try {
            const sessions = await SessionDetailModel.getByTrainerIdAndDateRange(
                req.authenticatedUser.id,
                range.start,
                range.end
            )

            res.type("application/xml").render("xml/sessions.xml.ejs", {
                trainer: req.authenticatedUser,
                start: range.start,
                end: range.end,
                exportDate: SessionModel.toMySqlDate(new Date()),
                sessions
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Sessions could not be exported."
            })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async createSession(req, res) {
        const values = APISessionController.#acceptedValues(req, res)
        if (!values) return

        try {
            const result = await SessionModel.create(new SessionModel(
                null,
                values.activityId,
                values.locationId,
                req.authenticatedUser.id,
                values.date,
                values.startTime,
                values.endTime,
                values.capacity
            ))

            res.status(201).json({
                id: result.insertId,
                message: "Session created."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Session could not be created."
            })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async updateSession(req, res) {
        const session = await APISessionController.#ownedSession(req, res)
        if (!session) return

        if (SessionModel.hasStarted(session)) {
            res.status(400).json({
                message: "This session has already started and can no longer be changed."
            })
            return
        }

        const values = APISessionController.#acceptedValues(req, res)
        if (!values) return

        try {
            await SessionModel.update(new SessionModel(
                session.id,
                values.activityId,
                values.locationId,
                req.authenticatedUser.id,
                values.date,
                values.startTime,
                values.endTime,
                values.capacity
            ))

            res.status(200).json({
                id: session.id,
                message: "Session updated."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Session could not be updated."
            })
        }
    }

    /**
     * @type {express.RequestHandler}
     */
    static async deleteSession(req, res) {
        const session = await APISessionController.#ownedSession(req, res)
        if (!session) return

        try {
            await SessionModel.delete(session.id)
            res.status(200).json({
                message: "Session deleted."
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Session could not be deleted."
            })
        }
    }

    //// Helpers

    /**
     * Read the optional date range from the query string, or fall back to the
     * current week. Sends a 400 and returns null when a date is malformed.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {{start: string, end: string} | null}
     */
    static #range(req, res) {
        if (req.query.start === undefined && req.query.end === undefined) {
            return APISessionController.#currentWeek()
        }

        const { values, errors, isValid } = Validation.run(req.query, {
            start: Validation.date("Start date"),
            end: Validation.date("End date")
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return null
        }

        if (values.start > values.end) {
            res.status(400).json({
                message: "The start date must be on or before the end date."
            })
            return null
        }

        return values
    }

    /**
     * @returns {{start: string, end: string}} Monday to Sunday, as MySQL dates
     */
    static #currentWeek() {
        const today = new Date()
        const monday = new Date(today)
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
        monday.setHours(0, 0, 0, 0)

        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        return {
            start: SessionModel.toMySqlDate(monday),
            end: SessionModel.toMySqlDate(sunday)
        }
    }

    /**
     * Validate a session submission, including the cross-field rules. Sends a
     * 400 and returns null when it is not acceptable.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {{activityId: number, locationId: number, date: string, startTime: string, endTime: string, capacity: number} | null}
     */
    static #acceptedValues(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            activityId: Validation.integer("Activity", { min: 1 }),
            locationId: Validation.integer("Location", { min: 1 }),
            date: Validation.date("Date"),
            startTime: Validation.time("Start time"),
            endTime: Validation.time("End time"),
            capacity: Validation.integer("Capacity", { min: 1, max: 500 })
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return null
        }

        // Both times are HH:MM:SS, so string comparison works.
        if (values.endTime <= values.startTime) {
            res.status(400).json({
                message: "The end time must be after the start time."
            })
            return null
        }

        if (SessionModel.hasStarted(values)) {
            res.status(400).json({
                message: "A session cannot start in the past."
            })
            return null
        }

        return values
    }

    /**
     * Load the ":id" session and confirm the trainer leads it. Sends a 404 and
     * returns null otherwise.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {Promise<SessionModel | null>}
     */
    static async #ownedSession(req, res) {
        const id = Validation.toId(req.params.id)

        if (id === null) {
            res.status(404).json({
                message: "Session not found."
            })
            return null
        }

        const session = await SessionModel.getById(id).catch(() => null)

        // 404 rather than 403, so the response does not confirm the id exists.
        if (!session || session.trainerId != req.authenticatedUser.id) {
            res.status(404).json({
                message: "Session not found."
            })
            return null
        }

        return session
    }
}

import express from "express"
import { APIAuthenticationController } from "./APIAuthenticationController.mjs"
import { BookingModel } from "../../models/BookingModel.mjs"
import { BookingDetailModel } from "../../models/BookingDetailModel.mjs"
import { SessionModel } from "../../models/SessionModel.mjs"
import { Validation } from "../../utils/Validation.mjs"

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: List the signed-in member's bookings
 *     tags: [Bookings]
 *     security:
 *       - ApiKey: []
 *     responses:
 *       '200':
 *         description: The member's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookingDetail'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Book the signed-in member into a session
 *     tags: [Bookings]
 *     security:
 *       - ApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       '201':
 *         $ref: '#/components/responses/Created'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/bookings/xml:
 *   get:
 *     summary: Export the signed-in member's bookings as XML
 *     tags: [Bookings]
 *     security:
 *       - ApiKey: []
 *     responses:
 *       '200':
 *         $ref: '#/components/responses/BookingsXML'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 * /api/bookings/{id}:
 *   delete:
 *     summary: Cancel a booking (members cancel their own; admins cancel any)
 *     tags: [Bookings]
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

/** A member's bookings: list, create, cancel and export. */
export class APIBookingController {
    /** Mounted under /api/bookings. */
    static routes = express.Router()

    static {
        this.routes.get("/", APIAuthenticationController.restrict(["member"]), this.getBookings)
        this.routes.get("/xml", APIAuthenticationController.restrict(["member"]), this.getBookingsXML)
        this.routes.post("/", APIAuthenticationController.restrict(["member"]), this.createBooking)
        this.routes.delete("/:id", APIAuthenticationController.restrict(["member", "admin"]), this.cancelBooking)
    }

    /**
     * The signed-in member's bookings, with session, activity and trainer.
     * @type {express.RequestHandler}
     */
    static async getBookings(req, res) {
        try {
            res.status(200).json(await BookingDetailModel.getByMemberId(req.authenticatedUser.id))
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Bookings could not be loaded."
            })
        }
    }

    /**
     * All of the member's bookings as XML, including the activity details.
     * The newest session comes first.
     * @type {express.RequestHandler}
     */
    static async getBookingsXML(req, res) {
        try {
            const bookings = (await BookingDetailModel.getByMemberId(req.authenticatedUser.id))
                .sort((a, b) => `${b.session.date} ${b.session.startTime}`
                    .localeCompare(`${a.session.date} ${a.session.startTime}`))

            res.type("application/xml").render("xml/bookings.xml.ejs", {
                member: req.authenticatedUser,
                exportDate: SessionModel.toMySqlDate(new Date()),
                bookings
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Bookings could not be exported."
            })
        }
    }

    /**
     * Book the signed-in member into a session, enforcing the same rules as
     * the server-side booking form.
     * @type {express.RequestHandler}
     */
    static async createBooking(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            sessionId: Validation.integer("Session", { min: 1 })
        })

        if (!isValid) {
            res.status(400).json({
                message: Validation.summarise(errors)
            })
            return
        }

        const memberId = req.authenticatedUser.id

        try {
            const session = await SessionModel.getById(values.sessionId).catch(() => null)

            if (!session) {
                res.status(404).json({
                    message: "Session not found."
                })
                return
            }

            if (SessionModel.hasStarted(session)) {
                res.status(400).json({
                    message: "This session has already started."
                })
                return
            }

            const duplicate = await BookingModel.getBySessionAndMember(values.sessionId, memberId)
            if (duplicate) {
                res.status(409).json({
                    message: "You have already booked this session."
                })
                return
            }

            const existing = await BookingModel.getBySessionId(values.sessionId)
            if (existing.length >= session.capacity) {
                res.status(400).json({
                    message: "This session is fully booked."
                })
                return
            }

            const result = await BookingModel.create(new BookingModel(
                null,
                values.sessionId,
                memberId,
                BookingModel.toMySqlDateTime(new Date())
            ))

            res.status(201).json({
                id: result.insertId,
                message: "Booking created."
            })
        } catch (error) {
            // The unique key catches the race the duplicate check cannot.
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(409).json({
                    message: "You have already booked this session."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Booking could not be created."
            })
        }
    }

    /**
     * Cancel a booking. Members cancel their own; admins cancel any.
     * @type {express.RequestHandler}
     */
    static async cancelBooking(req, res) {
        const bookingId = Validation.toId(req.params.id)

        if (bookingId === null) {
            res.status(404).json({
                message: "Booking not found."
            })
            return
        }

        try {
            const booking = await BookingModel.getById(bookingId)

            const isOwner = booking.memberId == req.authenticatedUser.id
            const isAdmin = req.authenticatedUser.role == "admin"

            if (!isOwner && !isAdmin) {
                res.status(403).json({
                    message: "You can only cancel your own bookings."
                })
                return
            }

            await BookingModel.delete(booking.id)
            res.status(200).json({
                message: "Booking cancelled."
            })
        } catch (error) {
            if (error == "not found") {
                res.status(404).json({
                    message: "Booking not found."
                })
                return
            }

            console.error(error)
            res.status(500).json({
                message: "Booking could not be cancelled."
            })
        }
    }
}

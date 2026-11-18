import express from "express"
import { BookingModel } from "../models/BookingModel.mjs"
import { BookingDetailModel } from "../models/BookingDetailModel.mjs"
import { SessionModel } from "../models/SessionModel.mjs"
import { SessionDetailModel } from "../models/SessionDetailModel.mjs"
import { AuthenticationController } from "./AuthenticationController.mjs"
import { Validation } from "../utils/Validation.mjs"

/** A member's bookings: list, book and cancel. */
export class BookingController {
    /** Mounted under /bookings. */
    static routes = express.Router()

    static {
        this.routes.get(
            "/",
            AuthenticationController.restrict(["member"]),
            this.viewBookings
        )

        this.routes.get(
            "/new/:sessionId",
            AuthenticationController.restrict(["member"]),
            this.viewBookingNew
        )

        this.routes.post(
            "/new",
            AuthenticationController.restrict(["member"]),
            this.handleBookingCreate
        )

        this.routes.post(
            "/:id/cancel",
            AuthenticationController.restrict(["member", "admin"]),
            this.handleBookingCancel
        )
    }

    /**
     * A member's dashboard: their personal bookings.
     * @type {express.RequestHandler}
     */
    static viewBookings(req, res) {
        BookingDetailModel.getByMemberId(req.authenticatedUser.id)
            .then(bookings => {
                res.render("bookings.ejs", { bookings })
            })
            .catch(error => {
                console.error(error)
                res.render("status.ejs", {
                    status: "Database Error",
                    message: "Your bookings could not be loaded."
                })
            })
    }

    /**
     * Booking form. Shows the selected session and any alternative trainers
     * running the same class at the same time.
     * @type {express.RequestHandler}
     */
    static viewBookingNew(req, res) {
        const sessionId = Validation.toId(req.params.sessionId)

        if (sessionId === null) {
            res.status(404).render("status.ejs", {
                status: "Session Not Found",
                message: "The session you tried to book does not exist."
            })
            return
        }

        SessionDetailModel.getById(sessionId)
            .then(selected => {
                // A started session cannot be booked.
                if (SessionModel.hasStarted(selected.session)) {
                    res.status(400).render("status.ejs", {
                        status: "Booking Failed",
                        message: "This session has already started."
                    })
                    return
                }

                SessionDetailModel.getAlternatives(selected.session)
                    .then(alternatives => {
                        res.render("booking_new.ejs", { selected, alternatives })
                    })
                    .catch(error => {
                        console.error(error)
                        res.render("status.ejs", {
                            status: "Database Error",
                            message: "Alternative sessions could not be loaded."
                        })
                    })
            })
            .catch(error => {
                console.error(error)
                res.render("status.ejs", {
                    status: "Session Not Found",
                    message: "The session you tried to book does not exist."
                })
            })
    }

    /**
     * Creates a booking for the chosen session, enforcing capacity and
     * preventing double-booking.
     * @type {express.RequestHandler}
     */
    static async handleBookingCreate(req, res) {
        const { values, errors, isValid } = Validation.run(req.body, {
            sessionId: Validation.integer("Session", { min: 1 })
        })

        // Take the member from the session, not the form.
        const memberId = req.authenticatedUser.id

        if (!isValid) {
            res.status(400).render("status.ejs", {
                status: "Booking Failed",
                message: Validation.summarise(errors)
            })
            return
        }

        const sessionId = values.sessionId

        try {
            const session = await SessionModel.getById(sessionId)

            // A started session cannot be booked.
            if (SessionModel.hasStarted(session)) {
                res.status(400).render("status.ejs", {
                    status: "Booking Failed",
                    message: "This session has already started."
                })
                return
            }

            // Already booked?
            const duplicate = await BookingModel.getBySessionAndMember(sessionId, memberId)
            if (duplicate) {
                res.status(400).render("status.ejs", {
                    status: "Booking Failed",
                    message: "You have already booked this session."
                })
                return
            }

            // Check capacity.
            const existing = await BookingModel.getBySessionId(sessionId)
            if (existing.length >= session.capacity) {
                res.status(400).render("status.ejs", {
                    status: "Booking Failed",
                    message: "This session is fully booked."
                })
                return
            }

            const booking = new BookingModel(
                null,
                sessionId,
                memberId,
                BookingModel.toMySqlDateTime(new Date())
            )

            await BookingModel.create(booking)
            res.redirect("/bookings")
        } catch (error) {
            // The unique key on (session_id, member_id) catches the race the
            // check above cannot.
            if (error?.code == "ER_DUP_ENTRY") {
                res.status(400).render("status.ejs", {
                    status: "Booking Failed",
                    message: "You have already booked this session."
                })
                return
            }

            console.error(error)
            res.status(500).render("status.ejs", {
                status: "Booking Failed",
                message: "The booking could not be created."
            })
        }
    }

    /**
     * Cancel a booking. Members can cancel their own; admins can cancel any.
     * @type {express.RequestHandler}
     */
    static async handleBookingCancel(req, res) {
        const bookingId = Validation.toId(req.params.id)

        if (bookingId === null) {
            res.status(404).render("status.ejs", {
                status: "Booking Not Found",
                message: "The booking you tried to cancel does not exist."
            })
            return
        }

        try {
            const booking = await BookingModel.getById(bookingId)

            const isOwner = booking.memberId == req.authenticatedUser.id
            const isAdmin = req.authenticatedUser.role == "admin"

            if (!isOwner && !isAdmin) {
                res.status(403).render("status.ejs", {
                    status: "Access Forbidden.",
                    message: "You can only cancel your own bookings."
                })
                return
            }

            await BookingModel.delete(booking.id)

            if (isAdmin) {
                res.redirect("/admin/bookings")
            } else {
                res.redirect("/bookings")
            }
        } catch (error) {
            if (error == "not found") {
                res.status(404).render("status.ejs", {
                    status: "Booking Not Found",
                    message: "The booking you tried to cancel does not exist."
                })
                return
            }

            console.error(error)
            res.status(500).render("status.ejs", {
                status: "Cancellation Failed",
                message: "The booking could not be cancelled."
            })
        }
    }
}

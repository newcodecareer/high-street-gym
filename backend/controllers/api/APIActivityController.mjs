import express from "express"
import { ActivityModel } from "../../models/ActivityModel.mjs"

/**
 * @openapi
 * /api/activities:
 *   get:
 *     summary: List the activities a session can use
 *     tags: [Reference]
 *     responses:
 *       '200':
 *         description: The activity list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/** Read-only activity list, used to populate the trainer's session form. */
export class APIActivityController {
    /** Mounted under /api/activities. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.getAll)
    }

    /**
     * @type {express.RequestHandler}
     */
    static async getAll(req, res) {
        try {
            res.status(200).json(await ActivityModel.getAll())
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Activities could not be loaded."
            })
        }
    }
}

import express from "express"
import { LocationModel } from "../../models/LocationModel.mjs"

/**
 * @openapi
 * /api/locations:
 *   get:
 *     summary: List the locations a session can use
 *     tags: [Reference]
 *     responses:
 *       '200':
 *         description: The location list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */

/** Read-only location list, used to populate the trainer's session form. */
export class APILocationController {
    /** Mounted under /api/locations. */
    static routes = express.Router()

    static {
        this.routes.get("/", this.getAll)
    }

    /**
     * @type {express.RequestHandler}
     */
    static async getAll(req, res) {
        try {
            res.status(200).json(await LocationModel.getAll())
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "Locations could not be loaded."
            })
        }
    }
}

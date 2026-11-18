import express from "express"
import swaggerJSDoc from "swagger-jsdoc"
import swaggerUI from "swagger-ui-express"
import * as ApiValidator from "express-openapi-validator"
import { APIAuthenticationController } from "./APIAuthenticationController.mjs"
import { APIUserController } from "./APIUserController.mjs"
import { APISessionController } from "./APISessionController.mjs"
import { APIBookingController } from "./APIBookingController.mjs"
import { APIPostController } from "./APIPostController.mjs"
import { APIActivityController } from "./APIActivityController.mjs"
import { APILocationController } from "./APILocationController.mjs"

/**
 * The OpenAPI document is built from the "@openapi" JSDoc blocks in this
 * folder plus the shared schemas in backend/components.yaml.
 */
const specification = swaggerJSDoc({
    failOnErrors: true,
    definition: {
        openapi: "3.0.0",
        info: {
            version: "1.0.0",
            title: "High Street Gym API",
            description: "The JSON REST API used by the React app. Log in with POST /api/authenticate, then send the returned key as the x-auth-key header.",
        },
        servers: [
            { url: "/" },
        ],
        components: {
            securitySchemes: {
                ApiKey: {
                    type: "apiKey",
                    in: "header",
                    name: "x-auth-key",
                },
            },
        },
    },
    apis: ["./controllers/**/*.{js,mjs,yaml}", "./components.yaml"],
})

/**
 * The JSON API consumed by the React app, mounted at /api.
 *
 * Authentication is described in APIAuthenticationController: send the key
 * from POST /api/authenticate in the "x-auth-key" header.
 */
export class APIController {
    static routes = express.Router()

    static {
        // Documentation is public, so it is mounted before the API key guard.
        this.routes.use("/docs", swaggerUI.serve, swaggerUI.setup(specification))
        this.routes.get("/docs.json", (_req, res) => {
            res.status(200).json(specification)
        })

        this.routes.use(APIAuthenticationController.middleware)

        // Validate every API request and response against the OpenAPI document.
        this.routes.use(ApiValidator.middleware({
            apiSpec: specification,
            validateRequests: true,
            validateResponses: true,
        }))

        // Turn validation failures into the same JSON shape as the API.
        this.routes.use((err, _req, res, _next) => {
            res.status(err.status || 500).json({
                status: err.status,
                message: err.message,
            })
        })

        this.routes.use(APIAuthenticationController.routes)

        this.routes.use("/users", APIUserController.routes)
        this.routes.use("/sessions", APISessionController.routes)
        this.routes.use("/bookings", APIBookingController.routes)
        this.routes.use("/posts", APIPostController.routes)
        this.routes.use("/activities", APIActivityController.routes)
        this.routes.use("/locations", APILocationController.routes)

        this.routes.get("/", this.describe)
    }

    /**
     * A small index, so the API is discoverable from a browser.
     * @type {express.RequestHandler}
     * @openapi
     * /api:
     *   get:
     *     summary: List the API endpoints
     *     tags: [Documentation]
     *     responses:
     *       '200':
     *         description: The API name and its endpoints
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     */
    static describe(_req, res) {
        res.status(200).json({
            name: "High Street Gym API",
            version: "1.0.0",
            authentication: "POST /api/authenticate for a key, then send it as the x-auth-key header.",
            endpoints: {
                authentication: ["POST /api/authenticate", "DELETE /api/authenticate"],
                users: ["POST /api/users", "GET /api/users/self", "PUT /api/users/self", "PATCH /api/users/self"],
                sessions: [
                    "GET /api/sessions",
                    "GET /api/sessions/mine",
                    "GET /api/sessions/xml",
                    "POST /api/sessions",
                    "PUT /api/sessions/:id",
                    "DELETE /api/sessions/:id"
                ],
                bookings: [
                    "GET /api/bookings",
                    "GET /api/bookings/xml",
                    "POST /api/bookings",
                    "DELETE /api/bookings/:id"
                ],
                posts: ["GET /api/posts", "POST /api/posts", "DELETE /api/posts/:id"],
                reference: ["GET /api/activities", "GET /api/locations"]
            }
        })
    }
}

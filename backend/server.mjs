import path from "path"
import express from "express";
import cors from "cors"
import { AuthenticationController } from "./controllers/AuthenticationController.mjs";
import { HomeController } from "./controllers/HomeController.mjs";
import { BookingController } from "./controllers/BookingController.mjs";
import { PostController } from "./controllers/PostController.mjs";
import { AdminController } from "./controllers/AdminController.mjs";
import { TrainerController } from "./controllers/TrainerController.mjs";
import { APIController } from "./controllers/api/APIController.mjs";

// Create an express app instance and define a port for later
const app = express();
const port = 8080;

// Enable cross-origin resource sharing (CORS)
app.use(
    cors({
        origin: true, // Allow all origins
    })
)

// Enable the ejs view engine
app.set("view engine", "ejs");
// Load views (ejs files) from the "views" folder relative to this file
app.set("views", path.join(import.meta.dirname, "views"))

// Enable middleware for body parsing and authentication
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(AuthenticationController.middleware)

// Make the signed-in user available to every view.
app.use((req, res, next) => {
    res.locals.authenticatedUser = req.authenticatedUser
    res.locals.role = req.authenticatedUser ? req.authenticatedUser.role : undefined
    // Highlight the current nav item
    res.locals.currentPath = req.path
    next()
})

// The JSON API used by the React app. It reads its own "x-auth-key" header,
// so it does not share the server-side session.
app.use("/api", APIController.routes)

// Use routes (from controllers)
app.use("/authenticate", AuthenticationController.routes)
app.use("/bookings", BookingController.routes)
app.use("/blog", PostController.routes)
app.use("/admin", AdminController.routes)
// Mount before HomeController so "/" does not swallow this path.
app.use("/trainer", TrainerController.routes)
app.use("/", HomeController.routes)

// Serve static resources from the "public" folder relative to this file
app.use(express.static(path.join(import.meta.dirname, "public")));

// Start listening for requests on the port defined earlier
app.listen(port, () => {
    console.log(`High Street Gym running on http://localhost:${port}`);
});

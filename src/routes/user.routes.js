/*
This is where all the user routes will be defined. 
Here, we will define the routes for user registration, login, logout, etc.
 */
import { Router } from "express"
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)// here upload is the middleware defined in multer.middleware.js
// router.route("/login").post(login) // todo: login is not defined yet inside user.controller.js

router.route("/login").post( loginUser )

// secured routes
router.route("/logout").post( verifyJWT, logoutUser ) // verifyJWT is the middleware defined in auth.middleware.js

export default router
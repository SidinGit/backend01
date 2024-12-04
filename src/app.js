import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()

// use method is utilised in middleweares and configurations

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))  // enabling cross origins from where requests will be sent to the server
app.use(express.json({
    limit: "16kb"
})) // enabling json requests and setting a size limit
app.use(express.urlencoded({
    extended:true,
    limit: "16kb"
})) // enabling requests from urls with further extended objects
app.use(express.static("public")) // enabling storage of public assets in public folder(the folder above src), for example: pdf, images
app.use(cookieParser()) // accessing the cookies in user's browser from server and perform crud operatrions on it

// routes import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter) // it is a standard practice to prefix all the routes with /api/version_number
app.use("/api/v1/videos", videoRouter)


export {app}
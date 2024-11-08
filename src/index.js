// require("dotenv").config()

import dotenv from "dotenv"
import {app} from "./app.js"
// import mongoose from "mongoose"
// import {DB_NAME} from "./constants"

import connectDB from "./db/index.js"

dotenv.config({
    path: "./env"
})

// TODO Approach-2 using the imported index.js from db folder
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port ${process.env.PORT||8000}`)
    })
})
.catch((err)=>{
    console.log("MONGO DB CONNECTION FAILED!!: ",err)
})
/* TODO   Approach-1
import express from "express"
const app = express()

( async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Application is not able to talk to the database: ", error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })

    }catch(error){
        console.error("ERROR: ",error)
        throw error
    }
})()
*/
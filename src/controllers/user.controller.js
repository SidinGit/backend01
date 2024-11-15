/*
    Here we will write controllers for user registration, login, logout, etc
    We will leverage the asyncHandler util and other utils files to wrap our code 
*/
import {asyncHandler} from "../utils/asyncHandler.js"


const registerUser = asyncHandler(async (req,res) => {
    res.status(200).json({
        message: "Backend sikhunga master banunga"
    })
})


export {registerUser}
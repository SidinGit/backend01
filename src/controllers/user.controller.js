/*
    Here we will write controllers for user registration, login, logout, etc
    We will leverage the asyncHandler util and other utils files to wrap our code 
*/
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js" // if export default was used you could have simple imported user without {}
import { uploadOnCloudinary } from "../utils/cloudinary.js"


// following has an order of validation and then database operations
const registerUser = asyncHandler(async (req,res) => {

    // 1. get user details from frontend
    const {fullName, email, username, password} = req.body
    console.log(req.body)

    // 2. validation of user details(not empty checks, etc)
    if(
        [fullName, email, username, password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are compulsory")
    }

    // 3. check if user already exists: username, email
    const existedUser = User.findOne({
        $or:[{ username }, { email }]  // if any of these field is already present
    })
    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    // 4. check if we have files(images,avatar) specifically for avatar(avatar is compulsory)
    const avatarLocalPath = req.files?.avatar[0]?.path // req.files give us access to middlewares
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    // 5. upload them to cloudinary, if avatar is uploaded specifically
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    // 6. create user object for mongodb - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    }) // this creates an entry in db

    // 7. remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ) // this is a call to check if a user has been created and then send the response by
      // removing password and refreshToken fields

    // 8. check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user")
    }

    // 9. return response(or handle error)
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})


export { registerUser }

/*  //& Read this
    Here we will write controllers for user registration, login, logout, etc
    We will leverage the asyncHandler util and other utils files to wrap our code
    Comments written: 
    1. for reasoning //^
    2. for steps //*
    3. for other approaches //!
*/

import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js" //^ if export default was used you could have simple imported user without {}
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

//^ this is a function to generate access token and refresh token using the user id
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken() //^ to be given to the user
        const refreshToken = await user.generateRefreshToken() //^ to be stored in the database

        user.refreshToken = refreshToken //^ storing the value in user document
        await user.save({ validateBeforeSave: false }) //^ storing the refresh token in the database without validation(mongoose model kicks in, and we need to avoid that)
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
}

//^ following has an order of validation and then database operations for user registration
const registerUser = asyncHandler(async (req,res) => {

    //* 1. get user details from frontend
    const {fullName, email, username, password} = req.body
    // console.log(req.body)

    //* 2. validation of user details(not empty checks, etc)
    if(
        [fullName, email, username, password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are compulsory")
    }

    //* 3. check if user already exists: username, email
    const existedUser = await User.findOne({
        $or:[{ username }, { email }]  //^ checking if any of these field is already present
    })
    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    //* 4. check if we have files(images,avatar) specifically for avatar(avatar is compulsory)
    const avatarLocalPath = req.files?.avatar[0]?.path //^ req.files give us access to middlewares
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    //* 5. upload them to cloudinary, if avatar is uploaded specifically
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    //* 6. create user object for mongodb - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    }) //^ this creates an entry in db

    //* 7. remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ) //^ this is a call to check if a user has been created and then send the response by
      //^ removing password and refreshToken fields

    //* 8. check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    //* 9. return response(or handle error)
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

//^ following is an order of validation and then database operations for user login
const loginUser = asyncHandler(async (req,res) => {
    
    //* 1. Get user details from frontend
    const { email, username, password } = req.body

    //* 2. username or email
    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }
    const user = await User.findOne({
        $or:[{ username }, { email }]
    })

    //* 3. find if the user exists(handle error if the user doesn't exist)
    if(!user){
        throw new ApiError(404,"User does not exist")
    }
    //* 4. get the password and compare it with the password in db(compare it with the encrypted password in db, and handle error if password doesn't match)
    const isPasswordValid = await user.isPasswordCorrect(password)//^ remember that "User" is a mongoose object, so all the builtin mongoose methods like findOne, updateOne, etc can be used
                                                                  //^ but user is an instance of the User model, so all the custom methods can be used using "user" object followed by a dot
    if(!isPasswordValid){
        throw new ApiError(401,"Password is incorrect")
    }
    //* 5. generate access token and refresh token(thses to processes are so common and frequent that we will use a function for it, declared above)
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") //^ getting logged in user details without password and refresh token
    
    //* 6. send tokens in form of secure cookies
    const options = {
        httpOnly: true, //^ meaning that the cookie will only be accessible from the server, not from the client(browser)
        secure: true
    }

    //* 7. return response
    return res
    .status(200)
    .cookie("accessToken",accessToken,options) //^ cookie is coming from cookie-parser("name of the token", variable, options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )

})

//^ following is an order of validation and then database operations for user logout
const logoutUser = asyncHandler( async (req,res) => { 
    //* basically clearing the cookies, and resetting the refresh token in db
    //^ so for that we need to have access of the user's id in the request object(which is not there)
    //^ so we take help of a middleware which is "verifyJWT" in auth.middleware.js
    //^ all these were done to get user id
    await User.findByIdAndUpdate( 
        req.user._id, // ^ this user is coming from the middleware "verifyJWT" in auth.middleware.js
        {
            $set: {
                refreshToken: undefined
            }
        }, 
        {
            new: true //^ this will return the updated document(not the old one, where refresh token was still there)
        }
    ) //^ refresh token is cleared in db 

    const options = { //^ options for clearing the cookies
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options) //^ clearCookie is coming from cookie-parser
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200, {}, "User logged out")
    )

})

//^ following is an controller(just like above controllers) for refreshing the access token just before the login token expires
const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //^ this is the refreshToken that the user(frontend) sends to the server

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refreshe token is expired or used")
        }
    
        //* now generate new access token and refresh token
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }

})

//^ following are operations for changing password
const changeCurrentPassword = asyncHandler( async ( req, res ) => {
    const { oldPassword, newPassword } = req.body
    //^ now at this point the middleware that takes care of user auth has already verified that the user is logged in
    //^ and also added a field user in the req object from where we can retrieve user id
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)//^ here user is an instance of the model object
    if(!isPasswordCorrect){
        throw new ApiError(400,"Old password is incorrect")
    }

    user.password = newPassword //^ we needed to call the pre hook(in user.model) that hashes the password before saving it in db
    //^ hence we did not use findByIdAndUpdate method
    await user.save({validateBeforeSave: false}) //^ rather we saved it manually unlike in updateAccountDetails

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password changed successfully")
    )
} )

//^ following are operations for getting user details
const getCurrentUser = asyncHandler( async ( req, res ) => { 
    //^ we already have a middleware that has run successfully and added a user field in the req object
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "User details fetched successfully"
        )
    )
})

//^ following are operations for updating account details(text based fields)
const updateAccountDetails = asyncHandler( async ( req, res ) => { 
    //! we can also create separate controllers for separate tasks(like upldating images, emails, username, etc)
    //! so that we dont send the whole user object(including the unchanged fields) to the frontend; it saves a lot of bandwidth
    const { email, fullName, } = req.body

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    //^ now here u have received the user details from the frontend and you are to communicate with the db and update it
    //^ since we need no hook we update it using findByIdAndUpdate
    const user = await User.findByIdAndUpdate( 
        req.user?._id,
        {
            $set:{
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
                200,
                user,
                "Account details updated successfully"
        )
    )

})

//^ following are operations for updating user avatar image
const updateUserAvatar = asyncHandler( async ( req, res ) => {
    const avatarLocalPath = req.file?.path  //^ the "upload" middleware called in the updateUserAvatar route 
                                            //^ with only one item in the array(hence file.path, not files.path) has
                                            //^ stored the local path of the uploaded file in the public/temp folder

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing")
    }

    //* at this point the avatar is already there so we upload it to the cloudinary
    const updatedAvatar = await uploadOnCloudinary(avatarLocalPath)
    if(!updatedAvatar.url){
        throw new ApiError(500,"Something went wrong while uploading the avatar, please try again")
    }
    // todo: delete old avatar from cloudinary
    //* now update the avatar's url in the db()
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: updatedAvatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar updated successfully"
        )
    )
})

//^ following are operations for updating user cover image
const updateUserCoverImage = asyncHandler( async ( req, res ) => {
    const coverImageLocalPath = req.file?.path  //^ the "upload" middleware called in the updateUserCoverImage route 
                                                //^ with only one item in the array(hence file.path, not files.path) has
                                                //^ stored the local path of the uploaded file in the public/temp folder

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is missing")
    }

    //* at this point the coverImage is already there so we upload it to the cloudinary
    const updatedCoverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!updatedCoverImage.url){
        throw new ApiError(500,"Something went wrong while uploading the cover image, please try again")
    }

    //* now update the cover image url in the db()
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: updatedCoverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover image updated successfully"
        )
    )
})

//^ following are operations for getting user profile
const getUserChannelProfile = asyncHandler( async ( req, res ) => {
    const { username } = req.params //^ why user.params ?? whenever we need the profile of a channel, we go to the channel's url
                                    //^ params give us the url(here a user is checking the profile of a channel)

    if(!username?.trim()) {
        throw new ApiError(400,"Username is rmissing")
    }

    //* now we need to find the document in the db using the username of the channel
    //* and then we can get subscribers count, etc using mongo db aggregation pipeline(for details watch video 19:understanding the subscription schema)

    const channel = await User.aggregate([
        {
            $match:{ //^ find the document from the db with username as username 
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: { //^ and then look for subscribers of the channel with the username
                from: "Subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers" //^ gives us an array of subscribers whose channel name is linked to username's user id
            }
        },
        {
            $lookup: { //^ and then look for how many channels it(username) has subscribed to
                from: "Subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" //^ gives us an array of channels whose subscriber name is linked to username's user id
            }
        },
        {
            $addFields:{ //^ and then add these new fields to the document   
                subscribersCount: { //^ count of subscribers
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: { //^ count of channels subscribed to
                    $size: "$subscribedTo"
                },
                isSubscribed: { //^ checks if the you are subscribed to the channel
                    $condition: {
                        if: {$in:[req.user?._id, "$subscribers.subscriber"]}, //^ if your id is present in the subscribers.subscriber array
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { //^ exposes(or projects) only selected fields to the frontend
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            `${username}'s profile fetched successfully`
        )
    )

}) 

//^ following are operations for getting user watch history
const getWatchHistory = asyncHandler( async ( req, res ) => {
    //^ req.user._id returns the whole mogno db id string objectId('5hd51f54134d3541f') 
    //^ later when it is used with mongoose model, internally the objectId is removed and the string within it is used
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id) //^ check the above comments
            }
        },
        {
            $lookup:{
                from:"Video",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"User",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0]?.watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,  
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
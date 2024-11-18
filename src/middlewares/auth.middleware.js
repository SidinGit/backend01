// the task of this middleware is to verify whether the user is there or not
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler ( async ( req, res, next ) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","") // check below for the use of req.header
                    // * cookies might not have the access token in case of mobile app
                    /* 
                    ? Whenever the user wants to access a protected route or resource, 
                    ? the user agent should send the JWT, 
                    ? typically in the Authorization header using the Bearer schema. 
                    ? The content of the header should look like the following:
    
                    & Authorization: Bearer <token>
                    */
        if(!token){
            throw new ApiError(401,"Unauthorized access")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
    
        if(!user){
            // ^ Important: discuss about frontend
            throw new ApiError(401,"Invalid access token")
        }
    
        req.user = user // * adding a new object user in req
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }

} )
import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, // cloudinary service(like aws but for free that provides a url to the image)
        required:true,
    },
    coverImage:{
        type:String, // cloudinary service(like aws but for free that provides a url to the image)
    },
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken:{
        type: String

    }
    
},{timestamps:true})

userSchema.pre("save", async function (next) { // we want to hash the password only when user has modified the password field, not in other cases
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hashSync(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

/*
Access Tokens and Refresh Tokens in Backend Development
Access Token:

1. A short-lived token used to authenticate and authorize user actions.
2. Typically sent with each request (e.g., in the headers) to access a protected resource.
3. Example: A key card granting access to a room temporarily.

Refresh Token:

1. A longer-lived token used to get a new access token after it expires.
2. Helps maintain security without requiring the user to log in again.
3. Example: A membership ID used to get a new key card when the old one stops working.
Real-Life Scenario

Imagine logging into a streaming service like Netflix:

Access Token: Lets you browse and watch movies. Expires quickly (e.g., after an hour).
Refresh Token: Quietly fetches a new access token when it expires, so you don’t have to log in again.
This approach balances security (short-lived access tokens) and usability (auto-refresh with refresh tokens).
*/
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",userSchema)
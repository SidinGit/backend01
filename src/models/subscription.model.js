import mongoose, { Schema } from "mongoose"

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId, // one who is subscribing(the user)
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId, // one to whom subscriber(the user) is subscribing
        ref: "User"
    }
},{timestamps:true})

// there are more to this model that we need to discuss and eventually add
//* 1. check if the user whom channel is searching has subscribed or not and update it on the client side(channel or the user)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)
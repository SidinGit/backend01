import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2" //^ gives us the ability to paginate our data

const videoSchema = new Schema({
    videoFile:{
        type : String, // cloudinary service(like aws but for free that provides a url to the image)
        required : true
    },
    thumbnail:{
        type : String, // cloudinary service(like aws but for free that provides a url to the image)
        required : true
    },
    title:{
        type : String,
        required : true
    },
    description:{
        type : String,
        required : true
    },
    duration:{
        type : Number, // cloudinary information
        required : true
    },
    views:{
        type : Number,
        default: 0
    },
    isPublished:{
        type : Boolean,
        default: true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema)
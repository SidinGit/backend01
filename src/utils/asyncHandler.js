// we need to talk to the database repetitively and each time it is unconvenient to write out try catch wrapped medthods
// hence we utilise this generalised function which wraps the code in a try catch block/ promise thereby avoiding repetition

// Approach-1: a promise-resolve
const asyncHandler = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
    }
}




// Approach-2: a try catch block
/*
const asyncHandler = (fn) => async (error,req,res,next) => {
    try {
        await fn(req,res,next)
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}
*/

export {asyncHandler}
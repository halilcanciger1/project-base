const Enum = require("../config/enum");
const CustomError = require("../lib/Error");
class Response{

    constructor(){}

    static successResponse(data, code=200){
        return{
            data,
            code
        }
    }

    static errorResponse(error){
        if(error instanceof CustomError){
            return{
                code: error.code,
                    error: {
                    message: error.message,
                    description: error.description
                }
            }
        }
        else if(error.message.includes("E11000")){
            return{
                code: Enum.HTTP_CODES.CONFLICT,
                error:{
                    message: "Already Exists",
                    description: "Already Exists"
                }
            }
        }

        return{
            code: Enum.HTTP_CODES.INT_SERVER_ERROR,
            error:{
                message: "Unknown error",
                description: "Unknown error"
            }
        }
        
    }

}

module.exports = Response;
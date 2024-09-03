const mongoose=require('mongoose')

const groupSchema=mongoose.Schema({

    creator_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    name:{
        type:String,
        ref:'User'
    },
    image:{
        type:String,
        required:true
    },
    limit:{
        type:Number,
        required:true
    }

    
},{Timestamps:true})

module.exports=mongoose.model('Group',groupSchema)
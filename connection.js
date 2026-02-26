const mongoose=require('mongoose')

const connect=mongoose.connect(`mongodb+srv://dawar:dawar@cluster0.svmizih.mongodb.net`)


module.exports=connect;
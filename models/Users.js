const mongoose =require("mongoose");


const UsersSchema = new mongoose.Schema({

     email:{ type :String , unique:true },
     password :String 
}) ;
const UserSchema =mongoose.model("Users", UsersSchema);
module.exports = UserSchema;
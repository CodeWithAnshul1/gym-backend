const mongoose =require("mongoose");


const UsersSchema = new mongoose.Schema({

     email:{ type :String , unique:true },
     password :String ,
     role :{
          type :String,
          enum:["user" , "admin" , "superadmin"],
          default : "user",

     }
} ,{timestamps :true }) ;
const UserSchema =mongoose.model("Users", UsersSchema);
module.exports = UserSchema;
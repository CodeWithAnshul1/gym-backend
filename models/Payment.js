const mongoose =require("mongoose");

const PaymentSchema = new  mongoose.Schema({
     amount:{
        type:Number,
        required :true,
     },
     userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Employee",
        required :true,
     },
     entrydate:{
        type: Date,
        default :Date.now,
     },
     isDeleted:{
      type:Boolean,
      default:false,
     }
},{timestamps:true});

const getPaymentModel = (db)=>{
    return db.models.Payment || db.model("Payment",PaymentSchema);
}
module.exports= getPaymentModel;
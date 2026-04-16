const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
    name: String,
    number: {type :String , match: /^[0-9]{10}$/,},
    add: String,
    entrydate :{
        type:Date,
        default :Date.now,
    },
    expiredate:{
        type:Date,
        required:true,
    }
    
}, {timestamps :true ,}
);
const getEmployeeModel = (db) => {
  return db.models.Employee || db.model("Employee", EmployeeSchema);
};

// const Employee = mongoose.model("Employee", employeeSchema);

module.exports = getEmployeeModel;
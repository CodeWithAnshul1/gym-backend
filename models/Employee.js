const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    name: String,
    number: {type :String , match: /^[0-9]{10}$/,},
    add : String,
    
}, {timestamps :true ,}
);

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
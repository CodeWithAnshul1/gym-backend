const mongoose = require("mongoose");

const connections = {};

const mainconnection = mongoose.createConnection( process.env.MONGO_URI+"mainDB?retryWrites=true&w=majority");

const Tenant = mainconnection.model(
    "tenants",
    new mongoose.Schema({
        tenantId :String,
        isActive :Boolean,
    })
);

const connectDB = async (tenantId) => {
  try {

    const tenant = await Tenant.findOne({tenantId});
    if(!tenant || !tenant.isActive){
        throw new Error("Invalid tenant");
    }
    if (connections[tenantId]) {
      return connections[tenantId];
    }

    const db = mongoose.createConnection(
      `${process.env.MONGO_URI}${tenantId}?retryWrites=true&w=majority`
    );
    if(!db){
        console.log("db connection failed");
    }
     await db.asPromise(); 
    //  await db.asPromise();
        console.log("DB CONNECTED:", db.name);

    connections[tenantId] = db;

    return db;
  } catch (err) {
    console.log("DB connection error:", err.message);
    throw err;
  }
};

module.exports = connectDB;
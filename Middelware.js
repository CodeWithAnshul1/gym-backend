const jwt = require("jsonwebtoken");
const SECRET = "mysecretkey";

function auth(req ,res ,next) {
    const header = req.headers.authorization;

    if(!header){
        return res.status(401).json({message :"token missing"});

    }
    const token = header.split(" ")[1];

    try{
        const decode = jwt.verify(token ,SECRET);
        req.user = decode;
        next();

    }
    catch(err){
        res.status(403).json({message : "invalid token"});

    }
}

module.exports=auth;
const jwt = require('jsonwebtoken');
const RPSGAMEUSERModel = require("../models/rpsgame_user.model")

const auth = () => {
    return async function (req, res, next) {
        try {
            const token = req.body.token || req.query.token || req.headers["x-access-token"]
            const secretKey = process.env.SECRET_JWT || "";
            const decoded = jwt.verify(token, secretKey)
            const user = await RPSGAMEUSERModel.find({ wallet : decoded.wallet })
            if (user.error || user.length===0) {
                return res.send({response:false, message:'Authentication failed!', data:null})
            }else
            if(user[0].nonce != decoded.nonce){
                return res.send({response:false, message:'Authentication failed!', data:null})
            }          
            next();
        } catch (e) {
            e.status = 401;
            next(e);
        }
    }
}

module.exports = auth;
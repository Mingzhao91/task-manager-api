const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * without middleware: new request -> run route handler
 * With middleware: new request -> do something -> run route handler 
 * 
 * Setup middleware
 * 
 * The next is specific to registering middleware. 
 * It is possible that you don't always want to call next and there's valid
 * reasions to do that. Somethimes your middleware should stop the root handler
 * from running like it's going to do when we eventually set up authentication.
 * 
 * Using just a little variation in our middleware we can limit what a user can 
 * access to. 
 */

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Looking for a user that has correct ID and has a given token value 
        // in one of their array items in the tokens array
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });

        if(!user) {
            throw new Error();
        }
        
        req.token = token;
        req.user = user;
        next();
    } catch(e) {
        res.status(401).send({error: 'Please authneticate.'})
    }
}

module.exports = auth;
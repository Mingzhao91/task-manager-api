const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    // make sure that when Mongoose works with MongoDB, our indexes are created allowing
    // us to quickly access the data we need to access.
    userCreateIndex: true
})

// use require(this file name) to run the script to connect to the server,
// e.g. in index.js/require('./db/mongoose');

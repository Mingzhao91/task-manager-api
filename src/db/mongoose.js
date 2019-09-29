const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    // make sure that when Mongoose works with MongoDB, our indexes are created allowing
    // us to quickly access the data we need to access.
    userCreateIndex: true
})

const express = require('express');
require('./db/mongoose');
const userRouter = require('./routers/user');
const taskRouter = require('./routers/task');

const app = express();

// It will automatically pass incoming JSON to an object
app.use(express.json());

// Register routers
app.use(userRouter);
app.use(taskRouter);

module.exports = app;


const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // It allows us to create a ref which is short for reference from this field
        // to another model.
        ref: 'User'
    }
}, {// options
    // add createdAt and updateAt fields into the model
    timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
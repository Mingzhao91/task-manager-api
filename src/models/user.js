const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email is invalid');
      }
    }
  },
  age: {
    type: Number,
    default: 0,
    validate(value) {
      if (value < 0) {
        throw new Error('Age must be a positive number');
      }
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    trim: true,
    validate(value) {
      if (value.toLowerCase().includes('password')) {
        throw Error('Password cannot contain "password"');
      }
    }
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  avatar: {
    type: Buffer
  }
}, { // options
  // add createdAt and updateAt fields into the model
  timestamps: true 
});

/**
 * virtual property
 * 
 * Virtual property is not actual data stored in the database.It's a relationship between
 * two entities. It's just a way for mongoose to figure out how these two things are related.
 */
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id', // user's id
  foreignField: 'owner'
})


/**
 * user cannot truely logout, this token as long as it exists means the user is logged in.
 * So if it gets in the wrong hands, a user has no way to logout and invalidate a given token.
 * We can go ahead and fix that by tracking tokens we generate for users. This will allow a user
 * to log in from multiple devices like their laptop and a phone then they'd be able to log out
 * one while still being logged in to the other. So all we're going to do is store all of 
 * the tokens we generate for a user, see tokens in model.
 */

// methods are accessible on the instances, sometimes called instance methods.
// Setup as a standard function since we are going to need to use 'this' binding
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
}

/**
 * Hide the private data
 * 
 * What so special about toJSON that allows it to run even though we're never explicitly
 * calling this? 
 * This is exactly what Express is doing, when we pass an object to res.send(), it is 
 * calling JSON.stringify() behind the scenes. 
 * 
 * When we use res.send(), JSON.stringify is called on the user. We've setup a tojSON
 * method on the user where we manipulate the object sending back just the properties
 * we want to expose.
 * 
 */
userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;

  return userObject;
}

// Static method are accessible on the model, sometimes called model methods.
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

  if(!user) {
    throw new Error('Unable to login');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if(!isMatch) {
    throw new Error('Unable to login');
  }

  return user;
}

// Hash the plain text password before saving
userSchema.pre('save', async function(next) {
    const user = this;

    // isModified - This will be true when the user is first created. And it will also
    // be true if the user is being updated.
    if(user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 8);
    }

    next();
})

// Delete user tasks when user is removed
userSchema.pre('remove', async function (next) {
  const user = this;
  await Task.deleteMany({owner: user._id});
  next();
})

const User = mongoose.model('User', userSchema);

module.exports = User;

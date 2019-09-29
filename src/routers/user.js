const express = require('express');
const User = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account');
const router = new express.Router();


router.post('/users', async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    // Generate a token for a very specific user, so we're going to set up the method
    // to live on the user instance.
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send();
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      token => token.token !== req.token
    );
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.get('/users/me', auth, async (req, res) => {
  // user was stored in the request in the auth middleware
  res.send(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'age'];
  const isValidOperation = updates.every(update =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    updates.forEach(update => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send(req.user);
  } catch (e) {
    res.status(400).send(e);
  }
});

// router.patch('/users/:id', async (req, res) => {
//   const updates = Object.keys(req.body);
//   const allowedUpdates = ['name', 'email', 'password', 'age'];
//   const isValidOperation = updates.every(update =>
//     allowedUpdates.includes(update)
//   );

//   if (!isValidOperation) {
//     return res.status(400).send({ error: 'Invalid updates!' });
//   }

//   try {
//     // Allow save middleware to work everytime the user is saved.
//     // This is because the findByIdAndUpdate method bypasses mongoose.
//     // It performs a direct operation on the database. That is why we even
//     // had to set a special option for running the validators.
//     const user = await User.findById(req.params.id);
//     updates.forEach((update) => user[update] = req.body[update]);
//     await user.save();

//     // const user = await User.findByIdAndUpdate(req.params.id, req.body, {
//     //   new: true,
//     //   runValidators: true
//     // });

//     if (!user) {
//       return res.status(404).send();
//     }

//     res.send(user);
//   } catch (e) {
//     res.status(400).send(e);
//   }
// });

router.delete('/users/me', auth, async (req, res) => {
  try {
    // const user = await User.findByIdAndDelete(req.user._id);

    // if (!user) {
    //   return res.status(404).send();
    // }
    await req.user.remove();
    sendCancelationEmail(req.user.email, req.user.name);
    res.send(req.user);
  } catch (e) {
    res.status(500).send();
  }
});

const upload = multer({
  // destination
  // multer does give us a way to actually access the data inside of our express request
  // function and all we need to do to get that done is remove the 'dest' property from
  // our options object. When we do this, the multer library is no longer going to save
  // images to the directory you specified in the dest property, instead, it's simply going
  // to pass that data through to our function so we can do something with it.
  // dest: 'avatars',
  limits: {
    fileSize: 1000000 // 1 megabyte
  },
  // file filter allows us to filter out the files that we don't want to actually have uploaded.
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)/)) {
      cb(new Error('Please upload an image.'));
    }

    cb(undefined, true);

    // if something goes wrong, and we want to throw an error. This is how we can send back
    // an error to the person who uploaded the file.
    // cb(new Error('File must be a PDF'));

    // If things go well, we're not going to provide the first argument to callback that we're
    // still going call it. We actually provide undefined as the first argument saying that
    // nothing went wrong. Then provide a boolean as the second argument we provide the value
    // of true if the upload should be expected.
    // cb(undefined, true);

    // Providing no error and false to silently reject the upload.
    // cb(undefined, false);
  }
});

/**
 * .single(fieldname)
 * Accept a single file with the name fieldname. The single file will be stored
 * in req.file.
 */
router.post(
  '/users/me/avatar',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    // req.file.buffer: the buffer contains a buffer of all of the binary data for that file.
    // we can only access it in our handler when we don't have the 'dest' option set up.

    // using Sharp to adjust the image the user uploaded
    // use await as sharp is asynchronous
    // .png: convert the image over to the png format
    // .resize: allow us to resize a given image 
    // req.file.buffer is user uploaded image passed by multer
    const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    // This post function needs to have this call signature(set of arguments: error, req, res, next) that it
    // expects that's what lets express knows that this is the function set up to handle
    // any uncaught erros. In this case any errors taht have occurred because multer through an error
    // when it got a bad upload.
    res.status(400).send({ error: error.message });
  }
);

router.delete('/users/me/avatar', auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send();
});

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if(!user || !user.avatar) {
      throw new Error()
    }

    // set a response header
    // the png format is always correct because we use sharp to convert the image over to the png
    // format before saving it.
    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  } catch(e) {
    res.status(404).send();
  }
})  

module.exports = router;

const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');

const router = new express.Router();

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=10
// GET /tasks?sortBy=createdAt:asc(desc)
router.get('/tasks', auth, async (req, res) => {
  try {
    // one way
    // const tasks = await Task.find({owner: req.user._id});

    // another way
    // populate allows us to populate data from a relationship
    // this line is going to go off and it's going to find tasks that
    // associated with this user.

    const match = {};
    const sort = {};

    if (req.query.completed) {
      match.completed = req.query.completed === 'true';
    }

    if(req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    await req.user
      .populate({
        path: 'tasks',
        match,
        options: {
          // this options property can be used for pagination(limit and skip) and sorting
          // if limit is not provided in query or it's not a number, it's going to be ignore
          // by Mongoose
          limit: parseInt(req.query.limit),
          skip: parseInt(req.query.skip),
          // ascending: 1
          // descending: -1
          sort
        }
      })
      .execPopulate(); // 'tasks', the virtual field set in the user model
    res.send(req.user.tasks);
  } catch (e) {
    res.status(500).send();
  }
});

router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const task = await Task.findOne({ _id, owner: req.user._id });

    if (!task) {
      res.status(404).send();
    }

    res.send(task);
  } catch (e) {
    res.status(500).send();
  }
});

router.post('/tasks', auth, async (req, res) => {
  // const task = new Task(req.body);
  const task = new Task({
    ...req.body,
    owner: req.user._id
  });

  try {
    await task.save();
    res.status(201).send(task);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['description', 'completed'];
  const isValidOperation = updates.every(update =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    // Allow save middleware to work everytime the task is saved.
    // This is because the findByIdAndUpdate method bypasses mongoose.
    // It performs a direct operation on the database. That is why we even
    // had to set a special option for running the validators.
    // const task = await Task.findById(req.params.id);

    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    // const task = await Task.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});

    if (!task) {
      res.status(404).send();
    }

    updates.forEach(update => (task[update] = req.body[update]));
    await task.save();

    res.send(task);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!task) {
      res.status(404).send();
    }

    res.send(task);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;

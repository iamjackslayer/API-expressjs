const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const Post = require("../../models/Post");

// @route POST /api/posts
// @desc Create a post
// @access Private
router.post(
  "/",
  [auth, check("text", "text is required").not().isEmpty()],
  async (req, res) => {
    const vRes = validationResult(req);
    if (!vRes.isEmpty()) return res.status(400).json({ errors: vRes.array() });
    try {
      const user = await User.findById(req.user.id).select("-password");
      const newPost = new Post({
        user: user.id,
        text: req.body.text,
        name: user.name,
      });
      const post = await newPost.save();
      return res.json(post);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
  }
);

// @route GET /api/posts
// @desc Get all posts
// @access Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    return res.json(posts);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route GET /api/posts/:id
// @desc Get post by id
// @access Private
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.json(post);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route DELETE /api/posts/:id
// @desc Delete post by id
// @access Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    // Check if user owns the post to be deleted
    if (post.user.toString() !== req.user.id)
      return res
        .status(401)
        .json({ errors: [{ msg: "Unauthorised operation" }] });
    await post.remove();
    return res.json(post);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route PUT /api/posts/like/:id
// @desc Like a post by id
// @access Private
router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    // Check if user already liked the post
    if (post.likes.find((like) => like.user.toString() === req.user.id))
      return res
        .status(400)
        .json({ errors: [{ msg: "Post already liked by the user" }] });
    // Like the post
    post.likes.unshift({
      user: req.user.id,
    });
    await post.save();
    return res.json(post.likes); // For redux to update app state
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route PUT /api/posts/unlike/:id
// @desc Unlike a post by id
// @access Private
router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    // Check if user already liked the post
    if (!post.likes.find((like) => like.user.toString() === req.user.id))
      return res
        .status(400)
        .json({ errors: [{ msg: "User has not liked the post" }] });
    // Unlike the post
    post.likes = post.likes.filter(
      (like) => like.user.toString() !== req.user.id
    );
    await post.save();
    return res.json(post.likes);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route POST /api/posts/comment/:id
// @desc Create a comment
// @access Private
router.post(
  "/comment/:id",
  [auth, check("text", "Text is required to create a post").notEmpty()],
  async (req, res) => {
    const vRes = validationResult(req);
    if (!vRes.isEmpty()) return res.status(400).json(vRes.array());
    try {
      const { text } = req.body;
      const user = await User.findById(req.user.id);
      if (!user)
        return res
          .status(400)
          .json({ errors: [{ msg: "No such user found" }] });
      const post = await Post.findById(req.params.id);
      if (!post)
        return res.status(400).json({ errors: [{ msg: "No such post" }] });
      const newComment = {
        user: req.user.id,
        text,
        name: user.name,
      };
      post.comments.unshift(newComment);
      await post.save();
      return res.json(post.comments);
    } catch (e) {
      console.log(e);
      if (e.kind === "ObjectId")
        return res.status(400).json({ errors: [{ msg: "No such post" }] });
      return res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
  }
);

// @route DELETE /api/posts/:id/comment/:comment_id
// @desc Delete a particular comment from a particular post
// @access Private
router.delete("/:id/comment/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    // Check if comment to be deleted was created by the user
    const toDelete = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );
    if (!toDelete)
      return res
        .status(400)
        .json({ errors: [{ msg: "No such comment found in the post" }] });
    if (toDelete.user.toString() !== req.user.id)
      return res
        .status(401)
        .json({ errors: [{ msg: "Unauthorized operation" }] });

    post.comments = post.comments.filter(
      (comment) => comment.id !== req.params.comment_id
    );
    await post.save();
    return res.json(post.comments);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such post" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});
module.exports = router;

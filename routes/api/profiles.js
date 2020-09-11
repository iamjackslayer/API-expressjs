const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const config = require("config");
const axios = require("axios");
const { check, validationResult } = require("express-validator");
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route /api/profiles/me
// @desc Get current profile of the user
// @access Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name"]);
    if (!profile)
      return res
        .status(400)
        .json({ errors: [{ msg: "No profile for this user" }] });
    return res.json(profile);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route POST /api/profiles
// @desc Create a profile
// @access Private
router.post(
  "/",
  [
    auth,
    check("status", "Status is required").notEmpty(),
    check("skills", "Skills are required").notEmpty(),
  ],
  async (req, res) => {
    const vRes = validationResult(req);
    if (!vRes.isEmpty()) return res.status(400).json({ errors: vRes.array() });
    const {
      company,
      website,
      location,
      status,
      skills,
      bio,
      githubusername,
      youtube,
      twitter,
      facebook,
      linkedin,
      instagram,
    } = req.body;
    try {
      const profileFields = {};
      profileFields.user = req.user.id;
      if (company) profileFields.company = company;
      if (website) profileFields.website = website;
      if (location) profileFields.location = location;
      if (status) profileFields.status = status;
      if (skills) {
        profileFields.skills = skills.split(",").map((skill) => skill.trim());
      }
      if (bio) profileFields.bio = bio;
      if (githubusername) profileFields.githubusername = githubusername;
      profileFields.social = {};
      if (youtube) profileFields.social.youtube = youtube;
      if (twitter) profileFields.social.twitter = twitter;
      if (facebook) profileFields.social.facebook = facebook;
      if (linkedin) profileFields.social.linkedin = linkedin;
      if (instagram) profileFields.social.instagram = instagram;

      let profile = await Profile.findOne({ user: req.user.id });
      if (profile) {
        // profile already exists. We update.
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields }, // $set operator is like PATCH, keep irrelevant fields in the original profile document
          { new: true } // return the newly updated document
        );
        return res.json(profile);
      }
      // Create new profile
      profile = new Profile(profileFields);
      await profile.save();
      return res.json(profile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
  }
);

// @route GET /api/profiles
// @desc Get all profiles
// @access Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find();
    return res.json(profiles);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route GET /api/profiles/user/:user_id
// @desc Get profile of a specific user
// @access Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name"]);
    if (!profile)
      return res
        .status(400)
        .json({ errors: [{ msg: "No profile for the user" }] });

    return res.json(profile);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res.status(400).json({ errors: [{ msg: "No such user" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route DELETE /api/profiles
// @desc Delete profiles, user and their posts. Delete every trace of the user.
// @access Private
router.delete("/", auth, async (req, res) => {
  try {
    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });
    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // Remove user's posts
    await Post.deleteMany({ user: req.user.id });

    res.json({
      msg: "User and its associated profile and posts have been deleted",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @router PUT /api/profiles/experiences
// @desc Add experience field to this user's profile
// @access Private
router.put(
  "/experience",
  [
    auth,
    check("title", "title is required").notEmpty(),
    check("company", "company is required").notEmpty(),
    check("location", "location is required").notEmpty(),
    check("from", "from is required").notEmpty(),
  ],
  async (req, res) => {
    const vRes = validationResult(req);
    if (!vRes.isEmpty()) return res.status(400).json(vRes.array());
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      if (!profile)
        return res.status(400).json({ errors: [{ msg: "No profile found" }] });
      const {
        title,
        company,
        location,
        from,
        to,
        current,
        description,
      } = req.body;
      const exp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description,
      };
      profile.experiences.unshift(exp);
      await profile.save();
      return res.json(profile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
  }
);

// @route DELETE /api/profiles/experiences/:exp_id
// @desc Delete an experience of the user's profile
// @access Private
router.delete("/experiences/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile)
      return res.status(400).json({ errors: [{ msg: "No profile found" }] });
    profile.experiences = profile.experiences.filter(
      (exp) => exp.id !== req.params.exp_id
    );
    await profile.save();
    return res.json(profile);
  } catch (e) {
    console.log(e);
    if (e.kind === "ObjectId")
      return res
        .status(500)
        .json({ errors: [{ msg: "No such experience id" }] });
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route PUT /api/profiles/educations
// @desc Add education to user's profile
// @access Private
router.put(
  "/educations",
  [
    auth,
    check("school", "school is required").notEmpty(),
    check("degree", "degree is required").notEmpty(),
    check("fieldofstudy", "fieldofstudy is required").notEmpty(),
    check("from", "starting date is required").notEmpty(),
  ],
  async (req, res) => {
    const vRes = validationResult(req);
    if (!vRes.isEmpty()) return res.status(400).json(vRes.array());
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      if (!profile)
        return res
          .status(400)
          .json({ errors: [{ msg: "User has no profile" }] });
      const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description,
      } = req.body;
      const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description,
      };
      profile.educations.unshift(newEdu);
      await profile.save();
      return res.json(profile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ errors: [{ msg: "Server error " }] });
    }
  }
);
module.exports = router;

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  profilePicture: {
    type: String,
  },
  profileBackgroundPicture: {
    type: String,
  },
  headline: {
    type: String,
    default: "",
  },
  location: {
    city: String,
    state: String,
    country: String,
  },
  connections: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  academicInfo: {
    branch: String,
    roll: String,
    semester: String,
  },
  projects: [
    {
      title: String,
      description: String,
      startDate: { month: String, year: Number },
      endDate: { month: String, year: Number },
      githubLink: String,
      deployedLink: String,
    },
  ],

  skills: [
    {
      name: String,
      level: String,
    },
  ],
  companies: [
    {
      name: String,
      position: String,
      location: {
        address: String,
        locationtype: String,
      },
      employment: String,
      startDate: {
        month: String,
        year: Number,
      },
      endDate: {
        month: String,
        year: Number,
      },
    },
  ],
  education: [
    {
      school: String,
      degree: String,
      fieldOfStudy: String,
      startDate: {
        month: String,
        year: Number,
      },
      endDate: {
        month: String,
        year: Number,
      },
      grade: String,
    },
  ],
  socialLinks: [
    {
      name: String,
      link: String,
      iv: String,
      faviconUrl: String,
    },
  ],
  passwordIv: String,
  dobIv: String,
  headlineIv: String,
  descriptionIv: String,
});

module.exports = mongoose.model("User", userSchema);

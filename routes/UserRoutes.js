const express = require("express");
const { authenticateUser } = require("../middleware/authMiddleware");
const {
  getUserById,
  updateUser,
  deleteUser,
  addProject,
  addSkill,
  removeSkill,
  updateSkill,
  removeProject,
  updateProject,
  addEducation,
  removeEducation,
  updateEducation,
  addCompany,
  removeCompany,
  updateCompany,
  addSocialLink,
  updateSocialLink,
  removeSocialLink,
  addHeadlineAndDescription,
  uploadProfilePicture,
  uploadBackgroundPicture,
} = require("../controllers/userController");
const {
  createUser,
  loginUser,
  logoutUser,
} = require("../controllers/authController");

const router = express.Router();

router
  .post("/", createUser)
  .post("/login", loginUser)
  .get("/:id", authenticateUser, getUserById)
  .patch("/:id", authenticateUser, updateUser)
  .delete("/:id", authenticateUser, deleteUser)
  .post("/logout", authenticateUser, logoutUser)
  .post("/:id/projects", authenticateUser, addProject)
  .delete("/:id/projects/:projectId", authenticateUser, removeProject)
  .patch("/:id/projects/:projectId", authenticateUser, updateProject)
  .post("/:id/skills", authenticateUser, addSkill)
  .delete("/:id/skills/:skillId", authenticateUser, removeSkill)
  .patch("/:id/skills/:skillId", authenticateUser, updateSkill)
  .post("/:id/education", authenticateUser, addEducation)
  .delete("/:id/education/:educationId", authenticateUser, removeEducation)
  .patch("/:id/education/:educationId", authenticateUser, updateEducation)
  .post("/:id/companies", authenticateUser, addCompany)
  .delete("/:id/companies/:companyId", authenticateUser, removeCompany)
  .patch("/:id/companies/:companyId", authenticateUser, updateCompany)
  .post("/:id/socialLinks", authenticateUser, addSocialLink)
  .patch("/:id/socialLinks/:linkId", authenticateUser, updateSocialLink)
  .delete("/:id/socialLinks/:linkId", authenticateUser, removeSocialLink)
  .patch("/:id/upload-profile-picture", authenticateUser, uploadProfilePicture)
  .patch(
    "/:id/headline-description",
    authenticateUser,
    addHeadlineAndDescription
  )
  .patch(
    "/:id/upload-background-picture",
    authenticateUser,
    uploadBackgroundPicture
  );

exports.router = router;

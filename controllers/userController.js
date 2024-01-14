const User = require("../models/User");
const {
  decryptField,
  encryptField,
  generateRandomIV,
} = require("../utils/cryptoUtils");
const axios = require("axios");
const cheerio = require("cheerio");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const updateAndDecryptField = async (id, field, newValue, ivField) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const newIV = generateRandomIV();
    user[field] = encryptField(newValue, newIV);
    user[ivField] = newIV;

    await user.save();
    return decryptField(user[field], user[ivField]);
  } catch (error) {
    throw error;
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;

    const uniqueFilename = `${uuidv4()}.${file.originalname.split(".").pop()}`;

    const uploadsDirectory = path.join(__dirname, "..", "uploads");
    await fs.mkdir(uploadsDirectory, { recursive: true });

    const filePath = path.join(uploadsDirectory, uniqueFilename);

    await fs.writeFile(filePath, file.buffer);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    await fs.unlink(filePath);

    await User.findByIdAndUpdate(userId, { profilePicture: result.secure_url });

    const updatedUser = await User.findById(userId);

    res.status(200).json(updatedUser.profilePicture);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.uploadBackgroundPicture = async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;

    const uniqueFilename = `${uuidv4()}.${file.originalname.split(".").pop()}`;

    const uploadsDirectory = path.join(__dirname, "..", "uploads");
    await fs.mkdir(uploadsDirectory, { recursive: true });

    const filePath = path.join(uploadsDirectory, uniqueFilename);

    await fs.writeFile(filePath, file.buffer);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    await fs.unlink(filePath);

    await User.findByIdAndUpdate(userId, {
      profileBackgroundPicture: result.secure_url,
    });

    const updatedUser = await User.findById(userId);

    res.status(200).json(updatedUser.profileBackgroundPicture);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const {
      password,
      passwordIv,
      dobIv,
      descriptionIv,
      headlineIv,
      socialLinks,
      ...internalFields
    } = user.toObject();

    internalFields.dateOfBirth = decryptField(
      internalFields.dateOfBirth,
      user.dobIv
    );
    if (internalFields.headline) {
      internalFields.headline = decryptField(
        internalFields.headline,
        user.headlineIv
      );
    }
    if (internalFields.description) {
      internalFields.description = decryptField(
        internalFields.description,
        user.descriptionIv
      );
    }

    const encryptedSocialLinks = socialLinks.map((socialLink) => ({
      _id: socialLink._id,
      name: socialLink.name,
      link: decryptField(socialLink.link, socialLink.iv),
      iv: socialLink.iv,
      faviconUrl: socialLink.faviconUrl,
    }));

    const finalData = {
      ...internalFields,
      socialLinks: encryptedSocialLinks,
    };
    res.status(200).json(finalData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    if (updatedData.password) {
      updatedData.password = await updateAndDecryptField(
        id,
        "password",
        updatedData.password,
        "passwordIv"
      );
    }
    if (updatedData.dateOfBirth) {
      updatedData.dateOfBirth = await updateAndDecryptField(
        id,
        "dateOfBirth",
        updatedData.dateOfBirth,
        "dobIv"
      );
    }

    const user = await User.findByIdAndUpdate(id, updatedData, { new: true });
    res.status(200).json("Updated Successfully");
  } catch (error) {
    res.status(400).json(error.message);
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndDelete(id);
    user.password = decryptField(user.password, user.passwordIv);
    user.dateOfBirth = decryptField(user.dateOfBirth, user.dobIv);

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.addSkill = async (req, res) => {
  const { id } = req.params;
  const { name, level } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!name || !level) {
      return res.status(400).json({ error: "Name and level are required" });
    }

    user.skills.push({ name, level });
    await user.save();

    res.status(200).json(user.skills);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.removeSkill = async (req, res) => {
  const { id, skillId } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.skills = user.skills.filter((skill) => skill._id != skillId);
    await user.save();

    res.status(200).json(user.skills);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.updateSkill = async (req, res) => {
  const { id, skillId } = req.params;
  const { name, level } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const skill = user.skills.find((skill) => skill._id == skillId);

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    if (!name && !level) {
      return res
        .status(400)
        .json({ error: "Name or level is required for update" });
    }

    if (name) skill.name = name;
    if (level) skill.level = level;

    await user.save();

    res.status(200).json(user.skills);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.addProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, startDate, endDate, githubLink, deployedLink } =
    req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.projects.push({
      title,
      description,
      startDate,
      endDate,
      githubLink,
      deployedLink,
    });
    await user.save();

    res.status(200).json(user.projects);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.removeProject = async (req, res) => {
  const { id, projectId } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.projects = user.projects.filter((project) => project._id != projectId);
    await user.save();

    res.status(200).json(user.projects);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.updateProject = async (req, res) => {
  const { id, projectId } = req.params;
  const { title, description, startDate, endDate, githubLink, deployedLink } =
    req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const project = user.projects.find((project) => project._id == projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (title) project.title = title;
    if (description) project.description = description;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (githubLink) project.githubLink = githubLink;
    if (deployedLink) project.deployedLink = deployedLink;

    await user.save();

    res.status(200).json(user.projects);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.addEducation = async (req, res) => {
  const { id } = req.params;
  const { school, degree, fieldOfStudy, startDate, endDate, grade } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.education.push({
      school,
      degree,
      fieldOfStudy,
      startDate,
      endDate,
      grade,
    });

    await user.save();

    res.status(200).json(user.education);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.removeEducation = async (req, res) => {
  const { id, educationId } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.education = user.education.filter((edu) => edu._id != educationId);
    await user.save();

    res.status(200).json(user.education);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.updateEducation = async (req, res) => {
  const { id, educationId } = req.params;
  const { school, degree, fieldOfStudy, startDate, endDate, grade } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const education = user.education.find((edu) => edu._id == educationId);

    if (!education) {
      return res.status(404).json({ error: "Education entry not found" });
    }

    if (school) education.school = school;
    if (degree) education.degree = degree;
    if (fieldOfStudy) education.fieldOfStudy = fieldOfStudy;
    if (startDate) education.startDate = startDate;
    if (endDate) education.endDate = endDate;
    if (grade) education.grade = grade;

    await user.save();

    res.status(200).json(user.education);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.addCompany = async (req, res) => {
  const { id } = req.params;
  const { name, location, employment, startDate, endDate, position } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.companies.push({
      name,
      location,
      employment,
      position,
      startDate,
      endDate,
    });

    await user.save();

    res.status(200).json(user.companies);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.removeCompany = async (req, res) => {
  const { id, companyId } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.companies = user.companies.filter(
      (company) => company._id != companyId
    );
    await user.save();

    res.status(200).json(user.companies);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.updateCompany = async (req, res) => {
  const { id, companyId } = req.params;
  const { name, location, employment, startDate, endDate, position } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const company = user.companies.find((company) => company._id == companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (name) company.name = name;
    if (position) company.position = position;
    if (location) {
      if (location.address) company.location.address = location.address;
      if (location.locationtype)
        company.location.locationtype = location.locationtype;
    }
    if (employment) company.employment = employment;
    if (startDate) {
      if (startDate.month) company.startDate.month = startDate.month;
      if (startDate.year) company.startDate.year = startDate.year;
    }
    if (endDate) {
      if (endDate.month) company.endDate.month = endDate.month;
      if (endDate.year) company.endDate.year = endDate.year;
    }

    await user.save();

    res.status(200).json(user.companies);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.addSocialLink = async (req, res) => {
  const { id } = req.params;
  const { name, link } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!name || !link) {
      return res.status(400).json({ error: "Name and link are required" });
    }

    const faviconUrl = await fetchFavicon(link);

    const iv = generateRandomIV();
    const encryptedLink = encryptField(link, iv);

    user.socialLinks.push({ name, link: encryptedLink, iv, faviconUrl });
    await user.save();

    const decryptedSocialLinks = user.socialLinks.map((socialLink) => ({
      _id: socialLink._id,
      name: socialLink.name,
      link: decryptField(socialLink.link, socialLink.iv),
      iv: socialLink.iv,
      faviconUrl: socialLink.faviconUrl,
    }));

    res.status(201).json(decryptedSocialLinks);
  } catch (error) {
    console.error("Error adding social link:", error);
    res.status(500).json(error);
  }
};

const fetchFavicon = async (link) => {
  try {
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);
    const faviconUrl = $("link[rel='icon']").attr("href");

    if (!faviconUrl) {
      console.log("Favicon not found");
      return null;
    }

    return faviconUrl;
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return null;
  }
};

exports.updateSocialLink = async (req, res) => {
  const { id, linkId } = req.params;
  const { name, link } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const socialLink = user.socialLinks.id(linkId);

    if (!socialLink) {
      return res.status(404).json({ error: "Social link not found" });
    }

    if (name) socialLink.name = name;
    if (link) {
      const iv = generateRandomIV();
      const encryptedLink = encryptField(link, iv);

      socialLink.link = encryptedLink;
      socialLink.iv = iv;
    }

    await user.save();

    const decryptedSocialLinks = user.socialLinks.map((socialLink) => ({
      _id: socialLink._id,
      name: socialLink.name,
      link: decryptField(socialLink.link, socialLink.iv),
      iv: socialLink.iv,
      faviconUrl: socialLink.faviconUrl,
    }));
    res.status(200).json(decryptedSocialLinks);
  } catch (error) {
    console.error("Error updating social link:", error);
    res.status(500).json(error);
  }
};

exports.removeSocialLink = async (req, res) => {
  const { id, linkId } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const socialLinkIndex = user.socialLinks.findIndex(
      (link) => link._id == linkId
    );

    if (socialLinkIndex === -1) {
      return res.status(404).json({ error: "Social link not found" });
    }

    user.socialLinks.splice(socialLinkIndex, 1);
    await user.save();
    const decryptedSocialLinks = user.socialLinks.map((socialLink) => ({
      _id: socialLink._id,
      name: socialLink.name,
      link: decryptField(socialLink.link, socialLink.iv),
      iv: socialLink.iv,
      faviconUrl: socialLink.faviconUrl,
    }));
    res.status(200).json(decryptedSocialLinks);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

exports.addHeadlineAndDescription = async (req, res) => {
  const { id } = req.params;
  const { headline, description } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.headline = encryptField(headline, user.headlineIv);
    user.description = encryptField(description, user.descriptionIv);

    await user.save();

    const decryptedHeadline = decryptField(user.headline, user.headlineIv);
    const decryptedDescription = decryptField(
      user.description,
      user.descriptionIv
    );

    res.status(200).json({
      headline: decryptedHeadline,
      description: decryptedDescription,
    });
  } catch (error) {
    console.error("Error adding headline and description:", error);
    res.status(500).json(error);
  }
};

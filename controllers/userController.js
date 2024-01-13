const User = require("../models/User");
const {
  decryptField,
  encryptField,
  generateRandomIV,
} = require("../utils/cryptoUtils");

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

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract sensitive fields for internal use
    const {
      password,
      passwordIv,
      dobIv,
      descriptionIv,
      headlineIv,
      ...internalFields
    } = user.toObject();

    // Decrypt specific fields for internal use
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

    // Create the final data to be sent in the response (excluding sensitive fields)
    const finalData = {
      ...internalFields /* Add other non-sensitive fields here */,
    };

    res.status(200).json(finalData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a user by ID
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

// Delete a user by ID
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

// Add a new skill to the user's profile

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

// Remove a skill from the user's profile
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

// Update a skill in the user's profile
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

// Add a new education entry to the user's profile
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

// Remove an education entry from the user's profile
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

// Update an education entry in the user's profile
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


// Add a new company to the user's profile
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

// Remove a company from the user's profile
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

// Update a company in the user's profile
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

    // Fetch the favicon from the link
    const faviconUrl = await fetchFavicon(link);

    // Encrypt the link and store it with IV
    const iv = generateRandomIV(); // Generate IV for the link
    const encryptedLink = encryptField(link, iv);

    user.socialLinks.push({ name, link: encryptedLink, iv, faviconUrl });
    await user.save();

    console.log("Link added:", { name, link: encryptedLink, iv, faviconUrl });
    res.status(201).json(user.socialLinks);
  } catch (error) {
    console.error("Error adding social link:", error);
    res.status(500).json(error);
  }
};

// Function to fetch favicon from a given link
const fetchFavicon = async (link) => {
  try {
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);
    const faviconUrl = $("link[rel='icon']").attr("href");
    return faviconUrl;
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return null; // Return null if favicon is not found or there's an error
  }
};

// Update a social link for the user
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
      // Generate a new IV for the updated link
      const iv = generateRandomIV();
      const encryptedLink = encryptField(link, iv);

      socialLink.link = encryptedLink;
      socialLink.iv = iv;
    }

    await user.save();

    res.status(200).json(user.socialLinks);
  } catch (error) {
    console.error("Error updating social link:", error);
    res.status(500).json(error);
  }
};

// Remove a social link from the user
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

    res.status(200).json(user.socialLinks);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
};

// Get the social links in their original format
exports.getSocialLinks = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Decrypt the links before sending the response
    const decryptedLinks = user.socialLinks.map((socialLink) => {
      const { name, link, iv } = socialLink;
      const decryptedLink = decryptField(link, iv);
      return { name, link: decryptedLink };
    });

    console.log("Decrypted links:", decryptedLinks);
    res.status(200).json(decryptedLinks);
  } catch (error) {
    console.error("Error getting social links:", error);
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

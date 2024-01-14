const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const crypto = require("crypto");
dotenv.config();
const secretKeyHex = process.env.SECRET_KEY;

function generateRandomIV() {
  return crypto.randomBytes(16).toString("hex");
}

function encryptData(data, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secretKeyHex, "hex"),
    Buffer.from(iv, "hex")
  );

  let encryptedData = cipher.update(data, "utf-8", "hex");
  encryptedData += cipher.final("hex");
  return encryptedData;
}

function decryptData(encryptedData, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secretKeyHex, "hex"),
    Buffer.from(iv, "hex")
  );

  let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
  decryptedData += decipher.final("utf-8");
  return decryptedData;
}

exports.createUser = async (req, res) => {
  const requiredFields = ["name", "email", "dateOfBirth", "password"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);
  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }
  const newUser = new User(req.body);

  const passwordIv = generateRandomIV();
  const dobIv = generateRandomIV();
  const headlineIv = generateRandomIV();
  const descriptionIv = generateRandomIV();
  newUser.password = encryptData(newUser.password, passwordIv);
  newUser.passwordIv = passwordIv;
  newUser.dateOfBirth = encryptData(newUser.dateOfBirth, dobIv);
  newUser.dobIv = dobIv;
  newUser.headlineIv = headlineIv;
  newUser.descriptionIv = descriptionIv;

  try {
    const savedUser = await newUser.save();
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

exports.loginUser = async (req, res) => {
  const requiredFields = ["email", "password"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({ error: "Wrong Credentials" });
    }

    const databasepassword = decryptData(user.password, user.passwordIv);
    console.log(password, databasepassword);
    if (databasepassword !== password) {
      return res.status(403).json({ error: "Wrong Credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.logoutUser = (req, res) => {
  try {
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

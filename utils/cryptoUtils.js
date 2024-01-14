const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const secretKeyHex = process.env.SECRET_KEY;

const generateRandomIV = () => crypto.randomBytes(16).toString("hex");

const encryptField = (data, iv) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secretKeyHex, "hex"),
    Buffer.from(iv, "hex")
  );

  let encryptedData = cipher.update(data, "utf-8", "hex");
  encryptedData += cipher.final("hex");
  return encryptedData;
};

const decryptField = (encryptedData, iv) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secretKeyHex, "hex"),
    Buffer.from(iv, "hex")
  );

  let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
  decryptedData += decipher.final("utf-8");
  return decryptedData;
};

module.exports = { generateRandomIV, encryptField, decryptField };

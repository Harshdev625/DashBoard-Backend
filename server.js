const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const app = express();
const dotenv = require("dotenv");
const userRoutes = require("./routes/UserRoutes");
const bodyParser = require("body-parser");

dotenv.config();
app.use(cors());

main().catch((err) => console.error(err));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

app.use("/users", upload.single("file"), userRoutes.router);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

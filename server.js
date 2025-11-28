// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB Atlas connection
const mongoURI = "mongodb+srv://mohancc:SGwZeEskbiur9mfK@cluster0.ioqrsn2.mongodb.net/agriculture?retryWrites=true&w=majority";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => console.log("✅ MongoDB Atlas connected successfully!"));

// Schema for agriculture data
const cropSchema = new mongoose.Schema({
  district: { type: String, required: true },
  crop: { type: String, required: true },
  production: { type: Number, required: true },
  year: { type: Number, required: true },
  area: Number,
  rainfall: Number,
  temperature: Number,
  soilType: String,
  irrigation: String,
  yield: Number,
  humidity: Number,
  price: Number,
  season: String,
});

const Crop = mongoose.model("Crop", cropSchema, "crops"); // explicitly set collection name

// ------------------ API Endpoints ------------------ //

// GET all data
app.get("/data", async (req, res) => {
  try {
    const data = await Crop.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET data by district
app.get("/data/district/:district", async (req, res) => {
  try {
    const data = await Crop.find({ district: req.params.district });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET data by year
app.get("/data/year/:year", async (req, res) => {
  try {
    const data = await Crop.find({ year: parseInt(req.params.year) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new crop data
app.post("/data", async (req, res) => {
  try {
    const crop = new Crop(req.body);
    const savedCrop = await crop.save();
    res.status(201).json(savedCrop);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE crop data by ID
app.delete("/data/:id", async (req, res) => {
  try {
    const deleted = await Crop.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Data deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT / UPDATE crop data by ID
app.put("/data/:id", async (req, res) => {
  try {
    const updated = await Crop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Data not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET dynamic analytics data
app.get('/analytics/dynamic', async (req, res) => {
  const { x, y } = req.query;
  if (!x || !y) return res.status(400).json({ error: 'X and Y fields required' });

  // Map user-facing fields to DB fields
  const fieldMap = {
    'Year': 'year',
    'Location': 'district',
    'Area': 'area',
    'Rainfall': 'rainfall',
    'Temperature': 'temperature',
    'Soil type': 'soilType',
    'Irrigation': 'irrigation',
    'Yeilds': 'yield',
    'Humidity': 'humidity',
    'Crops': 'crop',
    'Price': 'price',
    'Season': 'season'
  };

  const xField = fieldMap[x];
  const yField = fieldMap[y];
  if (!xField || !yField) return res.status(400).json({ error: 'Invalid field' });

  const numericFields = ['year', 'area', 'rainfall', 'temperature', 'yield', 'humidity', 'price'];
  const isYNumeric = numericFields.includes(yField);

  const pipeline = [
    { $group: {
      _id: `$${xField}`,
      [yField]: isYNumeric ? { $avg: `$${yField}` } : { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ];

  try {
    const result = await Crop.aggregate(pipeline);
    const labels = result.map(r => r._id);
    const data = result.map(r => r[yField]);
    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("🌱 Agriculture Data API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

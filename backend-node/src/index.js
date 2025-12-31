// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());                 // Allow requests from React Native
app.use(express.json());         // Parse JSON bodies (e.g., logs from phone)

// 1. Basic Health Check Route
app.get('/', (req, res) => {
  res.send({ 
    status: 'Online', 
    message: 'ScreenMind Manager (Node.js) is running!', 
    timestamp: new Date()
  });
});

// 2. Start the Server
app.listen(PORT, () => {
  console.log(`\n🚀 ScreenMind Manager running on http://localhost:${PORT}`);
  console.log(`👉 Environment: ${process.env.NODE_ENV || 'Development'}\n`);
});
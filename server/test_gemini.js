const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testSum() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return console.log("ERROR: GEMINI_API_KEY is missing in .env");
  
  const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
  const genAI = new GoogleGenerativeAI(key);

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'Test'");
      const response = await result.response;
      console.log(`SUCCESS with ${modelName}:`, response.text());
      return; // Exit on first success
    } catch (err) {
      console.log(`FAILED ${modelName}:`, err.message);
    }
  }
}

testSum();

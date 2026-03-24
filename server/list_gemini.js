const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return console.log("ERROR: GEMINI_API_KEY is missing");
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    // There isn't a direct "listModels" in the standard SDK easily accessible without an authenticated client,
    // but we can try common ones and see the error message.
    
    // Some keys require v1 instead of v1beta
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
    for (const m of models) {
        try {
            console.log(`Checking ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent("hi");
            console.log(`✅ ${m} WORKS!`);
            return;
        } catch (e) {
            console.log(`❌ ${m} FAILED: ${e.message}`);
        }
    }
  } catch (err) {
    console.log("CRITICAL ERROR:", err.message);
  }
}

listModels();

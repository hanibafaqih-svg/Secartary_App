import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: '../backend/.env' });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : 'None');

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in backend/.env");
  process.exit(1);
}

const ai = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}`);
  try {
    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, write a single test sentence in Arabic.");
    console.log(`[SUCCESS] Response from ${modelName}:`, result.response.text());
    return true;
  } catch (error) {
    console.error(`[FAILED] Model ${modelName} error:`, error.message);
    return false;
  }
}

async function run() {
  const models = ['gemini-3.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  for (const m of models) {
    await testModel(m);
  }
}

run();

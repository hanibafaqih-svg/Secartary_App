import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function run() {
  try {
    const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    console.log("Raw JSON starts with:", saRaw.substring(0, 50));
    const credentials = JSON.parse(saRaw);
    
    // Test without replace first
    console.log("Testing auth without replace...");
    const auth1 = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    const client1 = await auth1.getClient();
    console.log("Auth 1 succeeded! Client email:", client1.email);
    
  } catch (e) {
    console.error("Auth 1 failed:", e);
    
    try {
      // Test with replace
      console.log("Testing auth with replace...");
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      const auth2 = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      const client2 = await auth2.getClient();
      console.log("Auth 2 succeeded! Client email:", client2.email);
    } catch (e2) {
      console.error("Auth 2 failed:", e2);
    }
  }
}

run();

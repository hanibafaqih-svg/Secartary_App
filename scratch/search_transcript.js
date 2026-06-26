const fs = require('fs');
const path = require('path');
const readline = require('readline');

const appDataDir = 'C:\\Users\\Hani\\.gemini\\antigravity';
const conversationId = '81013e0f-28a5-4ac0-8a38-2d7543e04a18';
const transcriptPath = path.join(appDataDir, 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl');

if (!fs.existsSync(transcriptPath)) {
  console.log(`Transcript not found at: ${transcriptPath}`);
  process.exit(0);
}

console.log(`Searching transcript: ${transcriptPath}`);
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (line.includes('pdf-lib') || line.includes('PDFDocument') || line.includes('drawText')) {
    try {
      const parsed = JSON.parse(line);
      console.log(`\n--- Match at Line ${lineNum} (Type: ${parsed.type}, Source: ${parsed.source}) ---`);
      // Print first 500 chars of content
      const content = parsed.content || '';
      console.log(content.substring(0, 800) + (content.length > 800 ? '...' : ''));
      if (parsed.tool_calls) {
        console.log('Tool calls:', JSON.stringify(parsed.tool_calls).substring(0, 500));
      }
    } catch (e) {
      console.log(`Line ${lineNum} matches but isn't valid JSON: ${line.substring(0, 200)}`);
    }
  }
});

rl.on('close', () => {
  console.log('\nSearch completed.');
});

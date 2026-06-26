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

console.log(`Searching transcript for vercel deployment commands...`);
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (/vercel/i.test(line) && /CommandLine/i.test(line)) {
    try {
      const parsed = JSON.parse(line);
      console.log(`\n--- Line ${lineNum} ---`);
      if (parsed.tool_calls) {
        console.log(JSON.stringify(parsed.tool_calls, null, 2));
      }
    } catch (e) {}
  }
});

rl.on('close', () => {
  console.log('\nSearch completed.');
});

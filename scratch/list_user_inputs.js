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

console.log(`Reading USER_INPUT steps from transcript...`);
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  try {
    const parsed = JSON.parse(line);
    if (parsed.type === 'USER_INPUT') {
      console.log(`\n=== User Input at Line ${lineNum} ===`);
      console.log(parsed.content);
    }
  } catch (e) {
    // Ignore invalid JSON lines
  }
});

rl.on('close', () => {
  console.log('\nFinished reading user inputs.');
});

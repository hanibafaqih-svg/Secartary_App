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

console.log(`Searching transcript for "pdf"...`);
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (/pdf/i.test(line)) {
    try {
      const parsed = JSON.parse(line);
      // Only print model or user messages that contain "pdf" but not our recent search scripts
      if (parsed.type === 'USER_INPUT' || parsed.type === 'PLANNER_RESPONSE' || parsed.type === 'MODEL_RESPONSE') {
        if (!line.includes('search_pdf_lib') && !line.includes('search_all_files') && !line.includes('search_transcript')) {
          console.log(`\n--- Line ${lineNum} (${parsed.type}) ---`);
          console.log((parsed.content || '').substring(0, 500));
        }
      }
    } catch (e) {}
  }
});

rl.on('close', () => {
  console.log('\nSearch completed.');
});

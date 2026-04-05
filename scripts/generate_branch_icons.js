const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyDrZqk78jTFkdoqZ98iaa_OjYTPHKMMu28';
const MODEL = 'gemini-2.5-flash-image';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets', 'base', 'branch_icons');

const ICONS = [
  {
    file: 'infantry.png',
    prompt: 'A single modern infantry soldier in full tactical gear holding an assault rifle, combat stance. Realistic military illustration. Solid dark background color #1A1A14 (very dark olive-black). No text, no border. 256x256 square.'
  },
  {
    file: 'armor.png',
    prompt: 'A single modern main battle tank like M1 Abrams, 3/4 front view, barrel forward. Realistic military illustration. Solid dark background color #1A1A14 (very dark olive-black). No text, no border. 256x256 square.'
  },
  {
    file: 'air.png',
    prompt: 'A single modern fighter jet like F-16 in dynamic flight angle. Realistic military illustration. Solid dark background color #1A1A14 (very dark olive-black). No text, no border. 256x256 square.'
  },
  {
    file: 'naval.png',
    prompt: 'A single modern naval warship destroyer, 3/4 front view. Realistic military illustration. Solid dark background color #1A1A14 (very dark olive-black). No text, no border. 256x256 square.'
  },
  {
    file: 'airDefense.png',
    prompt: 'A single modern air defense missile system like Patriot PAC-3 with radar and missiles elevated. Realistic military illustration. Solid dark background color #1A1A14 (very dark olive-black). No text, no border. 256x256 square.'
  },
];

// Ensure output directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 429) {
          resolve({ retry: true });
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const parts = json.candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
          if (imgPart) {
            resolve({ base64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType });
          } else {
            reject(new Error('No image in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`Generating ${ICONS.length} branch icons...`);

  for (const icon of ICONS) {
    const outPath = path.join(ASSETS_DIR, icon.file);
    if (fs.existsSync(outPath)) {
      console.log(`SKIP ${icon.file} (already exists)`);
      continue;
    }

    console.log(`Generating ${icon.file}...`);
    let attempts = 0;
    while (attempts < 3) {
      try {
        const result = await generateImage(icon.prompt);
        if (result.retry) {
          console.log('  Rate limited, waiting 35s...');
          await new Promise((r) => setTimeout(r, 35000));
          attempts++;
          continue;
        }
        const buffer = Buffer.from(result.base64, 'base64');
        fs.writeFileSync(outPath, buffer);
        console.log(`  OK -> ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
        break;
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
        attempts++;
        if (attempts < 3) await new Promise((r) => setTimeout(r, 5000));
      }
    }
    // Rate limit delay
    await new Promise((r) => setTimeout(r, 4000));
  }

  console.log('Done!');
}

main();

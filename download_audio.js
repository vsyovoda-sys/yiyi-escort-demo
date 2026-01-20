const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. 读取 env.js 获取 Key
function getEnvConfig() {
    try {
        const envContent = fs.readFileSync('env.js', 'utf8');
        const groupIdMatch = envContent.match(/GROUP_ID:\s*['"]([^'"]+)['"]/);
        const apiKeyMatch = envContent.match(/API_KEY:\s*['"]([^'"]+)['"]/);
        
        if (!groupIdMatch || !apiKeyMatch) {
            throw new Error("Cannot define keys from env.js");
        }
        return {
            GROUP_ID: groupIdMatch[1],
            API_KEY: apiKeyMatch[1]
        };
    } catch (e) {
        console.error("Error reading env.js:", e.message);
        process.exit(1);
    }
}

const config = getEnvConfig();

// 2. 定义对话内容 (与 index.html 保持一致)
const dialogs = [
    { id: 'ai_intro', text: '下午好，我是您的专属医疗健康助理依依。请问您怎么称呼？' },
    { id: 'ai_age', text: '张阿姨您好。为了给您建立更准确的健康档案，我想先了解一下，您今年多大年纪了？' },
    { id: 'ai_check_risk', text: '65岁，看着一点都不像呢。不过张阿姨，咱们女性到了这个年纪，钙流失会快一些，容易出现骨质疏松。您平时有没有觉得腰酸背痛，或者腿脚抽筋的情况呀？' },
    { id: 'ai_living_status', text: '那是得注意了，这可能是骨关节发出的信号。平时您去医院做检查或者理疗，是孩子们陪着您去吗？' },
    { id: 'ai_safety_log', text: '一个人跑医院确实辛苦，也不太安全。我已经在您的档案里特别备注了“独居看护”重点关注。张阿姨，以后哪怕只是感觉身体有一点点不舒服，或者仅仅是想找人说说话，随时点开我，依依会一直陪在您身边的。' }
];

const OUTPUT_DIR = path.join(__dirname, 'assets', 'audio');

// 3. 下载逻辑
async function downloadAudio(id, text) {
    console.log(`[Processing] ${id}: ${text.substring(0, 20)}...`);
    const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);
    
    if (fs.existsSync(filePath)) {
        console.log(`  - File exists, skipping.`);
        return;
    }

    const postData = JSON.stringify({
        model: "speech-01-turbo",
        text: text,
        stream: false,
        voice_setting: {
            voice_id: "female-chengshu",
            speed: 1.0,
            vol: 1.0,
            pitch: 0
        }
    });

    const options = {
        hostname: 'api.minimax.chat',
        path: `/v1/t2a_v2?GroupId=${config.GROUP_ID}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.base_resp && json.base_resp.status_code !== 0) {
                        reject(json.base_resp.status_msg);
                        return;
                    }
                    if (!json.data || !json.data.audio) {
                        reject("No audio data");
                        return;
                    }

                    // Hex to Buffer
                    const fileBuffer = Buffer.from(json.data.audio, 'hex');
                    fs.writeFileSync(filePath, fileBuffer);
                    console.log(`  - Downloaded to ${filePath}`);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// 4. 执行
async function run() {
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log("Starting audio download...");
    for (const d of dialogs) {
        try {
            await downloadAudio(d.id, d.text);
        } catch (e) {
            console.error(`Error downloading ${d.id}:`, e);
        }
    }
    console.log("All downloads complete.");
}

run();

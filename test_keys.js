const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// 1. Read Keys
const envContent = fs.readFileSync('env.js', 'utf8');
const groupIdMatch = envContent.match(/GROUP_ID:\s*"([^"]+)"/);
const apiKeyMatch = envContent.match(/API_KEY:\s*"([^"]+)"/);
const zhipuKeyMatch = envContent.match(/ZHIPU_API_KEY:\s*"([^"]+)"/);

const CONFIG = {
    GROUP_ID: groupIdMatch ? groupIdMatch[1] : '',
    API_KEY: apiKeyMatch ? apiKeyMatch[1] : '',
    ZHIPU_KEY: zhipuKeyMatch ? zhipuKeyMatch[1] : ''
};

console.log("Checking keys...");
console.log(`MiniMax GroupID: ${CONFIG.GROUP_ID ? 'Found' : 'Missing'}`);
console.log(`MiniMax API_KEY: ${CONFIG.API_KEY ? 'Found' : 'Missing'}`);
console.log(`Zhipu API_KEY: ${CONFIG.ZHIPU_KEY ? 'Found' : 'Missing'}`);

// --- Zhipu JWT Generator ---
function generateZhipuToken(apiKey, ttlSeconds = 60) {
    const [id, secret] = apiKey.split('.');
    if (!id || !secret) return null;

    const now = Date.now();
    const exp = now + (ttlSeconds * 1000);
    
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ api_key: id, exp: exp, timestamp: now })).toString('base64url');
    
    const signature = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'))
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

// --- Test Functions ---

function testZhipu() {
    return new Promise((resolve) => {
        console.log("\n[Testing Zhipu AI...]");
        
        try {
            const token = generateZhipuToken(CONFIG.ZHIPU_KEY);
            if (!token) {
                 console.log("❌ Zhipu Token Gen Failed (Invalid Key Format?)");
                 resolve(false);
                 return;
            }

            const req = https.request({
                hostname: 'open.bigmodel.cn',
                path: '/api/paas/v4/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const j = JSON.parse(data);
                            console.log("✅ Zhipu Connection Success!");
                            console.log("   Response:", j.choices[0].message.content);
                            resolve(true);
                        } catch(e) {
                            console.log("❌ Zhipu Parse Error:", e);
                            resolve(false);
                        }
                    } else {
                        console.log(`❌ Zhipu Error: ${res.statusCode}`, data);
                        resolve(false);
                    }
                });
            });
            
            req.on('error', e => { console.log("❌ Zhipu Network Error", e); resolve(false); });
            req.write(JSON.stringify({
                model: "glm-4-flash",
                messages: [{ role: "user", content: "Hello" }]
            }));
            req.end();
        } catch (e) {
            console.log("❌ Zhipu Exception:", e.message);
            resolve(false);
        }
    });
}

function testMiniMax() {
    return new Promise((resolve) => {
        console.log("\n[Testing MiniMax TTS...]");
        const req = https.request({
            hostname: 'api.minimax.chat',
            path: `/v1/t2a_v2?GroupId=${CONFIG.GROUP_ID}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const j = JSON.parse(data);
                        if(j.base_resp && j.base_resp.status_code !== 0) {
                             console.log(`❌ MiniMax API Error: ${j.base_resp.status_msg}`);
                             resolve(false);
                        } else {
                            console.log("✅ MiniMax Connection Success!");
                            resolve(true);
                        }
                    } catch(e) {
                         console.log("❌ MiniMax Parse Error");
                         resolve(false);
                    }
                } else {
                    console.log(`❌ MiniMax HTTP Error: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', e => { console.log("❌ MiniMax Network Error"); resolve(false); });
        req.write(JSON.stringify({
            model: "speech-01-turbo",
            text: "Hello",
            stream: false,
            voice_setting: {
                voice_id: "female-chengshu",
                speed: 1,
                vol: 1,
                pitch: 0
            }
        }));
        req.end();
    });
}

async function run() {
    await testZhipu();
    await testMiniMax();
}

run();

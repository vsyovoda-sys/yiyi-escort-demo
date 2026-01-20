// ==========================================
// 环境变量示例文件 (可提交到 GitHub)
// ==========================================
// 这是一个模板文件。
// 本地开发时，请复制此文件并重命名为 "env.js"，然后在 "env.js" 中填入您的真实密钥。
//
// 获取密钥:
// - MiniMax TTS: https://www.minimax.chat/ 注册后在控制台获取
// - 智谱 AI: https://open.bigmodel.cn/ 注册后获取

window.MINIMAX_ENV = {
    // MiniMax TTS 配置
    GROUP_ID: "YOUR_MINIMAX_GROUP_ID",
    API_KEY: "YOUR_MINIMAX_API_KEY",
    
    // 智谱 AI (GLM-4) - 用于对话 (仅 realtime 版本需要)
    ZHIPU_API_KEY: "YOUR_ZHIPU_API_KEY", // 格式: id.secret

    // 语音配置
    VOICE_ID: "female-chengshu", 
    MODEL_ID: "speech-01-turbo", 
};
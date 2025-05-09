const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({
  // API Gateway 服务仅支持上海地区，请注意修改地区
  // env: cloud.DYNAMIC_CURRENT_ENV // 表示当前小程序所属环境 cloud.DYNAMIC_CURRENT_ENV
});

// IMPORTANT: Store your API key securely, preferably in environment variables
const DEEPSEEK_API_KEY = 'sk-4da0d3678f634ea888e69d449bc352e6'; // Replace with your actual key or environment variable

// Define system prompts (similar to your route.ts)
const baseIdentity = "你是名为「集思特」的AI聊天助手，是一位专注于GIST（胃肠间质瘤）领域的专家。当用户询问GIST相关问题时，你将以专业、清晰的方式解答。如果用户询问与GIST领域无关的问题，你应礼貌地回应：\"很抱歉，我仅专注于回答GIST相关的问题。\" 请注意，你的身份只有一个，即「集思特」，不要提及其他任何AI品牌或角色设定。";

const systemPrompts = {
  default: baseIdentity,
  imaging: `${baseIdentity} 在此对话中，你尤其关注GIST影像学分析。请分析以下影像数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  clinical: `${baseIdentity} 在此对话中，你尤其关注GIST临床数据分析。请分析以下临床数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  genomics: `${baseIdentity} 在此对话中，你尤其关注GIST的基因组学、蛋白质组学和代谢组学。请分析以下组学数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  position: `${baseIdentity} 在此对话中，你尤其关注解剖位置与GIST之间的关系。请分析以下与胃间质瘤相关的解剖位置查询，并提供精准和科学的分析。`,
  recommendations: `${baseIdentity} 在此对话中，你的任务是基于提供的患者数据，进行初步的诊断洞察和治疗建议。请以清晰的章节结构化你的回应，包括诊断概率、关键发现和建议的后续步骤。请注意，你的建议旨在协助临床科学家，不应取代专业的医疗判断。`
};

exports.main = async (event, context) => {
  const { messages, aiRole } = event;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: 'Invalid messages input' };
  }

  let processedMessages = [...messages];
  const selectedSystemPrompt = aiRole && systemPrompts[aiRole] ? systemPrompts[aiRole] : systemPrompts.default;

  if (processedMessages.length > 0 && processedMessages[0].role === 'system') {
    processedMessages[0].content = selectedSystemPrompt;
  } else {
    processedMessages.unshift({ role: 'system', content: selectedSystemPrompt });
  }
  processedMessages = processedMessages.filter((msg, index) => !(msg.role === 'system' && index > 0));

  const postData = JSON.stringify({
    model: 'deepseek-chat', // Or 'deepseek-coder' if that's preferred for some tasks
    messages: processedMessages,
    stream: false // WeChat cloud functions typically don't handle streams back to client easily
    // Add other parameters like temperature, max_tokens if needed
  });

  const options = {
    hostname: 'api.deepseek.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Assuming the response structure from DeepSeek is similar to OpenAI
            // { choices: [ { message: { role: 'assistant', content: '...' } } ] }
            if (parsedData.choices && parsedData.choices.length > 0 && parsedData.choices[0].message) {
              resolve({ success: true, content: parsedData.choices[0].message.content, rawResponse: parsedData });
            } else {
              resolve({ success: false, error: 'Unexpected response structure from AI.', details: parsedData });
            }
          } else {
            resolve({ success: false, error: `API request failed with status: ${res.statusCode}`, details: parsedData });
          }
        } catch (e) {
          resolve({ success: false, error: 'Error parsing AI response.', details: e.message, rawData });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: 'Error making API request.', details: e.message });
    });

    req.write(postData);
    req.end();
  });
}; 
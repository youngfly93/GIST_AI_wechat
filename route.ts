import { createOpenAI } from '@ai-sdk/openai';
import { streamText, CoreMessage } from 'ai';
import { NextRequest } from 'next/server';

// IMPORTANT: Set the DEEPSEEK_API_KEY environment variable
// Example: Create a .env.local file in your project root with:
// DEEPSEEK_API_KEY=your_actual_deepseek_api_key

// Check if the API key is set
if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY environment variable is not set.');
}

// Configure the DeepSeek client using the OpenAI provider from the Vercel AI SDK
const deepSeekProvider = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

// Define system prompts based on src/utils/ai-service copy.ts
const baseIdentity = "你是名为「集思特」的AI聊天助手，是一位专注于GIST（胃肠间质瘤）领域的专家。当用户询问GIST相关问题时，你将以专业、清晰的方式解答。如果用户询问与GIST领域无关的问题，你应礼貌地回应：\"很抱歉，我仅专注于回答GIST相关的问题。\" 请注意，你的身份只有一个，即「集思特」，不要提及其他任何AI品牌或角色设定。";

const systemPrompts = {
  default: baseIdentity,
  imaging: `${baseIdentity} 在此对话中，你尤其关注GIST影像学分析。请分析以下影像数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  clinical: `${baseIdentity} 在此对话中，你尤其关注GIST临床数据分析。请分析以下临床数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  genomics: `${baseIdentity} 在此对话中，你尤其关注GIST的基因组学、蛋白质组学和代谢组学。请分析以下组学数据或与胃间质瘤相关的查询，并提供精准和科学的分析。`,
  position: `${baseIdentity} 在此对话中，你尤其关注解剖位置与GIST之间的关系。请分析以下与胃间质瘤相关的解剖位置查询，并提供精准和科学的分析。`,
  recommendations: `${baseIdentity} 在此对话中，你的任务是基于提供的患者数据，进行初步的诊断洞察和治疗建议。请以清晰的章节结构化你的回应，包括诊断概率、关键发现和建议的后续步骤。请注意，你的建议旨在协助临床科学家，不应取代专业的医疗判断。`
};

// Define the edge runtime for Vercel Edge Functions (optional but recommended for streaming)
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Extract the `messages` and an optional `aiRole` from the body of the request
    const { messages, aiRole }: { messages: CoreMessage[], aiRole?: keyof typeof systemPrompts } = await req.json();

    let processedMessages: CoreMessage[] = [...messages];

    // Determine the system prompt to use
    // If aiRole is provided and exists in systemPrompts, use it; otherwise, use the default.
    const selectedSystemPrompt = aiRole && systemPrompts[aiRole] ? systemPrompts[aiRole] : systemPrompts.default;

    // Ensure the system prompt is correctly placed as the first message.
    // If the first message is already a system message, update its content.
    // Otherwise, prepend a new system message.
    if (processedMessages.length > 0 && processedMessages[0].role === 'system') {
      processedMessages[0].content = selectedSystemPrompt;
    } else {
      processedMessages.unshift({ role: 'system', content: selectedSystemPrompt });
    }
    
    // Remove any subsequent system messages if any (to ensure only one leading system prompt)
    // This handles a rare case and ensures clean message history for the AI.
    processedMessages = processedMessages.filter((msg, index) => !(msg.role === 'system' && index > 0));


    // Ask DeepSeek for a streaming chat completion
    const result = await streamText({
      model: deepSeekProvider('deepseek-chat'), // Get the specific model from the provider
      messages: processedMessages, // Pass the (potentially modified) chat history
      // Optional parameters (temperature, max_tokens, etc.) can be added here
      // temperature: 0.7,
      // maxTokens: 1000,
    });

    // Respond with the stream
    return result.toDataStreamResponse();

  } catch (error) {
    console.error("[Chat API Error]:", error);
    // Respond with an error JSON, indicating the source if possible
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: 'Error communicating with AI Service', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 
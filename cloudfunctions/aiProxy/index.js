const cloud = require('wx-server-sdk');
const http = require('http');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // TCB 中需要配置环境 ID
});

// IMPORTANT: Store your API key securely, preferably in environment variables
// Replace with your actual Dify API key
const DIFY_API_KEY = 'app-S1ypCFRQVJrAJUcWjsBr0L8x'; 
const DIFY_API_BASE_URL = '117.72.75.45';
const DIFY_API_PORT = 8080;
const DIFY_API_PATH = '/v1/chat-messages';

// System prompts are typically configured within the Dify App interface
// const baseIdentity = "..." // No longer needed here
// const systemPrompts = { ... }; // No longer needed here

exports.main = async (event, context) => {
  // Note: aiRole is no longer used to select system prompt here, as it's handled by Dify App config.
  const { messages } = event; 

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: 'Invalid messages input' };
  }

  // Extract the last user message as the query for Dify
  const lastUserMessage = messages.slice().reverse().find(msg => msg.role === 'user');
  if (!lastUserMessage) {
    return { success: false, error: 'No user message found in input' };
  }
  const query = lastUserMessage.content;

  // TODO: Implement proper user identification if needed. Using a placeholder for now.
  const userId = 'gist-user'; 

  // TODO: Implement conversation_id passing if history is needed. 
  // The frontend needs to store and send the conversation_id received from Dify's response.
  const conversationId = ''; // Start new conversation context each time for now

  const postData = JSON.stringify({
    query: query,
    inputs: {}, // Add any predefined inputs for your Dify app if necessary
    response_mode: 'streaming', // Request streaming mode from Dify
    user: userId,
    conversation_id: conversationId, // Pass if available and history is needed
    // files: [] // Add file handling if needed, based on Dify API
  });

  const options = {
    hostname: DIFY_API_BASE_URL,
    port: DIFY_API_PORT,
    path: DIFY_API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    },
    // Increase timeout if needed, but Cloud Functions have execution limits
    // timeout: 60000 // Example: 60 seconds
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let accumulatedAnswer = '';
      let responseConversationId = conversationId; // Keep track of conversation ID from response
      let usageData = null;
      let errorData = null;
      let rawChunks = []; // Store raw chunks for debugging if needed

      res.setEncoding('utf8'); // Ensure correct encoding

      res.on('data', (chunk) => {
        rawChunks.push(chunk);
        // Process Server-Sent Events (SSE) stream
        const lines = chunk.toString().split('\n\n');
        lines.forEach(line => {
          if (line.startsWith('data:')) {
            const jsonData = line.substring(5).trim();
            if (jsonData) {
              try {
                const parsedData = JSON.parse(jsonData);
                
                // Store conversation_id from the first relevant event
                if (parsedData.conversation_id && !responseConversationId) {
                   responseConversationId = parsedData.conversation_id;
                }

                if (parsedData.event === 'message' || parsedData.event === 'agent_message') {
                  accumulatedAnswer += parsedData.answer;
                } else if (parsedData.event === 'message_end') {
                  // Stream finished successfully
                  usageData = parsedData.metadata?.usage; // Capture usage if available
                  // Resolve the promise only when the 'message_end' event is received
                  resolve({ 
                    success: true, 
                    content: accumulatedAnswer, 
                    conversation_id: responseConversationId, // Return conversation ID for potential frontend use
                    usage: usageData,
                    // rawResponse: rawChunks.join('') // Optionally include raw stream for debugging
                  });
                } else if (parsedData.event === 'error') {
                  // Handle error event during streaming
                  errorData = { status: parsedData.status, code: parsedData.code, message: parsedData.message };
                  console.error('Dify Stream Error Event:', errorData);
                   // Don't resolve yet, wait for request end/error or message_end
                } else if (parsedData.event === 'message_replace') {
                    accumulatedAnswer = parsedData.answer; // Replace entire content
                 }
                // Ignore 'ping', 'agent_thought', 'message_file', 'tts_message', 'tts_message_end' for basic chat completion
              } catch (e) {
                console.error('Error parsing Dify stream chunk JSON:', e, 'Chunk:', jsonData);
                // Don't resolve/reject here, might be partial JSON, wait for more data or req end/error
              }
            }
          }
        });
      });

      res.on('end', () => {
         // This 'end' might be reached before 'message_end' if the connection closes prematurely
         // or if there was an error not sent as a 'data: error' event.
         // If we haven't resolved yet (no message_end received), resolve with what we have or the error.
         if (!usageData && !errorData) { // Check if already resolved by message_end or captured stream error
            console.warn("Dify stream ended without 'message_end' event. Status:", res.statusCode);
             if (res.statusCode >= 200 && res.statusCode < 300 && accumulatedAnswer) {
                 // Success status code, but no message_end. Return what we got.
                 resolve({ success: true, content: accumulatedAnswer, conversation_id: responseConversationId, warning: "Stream ended unexpectedly." });
             } else if (res.statusCode >= 200 && res.statusCode < 300) {
                 // Success status code, but no content and no message_end. Likely an issue.
                 resolve({ success: false, error: 'Stream ended successfully but no content received.', details: `Status: ${res.statusCode}`, conversation_id: responseConversationId });
             } else {
                 // Non-success status code and no explicit error event.
                 resolve({ success: false, error: `API request failed with status: ${res.statusCode}`, details: accumulatedAnswer || "No further details.", conversation_id: responseConversationId });
             }
         } else if (errorData) {
             // Resolve with the captured stream error if message_end wasn't hit.
             resolve({ success: false, error: errorData.message || 'Dify API Error', details: errorData, conversation_id: responseConversationId });
         }
         // If resolved by message_end, this block does nothing extra.
      });
    });

    req.on('error', (e) => {
      console.error('Error making Dify API request:', e);
      resolve({ success: false, error: 'Error making API request.', details: e.message });
    });

    req.on('timeout', () => {
      req.destroy(); // Destroy the request object
      console.error('Dify API request timed out.');
      resolve({ success: false, error: 'API request timed out.' });
    });
    
    // Set timeout for the request itself (optional, adjust as needed)
    // req.setTimeout(60000); 

    // Write data and end request
    req.write(postData);
    req.end();
  });
}; 
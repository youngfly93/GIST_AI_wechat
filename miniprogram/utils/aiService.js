// miniprogram/utils/aiService.js

/**
 * Call the AI proxy cloud function
 * @param {string} functionName - Name of the cloud function to call.
 * @param {object} data - Data to pass to the cloud function.
 * @returns {Promise<object>} - Promise with the AI response.
 */
async function callAIProxy(functionName, data) {
  try {
    const result = await wx.cloud.callFunction({
      name: functionName,
      data: data,
    });

    if (result.result && result.result.success) {
      return { success: true, content: result.result.content, rawResponse: result.result.rawResponse };
    } else {
      console.error(`Cloud function '${functionName}' call failed or returned error:`, result);
      return { success: false, error: result.result ? result.result.error : 'Cloud function execution error', details: result.result ? result.result.details : null };
    }
  } catch (error) {
    console.error(`Error calling cloud function '${functionName}':`, error);
    return { success: false, error: `Failed to call cloud function ${functionName}`, details: error.message };
  }
}

/**
 * Send a message to the AI model and get a response
 * @param {Array<object>} messages - Chat history including the current user message
 * @param {string} [systemPromptType='default'] - Type of system prompt to use (maps to aiRole in cloud function).
 * @returns {Promise<object>} Promise with the AI response
 */
export async function getAIResponse(messages, systemPromptType = 'default') {
  return callAIProxy('aiProxy', {
    messages,
    aiRole: systemPromptType, // Maps to aiRole for selecting system prompt in cloud function
  });
}

/**
 * Generate a specialized GIST research analysis
 * @param {string} query - Research query from the user
 * @param {'imaging' | 'clinical' | 'genomics' | 'position'} researchType - Type of research analysis
 * @returns {Promise<object>} Promise with the AI response
 */
export async function getGISTResearchAnalysis(query, researchType) {
  // The cloud function aiProxy already handles different system prompts based on aiRole.
  // We pass the researchType as aiRole.
  return getAIResponse([{ role: 'user', content: query }], researchType);
}

/**
 * Generate clinical recommendations based on patient data
 * @param {string} patientData - Clinical data of the patient
 * @returns {Promise<object>} Promise with the AI response containing clinical recommendations
 */
export async function getClinicalRecommendations(patientData) {
  // The cloud function aiProxy uses the 'recommendations' aiRole for this.
  const queryContent = `Please analyze the following patient data and provide clinical recommendations for GIST: ${patientData}`;
  return getAIResponse([{ role: 'user', content: queryContent }], 'recommendations');
}
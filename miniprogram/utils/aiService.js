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
 * @param {string} patientData - Clinical data of the patient in JSON format
 * @returns {Promise<object>} Promise with the AI response containing clinical recommendations
 */
export async function getClinicalRecommendations(patientData) {
  // The cloud function aiProxy uses the 'recommendations' aiRole for this.
  const queryContent = `请基于以下GIST患者数据，提供临床风险评估和治疗建议：\n\n${patientData}`;
  
  // 添加分析提示，指导AI如何处理数据
  const analysisPrompt = `
请根据NIH 2020修订版风险分级标准，分析以上患者数据，并提供：
1. 风险等级评估
2. 术后辅助治疗建议
3. 随访监测计划
4. 特殊注意事项（如有）

请注意患者的肿瘤位置、大小、有丝分裂数和基因突变类型，特别关注PDGFRA D842V突变的伊马替尼耐药性。`;

  const fullQuery = queryContent + analysisPrompt;
  
  return getAIResponse([{ role: 'user', content: fullQuery }], 'recommendations');
}
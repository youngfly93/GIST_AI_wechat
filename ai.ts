// Define types for requests and responses
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }
  
  export interface AIResponse {
    content: string;
    success: boolean;
    error?: string;
  }
  
  /**
   * Send a message to the AI model and get a response
   * @param messages - Chat history including the current user message
   * @param systemPrompt - Optional system prompt to guide the AI
   * @returns Promise with the AI response
   */
  export async function getAIResponse(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      // 通过 API 路由发送请求
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          systemPrompt
        }),
      });
  
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
  
      return await response.json();
    } catch (error: any) {
      console.error('AI service error:', error);
      return {
        content: '',
        success: false,
        error: error.message || 'Failed to get response from AI'
      };
    }
  }
  
  /**
   * Generate a specialized GIST research analysis
   * @param query - Research query from the user
   * @param researchType - Type of research analysis
   * @returns Promise with the AI response
   */
  export async function getGISTResearchAnalysis(
    query: string,
    researchType: 'imaging' | 'clinical' | 'genomics' | 'position'
  ): Promise<AIResponse> {
    const systemPromptMap = {
      imaging: "You are a specialized AI assistant focused on GIST imaging analytics. Analyze the following imaging data or query related to gastric stromal tumors with precision and scientific accuracy.",
      clinical: "You are a specialized AI assistant focused on GIST clinical data analysis. Analyze the following clinical data or query related to gastric stromal tumors with precision and scientific accuracy.",
      genomics: "You are a specialized AI assistant focused on GIST genomics, proteomics, and metabolomics. Analyze the following omics data or query related to gastric stromal tumors with precision and scientific accuracy.",
      position: "You are a specialized AI assistant focused on analyzing the relationship between anatomical positions and GIST. Analyze the following anatomical position query related to gastric stromal tumors with precision and scientific accuracy."
    };
  
    const systemPrompt = systemPromptMap[researchType];
    
    return getAIResponse([
      { role: 'user', content: query }
    ], systemPrompt);
  }
  
  /**
   * Generate clinical recommendations based on patient data
   * @param patientData - Clinical data of the patient
   * @returns Promise with the AI response containing clinical recommendations
   */
  export async function getClinicalRecommendations(patientData: string): Promise<AIResponse> {
    const systemPrompt = 
      "You are a specialized AI assistant for gastric stromal tumor (GIST) diagnosis and treatment recommendations. " +
      "Your task is to analyze the provided patient data and generate preliminary diagnostic insights and treatment suggestions. " +
      "Structure your response with clear sections for diagnosis probability, key findings, and recommended next steps. " +
      "Note that your suggestions are meant to assist clinical scientists and should not replace professional medical judgment.";
    
    return getAIResponse([
      { role: 'user', content: `Please analyze the following patient data and provide clinical recommendations for GIST: ${patientData}` }
    ], systemPrompt);
  } 
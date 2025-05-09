import { getAIResponse } from '../../utils/aiService';

Page({
  data: {
    messages: [], // { id: string, role: 'user' | 'assistant', content: string }
    inputValue: '',
    isLoading: false,
    scrollToMessageId: '', // To scroll to the latest message
    messageIdCounter: 0, // Simple counter for unique message IDs
  },

  onLoad(options) {
    // Add initial greeting or load chat history if any
    this.addMessage('assistant', '您好！我是集思特GIST研究助手，有什么可以帮助您的吗？');
  },

  addMessage(role, content) {
    const newMessageId = `msg-${this.data.messageIdCounter + 1}`;
    const newMessage = {
      id: newMessageId,
      role,
      content,
    };
    this.setData({
      messages: [...this.data.messages, newMessage],
      messageIdCounter: this.data.messageIdCounter + 1,
      scrollToMessageId: newMessageId, // Scroll to the new message
    });
  },

  onInput(e) {
    this.setData({
      inputValue: e.detail.value,
    });
  },

  async onSend() {
    const userInput = this.data.inputValue.trim();
    if (!userInput || this.data.isLoading) {
      return;
    }

    this.addMessage('user', userInput);
    this.setData({
      inputValue: '', // Clear input after sending
      isLoading: true,
    });

    // Prepare messages for the AI (last N messages for context, or as per your logic)
    // For simplicity, we can send the recent messages. Adjust N as needed.
    const history = this.data.messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content }));

    try {
      // Using the default system prompt. Change if needed for this specific chat page.
      const aiResponse = await getAIResponse(history, 'default'); 

      if (aiResponse.success && aiResponse.content) {
        this.addMessage('assistant', aiResponse.content);
      } else {
        this.addMessage('assistant', `抱歉，AI服务暂时遇到问题，请稍后再试。错误：${aiResponse.error || '未知错误'}`);
        console.error("AI Response Error:", aiResponse);
      }
    } catch (error) {
      this.addMessage('assistant', '抱歉，与AI通信失败，请检查您的网络连接或稍后再试。');
      console.error("Error calling AI service:", error);
    }

    this.setData({
      isLoading: false,
    });
  },

  // Optional: Add logic for sharing, copying messages, etc.
}); 
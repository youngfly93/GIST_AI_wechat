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
    return newMessageId; // Return the ID of the newly added message
  },

  typeMessage(messageId, text, speed = 50) {
    let currentText = '';
    let charIndex = 0;

    const typeChar = () => {
      if (charIndex < text.length) {
        currentText += text[charIndex];
        const messages = this.data.messages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, content: currentText };
          }
          return msg;
        });
        this.setData({ messages, scrollToMessageId: messageId });
        charIndex++;
        setTimeout(typeChar, speed);
      } else {
        // Typing finished
        this.setData({ isLoading: false }); // Ensure loading is set to false once typing is complete
      }
    };
    typeChar();
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
      isLoading: true, // Set loading to true before AI call
    });

    // Add an empty message for the assistant to type into
    const assistantMessageId = this.addMessage('assistant', '...'); // Placeholder, will be typed over

    // Prepare messages for the AI (last N messages for context, or as per your logic)
    // For simplicity, we can send the recent messages. Adjust N as needed.
    const history = this.data.messages.slice(-6, -1).map(msg => ({ role: msg.role, content: msg.content })); // Exclude the placeholder

    try {
      // Using the default system prompt. Change if needed for this specific chat page.
      const aiResponse = await getAIResponse(history, 'default'); 

      if (aiResponse.success && aiResponse.content) {
        // Find the placeholder message and replace its content by typing
        const messages = this.data.messages.map(msg => {
          if (msg.id === assistantMessageId) {
            return { ...msg, content: '' }; // Clear placeholder before typing
          }
          return msg;
        });
        this.setData({ messages });
        this.typeMessage(assistantMessageId, aiResponse.content);
      } else {
        // If AI response failed, update the placeholder message with the error
        const messages = this.data.messages.map(msg => {
          if (msg.id === assistantMessageId) {
            return { ...msg, content: `抱歉，AI服务暂时遇到问题，请稍后再试。错误：${aiResponse.error || '未知错误'}` };
          }
          return msg;
        });
        this.setData({ messages, isLoading: false });
        console.error("AI Response Error:", aiResponse);
      }
    } catch (error) {
      // If communication with AI failed, update the placeholder message with the error
      const messages = this.data.messages.map(msg => {
        if (msg.id === assistantMessageId) {
          return { ...msg, content: '抱歉，与AI通信失败，请检查您的网络连接或稍后再试。' };
        }
        return msg;
      });
      this.setData({ messages, isLoading: false });
      console.error("Error calling AI service:", error);
    }

    // isLoading is now set to false inside typeMessage when typing finishes,
    // or directly in error handling blocks.
  },

  // Optional: Add logic for sharing, copying messages, etc.
}); 
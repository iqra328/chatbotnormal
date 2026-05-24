const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const axios = require('axios');

// Simple AI responses (fallback if no OpenAI)
const getSimpleAIResponse = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.includes('hello') || msg.includes('hi')) {
    return "Hello! How can I help you today?";
  } else if (msg.includes('how are you')) {
    return "I'm doing great! Thanks for asking. How can I assist you?";
  } else if (msg.includes('name')) {
    return "I'm AI Chatbot, your virtual assistant!";
  } else if (msg.includes('help')) {
    return "I can help you with general questions, have conversations, and remember our chat history!";
  } else if (msg.includes('weather')) {
    return "I can't check real-time weather yet, but you can use a weather API for that!";
  } else if (msg.includes('thank')) {
    return "You're welcome! Glad I could help!";
  } else {
    return `That's interesting! Tell me more about "${message}". I'm here to learn and help you.`;
  }
};

// Send message and get response
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }
    
    // Find or create chat session
    let chat = await Chat.findOne({ sessionId });
    if (!chat) {
      chat = new Chat({ sessionId, messages: [] });
    }
    
    // Save user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Get AI response (using OpenAI if API key provided, else simple responses)
    let aiResponse;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: chat.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: 150
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        aiResponse = openaiResponse.data.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI API error:', error);
        aiResponse = getSimpleAIResponse(message);
      }
    } else {
      aiResponse = getSimpleAIResponse(message);
    }
    
    // Save AI response
    chat.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    await chat.save();
    
    res.json({
      success: true,
      response: aiResponse,
      messageCount: chat.messages.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chat = await Chat.findOne({ sessionId });
    
    if (!chat) {
      return res.json({ messages: [] });
    }
    
    res.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear chat history
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Chat.deleteOne({ sessionId });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; // ✅ This line is important!
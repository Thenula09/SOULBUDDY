# Chat AI Service - Frontend Integration Guide

## ✅ Service Running
- **URL**: `http://localhost:8002` (Mac) or `http://10.0.2.2:8002` (Android Emulator)
- **Model**: Groq's llama-3.1-8b-instant
- **Languages**: English, Sinhala, Singlish

## API Endpoint

### POST /chat
Send user messages and get emotion-aware responses.

**Request:**
```json
{
  "message": "මං අද හරිම සතුටුයි!"
}
```

**Response:**
```json
{
  "reply": "අනේ සුපිරි! ඔයාගේ සතුට බලද්දී මටත් සතුටුයි මචං! මොකද වුණේ කියන්න?",
  "emotion": "Happy",
  "confidence": null
}
```

## React Native Integration

### Example Code (for Android Emulator):

```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState('Neutral');

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMsg = { id: Date.now(), text: message, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Get token from storage (if using auth)
      const token = await AsyncStorage.getItem('userToken');

      // Call Chat AI Service
      const response = await fetch('http://10.0.2.2:8002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization if needed
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Update emotion state
      setCurrentEmotion(data.emotion);

      // Add AI response to chat
      const aiMsg = {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'ai',
        emotion: data.emotion
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Chat error:', error);
      // Show fallback message
      const errorMsg = {
        id: Date.now() + 1,
        text: 'හෙයි මචං, මටත් වෙච්ච තාක් error එකක්. පස්සෙන් තව එකක් try කරමු?',
        sender: 'ai',
        emotion: 'Neutral'
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setMessage(''); // Clear input
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Current Mood: {currentEmotion}</Text>
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{
            padding: 10,
            margin: 5,
            backgroundColor: item.sender === 'user' ? '#DCF8C6' : '#E8E8E8',
            borderRadius: 10,
            alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <Text>{item.text}</Text>
            {item.emotion && (
              <Text style={{ fontSize: 10, color: '#666' }}>
                😊 {item.emotion}
              </Text>
            )}
          </View>
        )}
      />

      <View style={{ flexDirection: 'row' }}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="කතා කරමු..."
          style={{ flex: 1, borderWidth: 1, padding: 10 }}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
};

export default ChatScreen;
```

## Test Examples

### Sinhala
```bash
curl -X POST http://localhost:8002/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"මං අද හරිම සතුටුයි!"}'
```

### English
```bash
curl -X POST http://localhost:8002/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"I am so stressed with work"}'
```

### Singlish
```bash
curl -X POST http://localhost:8002/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"yako mata lonely hithenawa"}'
```

## Emotions Detected
- Happy 😊
- Sad 😢
- Angry 😠
- Stress 😰
- Anxious 😟
- Excited 🎉
- Neutral 😐

## Important Notes

1. **Android Emulator**: Use `http://10.0.2.2:8002` (not localhost)
2. **iOS Simulator**: Use `http://localhost:8002`
3. **Real Device**: Use your Mac's IP address (e.g., `http://192.168.1.x:8002`)

4. **Error Handling**: Always wrap in try-catch and show friendly error messages

5. **Rate Limiting**: Groq has rate limits. Add debouncing if needed.

6. **Response Time**: Typically 1-3 seconds (Groq is very fast!)

## Service Status

Check if service is running:
```bash
curl http://localhost:8002/health
```

Expected response:
```json
{"status": "healthy", "groq_available": true}
```

## Troubleshooting

### "Network request failed"
- Check if service is running: `ps aux | grep chat-ai-service`
- Verify URL (10.0.2.2 for emulator)
- Check Metro bundler is running

### "Authorization header required"
- This error should NOT appear (auth is optional now)
- If it does, add token to headers

### Slow responses
- Normal for first request (cold start)
- Subsequent requests should be fast (1-2 seconds)

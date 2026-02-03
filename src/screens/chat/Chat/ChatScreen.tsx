import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, Image, PermissionsAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary, type CameraOptions } from 'react-native-image-picker';
import { FlashList } from '@shopify/flash-list';
import { ChatSkeleton } from '../../../components/ScreenSkeletons';
import { saveMoodData } from '../../../services/moodService';

interface Message {
  id: string;
  text?: string;
  image?: string;
  sender: string;
  type?: string;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const flatListRef = useRef<FlashList<Message>>(null);

  // Load persisted messages on mount (prevents automatic refresh when navigating back)
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem('chat_messages');
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          setMessages(parsed);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        } else {
          const welcome: Message[] = [{ id: '1', text: "Hello! I'm SoulBuddy. How can I help you today?", sender: 'bot' }];
          setMessages(welcome);
          await AsyncStorage.setItem('chat_messages', JSON.stringify(welcome));
        }
      } catch (e) {
        console.log('Load messages error', e);
      } finally {
        setInitialLoading(false);
      }
    };
    loadMessages();
  }, []);

  // Persist messages whenever they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const save = async () => {
        try {
          await AsyncStorage.setItem('chat_messages', JSON.stringify(messages));
        } catch (e) {
          console.log('Save messages error', e);
        }
      };
      save();
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // අලුත් පණිවිඩයක් ආවම පල්ලෙහාටම scroll කරන්න
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Removed automatic reset on focus/blur to avoid unwanted refresh when navigating back.
  // Use manual refresh button in header instead (see handleRefresh).

  const handleRefresh = useCallback(async () => {
    try {
      await fetch('http://10.0.2.2:8001/api/v1/reset-chat', { method: 'POST' });
      console.log('Chat reset by user');
      const welcome: Message[] = [{ id: '1', text: "Hello! I'm SoulBuddy. How can I help you today?", sender: 'bot' }];
      setMessages(welcome);
      await AsyncStorage.setItem('chat_messages', JSON.stringify(welcome));
      // ensure we scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      console.log('Failed to reset chat:', error);
      Alert.alert('Refresh failed', 'Could not refresh chat. Please try again.');
    }
  }, []);

  // Simple emotion detection from text (you can enhance with AI service)
  const detectEmotionFromText = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(happy|great|wonderful|amazing|excited|joyful|glad)\b/)) {
      return 'Happy';
    } else if (lowerText.match(/\b(sad|sorry|unfortunate|depressed|unhappy|down)\b/)) {
      return 'Sad';
    } else if (lowerText.match(/\b(angry|frustrated|mad|annoyed|furious)\b/)) {
      return 'Angry';
    } else if (lowerText.match(/\b(stress|anxious|worried|nervous|tense|overwhelmed)\b/)) {
      return 'Stress';
    }
    
    return 'Neutral';
  }, []);

  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '') return;
    const newMsg = { id: Date.now().toString(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, newMsg]);
    const currentInput = inputText;
    setInputText('');

    setIsTyping(true);

    try {
      // Add timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('http://10.0.2.2:8001/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          mood: "Neutral"
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      const botMessage = {
        id: Date.now().toString() + '_bot',
        text: data.reply,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Detect emotion from user message and save mood data
      const detectedEmotion = detectEmotionFromText(currentInput);
      if (detectedEmotion !== 'Neutral') {
        await saveMoodData({
          emotion: detectedEmotion,
          emotion_score: 6,
          notes: 'Detected from chat message'
        });
        console.log('Mood saved:', detectedEmotion);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now().toString() + '_error',
        text: 'Sorry, I couldn\'t connect to the server. Please try again.',
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false); // Reply එක ආවම animation එක නවත්තන්න ✅
    }
  }, [inputText]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'SoulBuddy needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const openCamera = async () => {
    console.log('📷 Camera button clicked!');
    try {
      // Ensure permission first (Android runtime permissions)
      console.log('Requesting camera permission...');
      const hasPermission = await requestCameraPermission();
      console.log('Permission granted:', hasPermission);
      
      if (!hasPermission) {
        Alert.alert('Permission required', 'Camera permission is required to take photos.');
        return;
      }

      console.log('Launching camera...');
      const options: CameraOptions = {
        mediaType: 'photo',
        includeBase64: true, // Backend එකට යවන්න Base64 අවශ්‍යයි
        maxHeight: 1000,
        maxWidth: 1000,
        quality: 0.8,
        cameraType: 'front', // Front camera for selfie
      };

      launchCamera(options, async (response) => {
        console.log('Camera response:', response);
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorMessage) {
          console.log('Camera Error: ', response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage, [
            { text: 'Try Gallery', onPress: openGallery },
            { text: 'Cancel', style: 'cancel' }
          ]);
        } else if (response.assets && response.assets.length > 0) {
          console.log('Photo captured!');
          const source = { uri: response.assets[0].uri };
          const base64Image = `data:image/jpeg;base64,${response.assets[0].base64}`;
          
          // පින්තූරය මැසේජ් ලිස්ට් එකට එකතු කරමු
          const photoMessage = {
            id: Date.now().toString() + '_photo',
            image: source.uri,
            sender: 'user',
            type: 'image'
          };
          setMessages(prev => [...prev, photoMessage]);

          // Backend එකට යවලා emotion එක detect කරමු
          try {
            console.log('Analyzing emotion...');
            const emotionResponse = await fetch('http://10.0.2.2:8001/api/v1/analyze-emotion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Image }),
            });
            
            const emotionData = await emotionResponse.json();
            console.log('Detected emotion:', emotionData.emotion);
            
            // Save mood data to backend for tracking
            const moodSaved = await saveMoodData({
              emotion: emotionData.emotion,
              emotion_score: emotionData.emotion_score || 7,
              notes: 'Detected from photo during chat'
            });
            console.log('Mood data saved:', moodSaved);
            
            // Emotion එක detect වුණාම AI ට කියලා reply එකක් ගමු
            const aiResponse = await fetch('http://10.0.2.2:8001/api/v1/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `I just shared my photo. How do I look?`,
                mood: emotionData.emotion
              }),
            });
            
            const aiData = await aiResponse.json();
            console.log('AI reply:', aiData.reply);
            const botMessage = {
              id: Date.now().toString() + '_bot',
              text: aiData.reply,
              sender: 'bot',
            };
            setMessages(prev => [...prev, botMessage]);
          } catch (error) {
            console.error('Error analyzing emotion:', error);
            Alert.alert('Error', 'Could not analyze emotion from photo');
          }
        }
      });
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  // Fallback: open gallery if camera is unavailable
  const openGallery = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 1200,
      maxWidth: 1200,
      quality: 0.8, // Compress to 80% quality
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        console.log('Gallery Error:', response.errorMessage);
        Alert.alert('Error', 'Could not open gallery');
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        const photoMessage = {
          id: Date.now().toString() + '_photo',
          image: source.uri,
          sender: 'user',
          type: 'image'
        };
        setMessages(prev => [...prev, photoMessage]);
        console.log('Image selected:', source.uri);
      }
    });
  };

  if (initialLoading) {
    return <ChatSkeleton />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleRefresh} style={styles.headerRefreshButton}>
          <Text style={styles.headerRefreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat with SoulBuddy</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Chat Messages List */}
      <FlashList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            {item.type === 'image' ? (
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            ) : (
              <Text style={[styles.messageText, item.sender === 'user' && styles.userMessageText]}>{item.text}</Text>
            )}
          </View>
        )}
        estimatedItemSize={80}
        style={styles.flatListStyle}
        contentContainerStyle={styles.flatListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        // Performance optimizations
        removeClippedSubviews={true}
        drawDistance={500}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>SoulBuddy is typing... ✨</Text>
        </View>
      )}

      {/* Modern Chat Input Bar */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
            <Text style={styles.cameraIcon}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRefreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  headerRefreshText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 80,
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 5,
    marginHorizontal: 15,
    maxWidth: '80%',
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 2 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2, elevation: 2 },
  messageText: { fontSize: 16, color: '#333' },
  userMessageText: { color: '#fff' },
  messageImage: { width: 200, height: 200, borderRadius: 10 },
  flatListStyle: { flex: 1 },
  flatListContent: { paddingVertical: 20 },

  // Typing Indicator
  typingContainer: {
    padding: 10,
    marginLeft: 15,
    marginBottom: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },

  // Chat Bar Styling
  inputWrapper: {
    paddingBottom: Platform.OS === 'ios' ? 25 : 15, // යටින් ඉඩ තැබීම
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginHorizontal: 10,
    marginBottom: 10, // 10px gap from bottom
    paddingHorizontal: 15,
    paddingVertical: 10,
    elevation: 5, // Shadow for Android
    alignItems: 'center'
  },
  cameraButton: {
    marginRight: 10,
    padding: 5,
  },
  cameraIcon: {
    fontSize: 20,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 100 },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default ChatScreen;
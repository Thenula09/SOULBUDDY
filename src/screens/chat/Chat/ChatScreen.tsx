import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, Image, PermissionsAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, fetchWithTimeout } from '../../../config/api';
import { launchCamera, launchImageLibrary, type CameraOptions } from 'react-native-image-picker';
import { FlashList } from '@shopify/flash-list';
import { ChatSkeleton } from '../../../components/ScreenSkeletons';
import { saveMoodData, getTodayMoods } from '../../../services/moodService';

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
  const [todayMoods, setTodayMoods] = useState<any[]>([]);

  // helper to format ISO timestamp into HH:MM
  const formatTime = (ts?: string) => {
    try {
      if (!ts) return '';
      const { formatTimeInColombo } = require('../../../utils/time');
      return formatTimeInColombo(ts);
    } catch {
      return '';
    }
  };

  const fetchTodayMoods = async () => {
    try {
      const list = await getTodayMoods();
      setTodayMoods(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Failed to fetch today moods', err);
    }
  };

  // refresh today's moods on mount and whenever messages change (so new detected moods appear)
  useEffect(() => { fetchTodayMoods(); }, [messages]);

  // Use permissive any for the ref to avoid type conflicts with FlashList's exported value vs type
  const flatListRef = useRef<any>(null);

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
      await fetch(API_ENDPOINTS.RESET_CHAT, { method: 'POST' });
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
    if (!inputText.trim()) return;
    const currentInput = inputText.trim();
    setInputText('');
    setIsTyping(true);

    // Add user message to chat immediately
    const userMessage = {
      id: Date.now().toString() + '_user',
      text: currentInput,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get authenticated user ID
      const userId = await AsyncStorage.getItem('user_id');
      
      // Add timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          mood: "Neutral",
          user_id: userId // Send authenticated user ID
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
        try {
          // Save mood data to backend using existing userId
          const moodResponse = await fetch('http://10.0.2.2:8002/api/v1/save-mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              emotion: detectedEmotion,
              confidence: 0.8,
              source: 'chat'
            })
          });
          
          if (moodResponse.ok) {
            console.log('✅ Mood saved from chat:', detectedEmotion);
            // Refresh today's moods
            await fetchTodayMoods();
          } else {
            console.log('❌ Failed to save mood from chat');
          }
        } catch (error) {
          console.error('Error saving mood from chat:', error);
        }
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
  }, [inputText, detectEmotionFromText]);

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
          const asset = response.assets[0];
          const mimeType = asset.type || '';
          const fileName = asset.fileName || asset.uri || '';
          const ext = (fileName.split('.').pop() || '').toLowerCase();

          // Reject non-image picks (sometimes gallery returns non-image files)
          if (!mimeType.startsWith('image/') && !['jpg','jpeg','png','heic','webp'].includes(ext)) {
            console.warn('Selected non-image from camera:', asset);
            const botMessage = {
              id: Date.now().toString() + '_bot_invalid',
              text: 'ඔයාලා තෝරපු ෆයිල් එක image එකක් නෙවෙයි — කරුණාකර gallery/කැමරාවෙන් jpg/png ෆොටෝ එකක් තෝරන්න.',
              sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
            return;
          }

          console.log('Photo captured!');
          const source = { uri: asset.uri };
          const base64Image = `data:${mimeType || 'image/jpeg'};base64,${asset.base64}`;
          
          // පින්තූරය මැසේජ์ ලිස්ට් එකට එකතු කරමු
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
            // Give the backend more time for DeepFace processing (30s) and fail gracefully
            const emotionResponse = await fetchWithTimeout(API_ENDPOINTS.ANALYZE_EMOTION, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Image }),
            }, 30000);

            const emotionData = await emotionResponse.json();
            console.log('Detected emotion:', emotionData);

            // If no emotion detected at all, attempt a multipart/file-upload fallback
            // Backend always returns an emotion (defaults to "Neutral" even when face not clear)
            // Only fallback if we get a truly broken response (no emotion field)
            if (!emotionData || !emotionData.emotion || emotionData.status === 'fallback_decode_error') {
              console.warn('Photo analysis returned no emotion / bad payload, trying multipart fallback:', emotionData);

              // Multipart fallback to `/analyze-photo-emotion` (sometimes more reliable)
              try {
                console.log('Attempting multipart fallback to analyze-photo-emotion...');
                // Get authenticated user ID
                const userId = await AsyncStorage.getItem('user_id');
                
                const fd = new FormData();
                fd.append('image', {
                  uri: source.uri,
                  name: `photo_${Date.now()}.jpg`,
                  type: 'image/jpeg'
                } as any);
                fd.append('user_id', userId || '1'); // Use authenticated user ID
                // ask server to process in background so the client isn't blocked
                fd.append('background', 'true');

                const photoResp = await fetch(API_ENDPOINTS.ANALYZE_PHOTO, {
                  method: 'POST',
                  body: fd,
                });

                const photoData = await photoResp.json();
                console.log('Multipart fallback result:', photoData);

                // If server queued background work, show immediate ack and poll for result
                if (photoResp.status === 202 || photoData?.status === 'processing') {
                  const taskId = photoData.task_id;
                  const ackMsg = {
                    id: Date.now().toString() + '_bot_processing',
                    text: 'Got your photo — analysing now, I will tell you when it is ready. ✨',
                    sender: 'bot'
                  };
                  setMessages(prev => [...prev, ackMsg]);

                  // Poll task status until done (short-lived, timeout after ~25s)
                  const start = Date.now();
                  const poll = async () => {
                    try {
                      const statusResp = await fetch(`${API_ENDPOINTS.ANALYZE_PHOTO}/status/${taskId}`);
                      const statusJson = await statusResp.json();
                      console.log('Photo task status:', statusJson);
                      if (statusJson.status === 'done' && statusJson.result) {
                        const res = statusJson.result;
                        // Insert final bot reply and refresh today's moods
                        const finalBot = {
                          id: Date.now().toString() + '_bot_photo_final',
                          text: res.bot_reply || `Thanks — I detected ${res.emotion}. How does that feel?`,
                          sender: 'bot'
                        };
                        setMessages(prev => [...prev, finalBot]);
                        // refresh moods shown in header/timeline
                        fetchTodayMoods();
                        return;
                      }
                      if (statusJson.status === 'error') {
                        const errMsg = { id: Date.now().toString() + '_bot_err', text: 'Could not finish analyzing your photo — try again.', sender: 'bot' };
                        setMessages(prev => [...prev, errMsg]);
                        return;
                      }
                    } catch (err) {
                      console.warn('Polling error:', err);
                    }
                    if (Date.now() - start < 25000) {
                      setTimeout(poll, 1500);
                    } else {
                      const timeoutMsg = { id: Date.now().toString() + '_bot_timeout', text: "Analysis is taking longer than expected — I'll try again later.", sender: 'bot' };
                      setMessages(prev => [...prev, timeoutMsg]);
                    }
                  };
                  setTimeout(poll, 1000);
                  return;
                }

                // Accept the response as long as it has an emotion (even "Neutral" with low confidence is ok)
                if (!photoData || !photoData.emotion) {
                  console.warn('Multipart fallback returned no emotion:', photoData);
                  const botMessage = {
                    id: Date.now().toString() + '_bot_fallback',
                    text: "Couldn't analyze the photo — try a clearer selfie or choose one from your gallery.",
                    sender: 'bot'
                  };
                  setMessages(prev => [...prev, botMessage]);
                  return;
                }

                // Use fallback result as the emotionData
                Object.assign(emotionData, photoData);

              } catch (fallbackErr) {
                console.warn('Multipart fallback failed:', fallbackErr);
                const botMessage = {
                  id: Date.now().toString() + '_bot_fallback',
                  text: "Couldn't analyze the photo right now — try again or pick a different image.",
                  sender: 'bot'
                };
                setMessages(prev => [...prev, botMessage]);
                return;
              }
            }

            // Save mood data to backend for tracking (best-effort)
            try {
              if (!emotionData.saved) {
                await saveMoodData({
                  emotion: emotionData.emotion,
                  emotion_score: emotionData.emotion_score || 7,
                  notes: 'Detected from photo during chat'
                });
                console.log('Mood data saved (client->user-service)');
              } else {
                console.log('Server already saved mood (skipping client save)');
              }
            } catch (e) {
              console.warn('Failed to save mood data, continuing:', e);
            }

            // Emotion detected — ask chat service for a friendly reply. Use fallback if chat fails
            try {
              const aiResponse = await fetch(API_ENDPOINTS.CHAT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: `I just shared my photo. How do I look?`,
                  mood: emotionData.emotion
                }),
              });

              const aiData = await aiResponse.json();
              const replyText = aiData && aiData.reply ? aiData.reply : "Nice photo! How are you feeling today?";

              const botMessage = {
                id: Date.now().toString() + '_bot',
                text: replyText,
                sender: 'bot',
              };
              setMessages(prev => [...prev, botMessage]);

            } catch (err) {
              console.error('AI reply failed, using fallback:', err);
              const botMessage = {
                id: Date.now().toString() + '_bot_fallback',
                text: "Nice photo! How are you feeling today? 😊",
                sender: 'bot',
              };
              setMessages(prev => [...prev, botMessage]);
            }

          } catch (error) {
            console.error('Error analyzing emotion:', error);
            const botMessage = {
              id: Date.now().toString() + '_bot_fallback',
              text: "Couldn't analyze the photo right now — please try again in a moment.",
              sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
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
        const asset = response.assets[0];
        const mimeType = asset.type || '';
        const fileName = asset.fileName || asset.uri || '';
        const ext = (fileName.split('.').pop() || '').toLowerCase();

        if (!mimeType.startsWith('image/') && !['jpg','jpeg','png','heic','webp'].includes(ext)) {
          console.warn('Selected non-image from gallery:', asset);
          const botMessage = { id: Date.now().toString() + '_bot_invalid', text: 'තෝරපු ෆයිල් එක image එකක් නෙවෙයි — කරුණාකර jpg/png ෆොටෝ තෝරන්න.', sender: 'bot' };
          setMessages(prev => [...prev, botMessage]);
          return;
        }

        const source = { uri: asset.uri };
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

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat with SoulBuddy</Text>

          {todayMoods && todayMoods.length > 0 ? (
            (() => {
              const lastMood = todayMoods[todayMoods.length - 1];
              const { getColomboHour, getGreetingForHour } = require('../../../utils/time');
              const moodTs = lastMood.created_at || lastMood.timestamp || lastMood.time;
              const moodHour = moodTs ? getColomboHour(moodTs) : getColomboHour(new Date());
              const moodGreeting = getGreetingForHour(moodHour);
              return (
                <View style={styles.moodChip}>
                  <Text style={styles.moodText}>{lastMood.emotion || 'Unknown'}</Text>
                  <View style={styles.moodRow}>
                    <Text style={styles.moodGreeting}>{moodGreeting}</Text>
                    <Text style={styles.moodTime}>{formatTime(moodTs)}</Text>
                  </View>
                </View>
              );
            })()
          ) : (
            <Text style={styles.moodPlaceholder}>No mood logged today</Text>
          )}
        </View>

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
        // @ts-ignore: estimatedItemSize exists at runtime but may not be present in the bundled types
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 80,
  },
  moodChip: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: { color: '#007AFF', fontWeight: '600', marginRight: 8 },
  moodGreeting: { color: '#444', fontSize: 12, marginRight: 8, fontStyle: 'italic' },
  moodRow: { flexDirection: 'row', alignItems: 'center' },
  moodTime: { color: '#666', fontSize: 12 },
  moodPlaceholder: { color: '#888', fontSize: 12, marginTop: 6 },
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
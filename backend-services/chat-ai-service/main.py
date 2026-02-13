"""
SoulBuddy Chat AI Service - Groq-powered emotional chat buddy
"""
import os
import json
import base64
import shutil
import tempfile
from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from typing import Optional
from dotenv import load_dotenv
import cv2
import numpy as np
from PIL import Image
import shutil
import base64
from datetime import datetime, timedelta
import requests

# Try to import DeepFace for AI-powered emotion detection
DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    print("✅ DeepFace emotion detector initialized successfully")
    DEEPFACE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ DeepFace not available: {e}")
    print("ℹ️  Using fallback emotion detection")

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

def save_mood_to_database(user_id: int, emotion: str, confidence: float, source: str = "photo"):
    """Save mood data to Supabase database"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not configured")
        return False
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "user_id": user_id,
            "emotion": emotion,
            "confidence": confidence,
            "source": source,
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=headers,
            json=data
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Mood saved to database: {emotion} ({confidence:.2f}) from {source}")
            return True
        else:
            print(f"⚠️ Failed to save mood: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving mood to database: {e}")
        return False

def get_recent_mood(user_id: int, minutes: int = 5):
    """Get user's most recent mood within specified minutes"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        
        time_ago = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=headers,
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{time_ago}",
                "order": "created_at.desc",
                "limit": 1
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0]
        
        return None
        
    except Exception as e:
        print(f"❌ Error fetching recent mood: {e}")
        return None
load_dotenv()

def detect_emotion_with_deepface(image_path):
    """
    🎭 AI-Powered Emotion Detection using DeepFace with Improved Accuracy
    Uses Facenet512 model and RetinaFace detector for best results
    Returns: (emotion, confidence, all_emotions_dict)
    """
    if not DEEPFACE_AVAILABLE:
        print("⚠️ DeepFace not available, using fallback")
        return "Neutral", 0.4, {}
    
    try:
        # Analyze with DeepFace using RetinaFace detector for better accuracy
        result = DeepFace.analyze(
            img_path=image_path,
            actions=['emotion'],
            enforce_detection=False,  # Don't fail if no face detected
            detector_backend='retinaface',  # RetinaFace for better accuracy (fallback to opencv)
            silent=True
        )
        
        if isinstance(result, list):
            result = result[0]
        
        # Get emotions
        emotions = result['emotion']
        dominant_emotion = result['dominant_emotion']
        
        # Convert numpy values to Python floats for JSON serialization
        emotions = {k: float(v) for k, v in emotions.items()}
        
        print(f"📊 Raw emotions: {emotions}")
        print(f"🎯 DeepFace dominant: {dominant_emotion}")
        
        # 🔥 INDUSTRIAL HYBRID EMOTION SCORING - Weighted Logic
        # Instead of just taking dominant, use weighted scoring with combined emotions
        
        # Find top 2 emotions
        sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
        top_emotion = sorted_emotions[0]
        second_emotion = sorted_emotions[1] if len(sorted_emotions) > 1 else (None, 0)
        
        print(f"🥇 Top: {top_emotion[0]} = {top_emotion[1]:.2f}%")
        print(f"🥈 Second: {second_emotion[0]} = {second_emotion[1]:.2f}%")
        
        # Map DeepFace emotions to our app emotions
        emotion_mapping = {
            'happy': 'Happy',
            'sad': 'Sad',
            'angry': 'Angry',
            'fear': 'Anxious',
            'surprise': 'Excited',
            'neutral': 'Neutral',
            'disgust': 'Stressed'
        }
        
        # 🎯 INDUSTRIAL EMOTION LOGIC - Production-grade detection with clear priority
        selected_emotion = dominant_emotion
        confidence = emotions[dominant_emotion] / 100.0
        
        fear_val = emotions.get('fear', 0)
        sad_val = emotions.get('sad', 0)
        happy_val = emotions.get('happy', 0)
        angry_val = emotions.get('angry', 0)
        
        # Priority 1: Happy (25% threshold AND must be greater than Sad)
        # Prevents Happy/Sad confusion - Happy gets priority if it's clearly dominant
        if happy_val > 25.0 and happy_val > sad_val:
            selected_emotion = 'happy'
            confidence = happy_val / 100.0
            print(f"🎭 Override: Happy dominant ({happy_val:.1f}% > 25% AND > Sad {sad_val:.1f}%), selecting Happy")
        
        # Priority 2: Crying/Deep Sad (Sad > Fear + 15%)
        # When Sad is 15% more than Fear, it's crying not stressed
        elif sad_val > (fear_val + 15.0):
            selected_emotion = 'sad'
            confidence = sad_val / 100.0
            print(f"🎭 Override: Crying detected (Sad {sad_val:.1f}% > Fear {fear_val:.1f}% + 15%), selecting Sad")
        
        # Priority 3: Stressed (Fear + Sad > 45%)
        # Combined anxiety/sadness indicates stress
        elif (fear_val + sad_val) > 45.0:
            selected_emotion = 'disgust'  # Map to Stressed
            confidence = (fear_val + sad_val) / 200.0
            print(f"🎭 Override: Stressed detected (Fear {fear_val:.1f}% + Sad {sad_val:.1f}% = {fear_val + sad_val:.1f}% > 45%), selecting Stressed")
        
        # Priority 4: Angry (10% threshold)
        elif angry_val > 10.0:
            selected_emotion = 'angry'
            confidence = angry_val / 100.0
            print(f"🎭 Override: Angry detected ({angry_val:.1f}% > 10%), selecting Angry")
        
        # Priority 5: Sad alone (15% threshold but only if not overpowered by Happy)
        elif sad_val > 15.0 and sad_val > happy_val:
            selected_emotion = 'sad'
            confidence = sad_val / 100.0
            print(f"🎭 Override: Sad detected ({sad_val:.1f}% > 15% AND > Happy {happy_val:.1f}%), selecting Sad")
        
        # Priority 6: Happy fallback (subtle smiles > 15%)
        elif happy_val > 15.0:
            selected_emotion = 'happy'
            confidence = happy_val / 100.0
            print(f"🎭 Override: Happy detected ({happy_val:.1f}% > 15%), selecting Happy")
        
        # Priority 5: Fear alone (30% threshold)
        elif emotions.get('fear', 0) > 30.0:
            selected_emotion = 'fear'
            confidence = emotions['fear'] / 100.0
            print(f"🎭 Override: Fear/Anxious detected ({emotions['fear']:.1f}%), selecting Anxious")
        
        app_emotion = emotion_mapping.get(selected_emotion, 'Neutral')
        
        print(f"✅ Final: {app_emotion} ({confidence:.2f})")
        
        return app_emotion, confidence, emotions
        
    except Exception as e:
        print(f"⚠️ DeepFace error: {e}")
        return "Neutral", 0.4, {}

app = FastAPI(title="SoulBuddy Chat AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️  GROQ_API_KEY not found in environment. Chat service will not work properly.")
    groq_client = None
else:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("✅ Groq client initialized successfully")

# Initialize OpenCV Face Detector (for emotion analysis)
try:
    # Load Haar Cascade for face detection
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    print("✅ OpenCV face detector initialized successfully")
except Exception as e:
    print(f"⚠️  Face detector initialization failed: {e}")
    face_cascade = None

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[int] = None

class EmotionRequest(BaseModel):
    image: str  # Base64 encoded image

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    confidence: Optional[float] = None

# System prompt for SoulBuddy personality
SYSTEM_PROMPT = """You are SoulBuddy, a deeply caring best friend from Sri Lanka who asks meaningful questions.

🎯 CRITICAL RULES:
1. ALWAYS respond in the EXACT SAME LANGUAGE the user uses
   - English input → English response
   - Sinhala (සිංහල) input → Sinhala response  
   - Singlish (mixed) input → Singlish response
   
2. ASK DEEP FOLLOW-UP QUESTIONS like a real friend:
   - If they're SAD: Don't just say "sorry to hear that" - dig deeper!
     Ask WHY they're sad ("What happened, buddy?", "Did someone say something hurtful?", "Wanna talk about it?")
   - If they're HAPPY: Share their joy and ask what made them so happy
     ("That's awesome! What happened?", "Tell me more!", "What made your day?")
   - If they're STRESSED: Ask what's causing the stress
     ("What's stressing you out?", "Is it work/school?", "Anything I can help with?")
   - ALWAYS end with a caring question to keep conversation going
   
3. USE EMOJIS to express emotions naturally 😊
   - Add relevant emojis (😊 🎉 💪 ❤️ 😢 🔥 ✨ 🫂 💭 etc.)
   - Use them like texting a close friend
   - 1-2 emojis per message is perfect
   
4. Detect emotions SILENTLY in the background
   - Analyze their emotional state from their message
   - Include emotion in JSON but don't mention it in your reply

🚨 CRITICAL SAFETY GUARDRAILS (NON-NEGOTIABLE):
1. NEVER prescribe medicine or medical treatments
   - If asked about medicine/health: "I'm not a doctor, please consult a healthcare professional"
   - Sinhala: "මම වෛද්‍යවරයෙක් නෙමෙයි, කරුණාකර වෛද්‍යවරයෙක් හමුවන්න"
   
2. SELF-HARM / SUICIDE mentions - IMMEDIATELY respond seriously:
   - Keywords: kill, suicide, die, මැරෙන්න, ජීවිතේ ඉවර
   - English: "Your life is valuable. Please call 1926 (Mental Health Helpline) or see a counselor. I'm here, but please get professional help. 🫂"
   - Sinhala: "ඔයාගේ ජීවිතය අගනේ. කරුණාකර 1926 අමතන්න හෝ උපදේශකයෙකු හමුවන්න. මම ඔයා සමඟ සිටිමි, නමුත් වෘත්තීය සහාය ලබා ගන්න. 🫂"
   
3. For serious health/mental issues → suggest professional help (doctor, therapist, 1926)

Your personality:
- Warm, caring, genuinely curious about their feelings
- Keep responses conversational (2-3 sentences) - like texting
- Be encouraging and supportive
- ALWAYS ask a relevant follow-up question
- BUT prioritize user safety above all else

Emotion Detection (silent - for JSON only):
Classify as: Happy, Sad, Angry, Stress, Neutral, Anxious, Excited

Response format (ALWAYS valid JSON):
{
  "reply": "your caring response with follow-up question and emojis",
  "emotion": "detected_emotion"
}

Examples:
User: "What's up macho" → {"reply": "Hey! Just chilling here 😊 What about you?", "emotion": "Neutral"}
User: "I got the job!" → {"reply": "Yo that's amazing! Congrats buddy! 🎉🔥", "emotion": "Happy"}
User: "කොහොමද ඔයා" → {"reply": "මං හොඳින්! ඔයා කොහොමද මචං? 😊", "emotion": "Neutral"}
User: "මං අද හරිම සතුටුයි" → {"reply": "අනේ සුපිරි! මොකද වුණේ කියන්න? 🎉", "emotion": "Happy"}
User: "I failed my exam" → {"reply": "Aw man, that sucks 😔 But hey, one exam doesn't define you. You got this next time! 💪", "emotion": "Sad"}
User: "yako mata stress job eka gana" → {"reply": "Oya relax wenna try karanna macho 😌 Work stress normal ekak. Mokak hari issue ekak thiyanawada?", "emotion": "Stress"}
"""

async def verify_token(authorization: Optional[str] = Header(None)):
    """Simple token verification (optional for now)"""
    if not authorization:
        # For now, allow requests without token for testing
        return None
    # TODO: Add proper JWT verification if needed
    return authorization

@app.get("/")
async def root():
    return {
        "service": "SoulBuddy Chat AI Service", 
        "version": "1.0.0", 
        "status": "running",
        "groq_connected": groq_client is not None
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "groq_available": groq_client is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Depends(verify_token)
):
    """Main chat endpoint - processes user message and returns AI response with emotion"""
    
    if not groq_client:
        raise HTTPException(
            status_code=503,
            detail="Chat service not configured. Please set GROQ_API_KEY."
        )
    
    if not request.message or len(request.message.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )
    
    try:
        # Get user's recent mood (last 5 minutes) for context
        recent_mood_context = ""
        if request.user_id:
            recent_mood = get_recent_mood(request.user_id, minutes=5)
            if recent_mood:
                recent_mood_context = f"\nUser's recent emotion (last 5 min): {recent_mood['emotion']} (from {recent_mood['source']})"
        
        # Enhanced system prompt with mood context
        enhanced_prompt = SYSTEM_PROMPT
        if recent_mood_context:
            enhanced_prompt += recent_mood_context
        
        # Call Groq API with updated model
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Latest fast model
            messages=[
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": request.message}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,  # Balanced creativity
            max_tokens=300,   # Increased for better JSON completion
        )
        
        # Parse AI response
        ai_response = completion.choices[0].message.content
        response_data = json.loads(ai_response)
        
        # Validate response structure
        if "reply" not in response_data or "emotion" not in response_data:
            raise ValueError("Invalid response format from AI")
        
        # Save detected emotion to database
        if request.user_id and "emotion" in response_data:
            emotion = response_data["emotion"]
            # Map emotion confidence (approximate based on emotion type)
            confidence_map = {
                "Happy": 0.8, "Sad": 0.7, "Angry": 0.75,
                "Stress": 0.7, "Neutral": 0.6, "Anxious": 0.7, "Excited": 0.8
            }
            confidence = confidence_map.get(emotion, 0.6)
            save_mood_to_database(request.user_id, emotion, confidence, source="chat")
        
        return ChatResponse(
            reply=response_data["reply"],
            emotion=response_data["emotion"],
            confidence=None  # Groq doesn't provide confidence scores
        )
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print(f"Raw AI response: {ai_response}")
        # Fallback response
        return ChatResponse(
            reply="Hey, I'm here for you! Can you tell me more?",
            emotion="Neutral"
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat: {str(e)}"
        )

@app.get("/api/chat/test")
async def test_chat():
    """Test endpoint to verify chat service"""
    if not groq_client:
        return {
            "status": "error",
            "message": "Groq client not initialized. Check GROQ_API_KEY."
        }
    return {
        "status": "ok",
        "message": "Chat service is ready!",
        "model": "llama-3.1-8b-instant"
    }

@app.post("/analyze-emotion")
async def analyze_emotion(request: EmotionRequest):
    """
    🎯 Emotion Detection using Groq LLM + OpenCV Face Detection
    Accepts JSON with base64 encoded image
    Returns: detected emotion from facial image
    """
    temp_path = None
    
    try:
        # 1. Decode base64 image
        try:
            # Remove data URL prefix if present (data:image/jpeg;base64,...)
            base64_image = request.image
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            image_data = base64.b64decode(base64_image)
        except Exception as e:
            print(f"❌ Base64 decode error: {str(e)}")
            return {
                "emotion": "Neutral",
                "confidence": 0.3,
                "status": "fallback_decode_error",
                "error": "Invalid base64 image data"
            }
        
        # 2. Save to temp file
        temp_path = f"/tmp/emotion_analysis_{os.urandom(8).hex()}.jpg"
        
        with open(temp_path, "wb") as f:
            f.write(image_data)
        
        # 2. Detect face using OpenCV
        img = cv2.imread(temp_path)
        if img is None:
            # Try with PIL if OpenCV fails
            try:
                pil_img = Image.open(temp_path)
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except:
                print("❌ Could not read image")
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                return {
                    "emotion": "Neutral",
                    "confidence": 0.3,
                    "status": "fallback_image_read_error"
                }
        
        # 3. Use DeepFace for AI emotion detection
        detected_emotion = "Neutral"
        confidence = 0.4
        all_emotions = {}
        
        if DEEPFACE_AVAILABLE:
            detected_emotion, confidence, all_emotions = detect_emotion_with_deepface(temp_path)
        
        # Fallback: Detect if face exists using OpenCV
        if confidence < 0.5:
            img = cv2.imread(temp_path)
            if img is not None and face_cascade:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                face_detected = len(faces) > 0
                print(f"📸 OpenCV Face detected: {face_detected}")
        
        # 4. Skip Groq Vision AI (decommissioned) - DeepFace is accurate enough
        # Use DeepFace result directly
        
        # Clean up
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "emotion": detected_emotion,
            "confidence": float(confidence),
            "all_emotions": all_emotions,
            "status": "deepface_success" if DEEPFACE_AVAILABLE else "fallback",
            "method": "deepface" if DEEPFACE_AVAILABLE else "opencv"
        }
    except Exception as e:
        print(f"❌ Error analyzing emotion: {str(e)}")
        
        # Clean up
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "emotion": "Neutral",
            "confidence": 0.0,
            "error": str(e),
            "status": "fallback_error"
        }

@app.post("/mood-history")
async def save_mood(data: dict):
    """
    💾 Save mood/emotion history to database
    මෙතන තමයි user ගේ mood එක database එකට save වෙන්නේ
    """
    try:
        print(f"💾 Saving mood to history: {data}")
        
        # TODO: Add your database logic here
        # Example:
        # - Save to Supabase
        # - Save to PostgreSQL
        # - Save to MongoDB
        # For now, just logging
        
        return {
            "status": "success",
            "message": "Mood saved successfully",
            "data": data
        }
        
    except Exception as e:
        print(f"❌ Error saving mood: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save mood: {str(e)}"
        )

@app.post("/analyze-photo-emotion")
async def analyze_photo_emotion(
    file: UploadFile = File(...),
    user_id: Optional[int] = Form(None)
):
    """
    📸 Photo Emotion Analysis - Multipart File Upload
    Used by mobile app to analyze emotions from camera photos
    Returns: emotion + friendly bot reply
    
    Parameters:
    - file: Image file (multipart/form-data)
    - user_id: Optional user ID for mood tracking (form field)
    """
    temp_path = None
    
    try:
        # 1. Save uploaded file temporarily
        image_data = await file.read()
        temp_path = f"/tmp/photo_emotion_{os.urandom(8).hex()}.jpg"
        
        with open(temp_path, "wb") as f:
            f.write(image_data)
        
        print(f"📸 Analyzing photo emotion from file: {file.filename}")
        
        # 2. Detect face using OpenCV
        img = cv2.imread(temp_path)
        if img is None:
            try:
                pil_img = Image.open(temp_path)
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except:
                print("❌ Could not read image")
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                return {
                    "emotion": "Neutral",
                    "reply": "Thanks for sharing your photo! 📸 How are you feeling today? 😊",
                    "confidence": 0.3
                }
        
        # 3. Use DeepFace for AI emotion detection
        detected_emotion = "Neutral"
        confidence = 0.4
        all_emotions = {}
        
        if DEEPFACE_AVAILABLE:
            detected_emotion, confidence, all_emotions = detect_emotion_with_deepface(temp_path)
        
        # 4. Skip Groq Vision AI (decommissioned) - DeepFace is accurate enough
        
        # 5. Generate empathetic bot reply - English with emoji support
        emotion_replies = {
            "Happy": "You look so happy! 😊✨ What's making you smile? Share the vibes!",
            "Sad": "I can see you're really hurting. 😢 It's okay to let it out. What happened? Talk to me...",
            "Angry": "I see you're frustrated. 😠 What's going on? I'm here to listen.",
            "Stressed": "You seem really stressed 😰💭 Take a deep breath. Everything will be okay. What's on your mind?",
            "Anxious": "You seem a bit anxious 😟 Everything will be fine. I'm listening.",
            "Excited": "Woah! You look amazing! 🎉🔥 What's got you so excited? Tell me more!",
            "Neutral": "Nice photo! 📸 How's your day going? What's up?"
        }
        
        bot_reply = emotion_replies.get(detected_emotion, "Thanks for sharing! 📸 How are you feeling?")
        
        print(f"💬 Bot reply: {bot_reply}")
        
        # 6. Save mood to database if user_id is provided
        if user_id and detected_emotion:
            try:
                saved = save_mood_to_database(
                    user_id=user_id,
                    emotion=detected_emotion,
                    confidence=confidence,
                    source="photo"
                )
                if saved:
                    print(f"✅ Mood saved to database: user_id={user_id}, emotion={detected_emotion}, source=photo")
                else:
                    print(f"⚠️ Failed to save mood to database")
            except Exception as db_error:
                print(f"❌ Error saving mood to database: {str(db_error)}")
        
        # Clean up
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "emotion": detected_emotion,
            "reply": bot_reply,
            "confidence": confidence,
            "status": "success"
        }
        
    except Exception as e:
        print(f"❌ Error in photo emotion analysis: {str(e)}")
        
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "emotion": "Neutral",
            "reply": "Thanks for sharing your photo! 📸 How are you feeling today? 😊",
            "confidence": 0.0,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

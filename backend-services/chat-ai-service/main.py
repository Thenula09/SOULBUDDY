"""
SoulBuddy Chat AI Service - Groq-powered emotional chat buddy
"""
import os
import json
import base64
import shutil
import tempfile
from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
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
import uuid
import asyncio

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
# URL for the User service (used to proxy mood endpoints when needed)
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8004")

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
            json=data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Mood saved to database: user_id={user_id}, emotion={emotion} ({confidence:.2f}) from {source}")
            return True
        else:
            print(f"⚠️ Failed to save mood: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving mood to database: {e}")
        return False

def save_chat_to_database(user_id: int, user_message: str, ai_reply: str, ai_emotion: str, user_mood: Optional[str] = None):
    """Save chat conversation to Supabase database"""
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
            "user_message": user_message,
            "ai_reply": ai_reply,
            "ai_emotion": ai_emotion,
            "user_mood": user_mood,
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Chat saved to database: user_id={user_id}, ai_emotion={ai_emotion}")
            return True
        else:
            print(f"⚠️ Failed to save chat: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving chat to database: {e}")
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


def get_latest_mood(user_id: int):
    """Get the latest mood for a user (no time limit) from Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=headers,
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": 1},
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                return data[0]
        return None
    except Exception as e:
        print(f"❌ Error fetching latest mood: {e}")
        return None

def process_mood_logs_step_by_step(user_id: int, days: int = 7):
    """
    Step-by-step mood log processing for trend analysis and insights
    Returns processed mood data with trends and recommendations
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase not configured"}
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        
        # Step 1: Get mood history for the specified period
        time_ago = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=headers,
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{time_ago}",
                "order": "created_at.asc"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return {"error": f"Failed to fetch mood data: {response.status_code}"}
        
        mood_logs = response.json()
        
        if not mood_logs:
            return {
                "user_id": user_id,
                "period_days": days,
                "total_entries": 0,
                "message": "No mood data found for the period"
            }
        
        # Step 2: Process mood data by day
        daily_moods = {}
        emotion_counts = {}
        confidence_scores = []
        
        for log in mood_logs:
            created_at = log.get('created_at', '')
            emotion = log.get('emotion', 'Neutral')
            confidence = log.get('confidence', 0.5)
            source = log.get('source', 'unknown')
            
            # Parse date
            try:
                log_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).date()
                date_str = log_date.isoformat()
            except:
                continue
            
            # Group by day
            if date_str not in daily_moods:
                daily_moods[date_str] = []
            daily_moods[date_str].append({
                'emotion': emotion,
                'confidence': confidence,
                'source': source,
                'timestamp': created_at
            })
            
            # Count emotions
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            confidence_scores.append(confidence)
        
        # Step 3: Calculate daily summaries
        daily_summaries = {}
        for date, logs in daily_moods.items():
            # Find dominant emotion for the day
            emotion_freq = {}
            total_confidence = 0
            
            for log in logs:
                emotion = log['emotion']
                confidence = log['confidence']
                emotion_freq[emotion] = emotion_freq.get(emotion, 0) + 1
                total_confidence += confidence
            
            dominant_emotion = max(emotion_freq.items(), key=lambda x: x[1])[0]
            avg_confidence = total_confidence / len(logs) if logs else 0
            
            daily_summaries[date] = {
                'dominant_emotion': dominant_emotion,
                'emotion_frequency': emotion_freq,
                'avg_confidence': round(avg_confidence, 2),
                'total_entries': len(logs)
            }
        
        # Step 4: Analyze trends
        dates = sorted(daily_summaries.keys())
        trend_analysis = {}
        
        if len(dates) >= 2:
            # Calculate mood stability (how consistent emotions are)
            emotions_sequence = [daily_summaries[date]['dominant_emotion'] for date in dates]
            changes = sum(1 for i in range(1, len(emotions_sequence)) 
                         if emotions_sequence[i] != emotions_sequence[i-1])
            stability_score = 1 - (changes / (len(emotions_sequence) - 1)) if len(emotions_sequence) > 1 else 1
            
            # Calculate average confidence trend
            confidence_trend = [daily_summaries[date]['avg_confidence'] for date in dates]
            confidence_improvement = confidence_trend[-1] - confidence_trend[0] if confidence_trend else 0
            
            trend_analysis = {
                'stability_score': round(stability_score, 2),
                'confidence_trend': round(confidence_improvement, 2),
                'total_mood_changes': changes,
                'period_days': len(dates)
            }
        
        # Step 5: Generate insights and recommendations
        insights = []
        recommendations = []
        
        # Most common emotion
        if emotion_counts:
            most_common = max(emotion_counts.items(), key=lambda x: x[1])
            insights.append(f"Most common emotion: {most_common[0]} ({most_common[1]} times)")
        
        # Mood stability insight
        if 'stability_score' in trend_analysis:
            stability = trend_analysis['stability_score']
            if stability > 0.7:
                insights.append("Your mood has been quite stable recently")
                recommendations.append("Consider trying new activities to add variety to your routine")
            elif stability < 0.3:
                insights.append("Your mood has been fluctuating frequently")
                recommendations.append("Consider tracking what triggers your mood changes")
        
        # Confidence trend
        if 'confidence_trend' in trend_analysis:
            conf_trend = trend_analysis['confidence_trend']
            if conf_trend > 0.1:
                insights.append("Your emotion detection confidence has improved")
            elif conf_trend < -0.1:
                insights.append("Your emotion detection confidence has decreased")
        
        # Step 6: Return processed data
        return {
            "user_id": user_id,
            "period_days": days,
            "total_entries": len(mood_logs),
            "daily_summaries": daily_summaries,
            "emotion_counts": emotion_counts,
            "avg_confidence": round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else 0,
            "trend_analysis": trend_analysis,
            "insights": insights,
            "recommendations": recommendations,
            "processed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error processing mood logs: {e}")
        return {"error": str(e)}
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
        # Analyze with DeepFace — robust attempt across backends
        # Try RetinaFace first (more accurate), then fallback to OpenCV for tilted/low-light faces.
        result = None
        last_exc = None
        for backend in ("retinaface", "opencv"):
            try:
                print(f"🔁 Trying DeepFace with backend='{backend}' (enforce_detection=False)")
                r = DeepFace.analyze(
                    img_path=image_path,
                    actions=['emotion'],
                    enforce_detection=False,  # never crash if face not clearly detected
                    detector_backend=backend,
                    silent=True
                )

                if isinstance(r, list):
                    r = r[0]

                # accept result only if it has expected keys
                if r and isinstance(r, dict) and 'dominant_emotion' in r and 'emotion' in r:
                    result = r
                    print(f"✅ DeepFace succeeded with backend='{backend}'")
                    break
                else:
                    print(f"⚠️ DeepFace ({backend}) returned unexpected result: {r}")

            except Exception as e:
                last_exc = e
                print(f"⚠️ DeepFace ({backend}) error: {e}")
                # continue to next backend
                continue

        if result is None:
            # let the outer exception handler return the neutral fallback
            raise Exception(f"DeepFace failed on all backends. Last error: {last_exc}")

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


def detect_emotion_with_preprocessing(image_path):
    """
    Try DeepFace first; if confidence is low, attempt OpenCV face-detection + cropping,
    rotation attempts and CLAHE preprocessing, then retry DeepFace on the crop.
    Returns: (emotion, confidence, all_emotions, face_detected:bool, method:str)
    """
    # baseline using DeepFace (may return low-confidence neutral)
    base_emotion, base_conf, base_all = detect_emotion_with_deepface(image_path)

    # If DeepFace already confident, accept it
    if base_conf >= 0.5:
        return base_emotion, base_conf, base_all, True, "deepface"

    # Try OpenCV-assisted detection / cropping and retry DeepFace on the crop
    try:
        img = cv2.imread(image_path)
        if img is None:
            try:
                pil_img = Image.open(image_path).convert('RGB')
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception as e:
                print(f"❌ preprocess: could not read image: {e}")
                return base_emotion, base_conf, base_all, False, "none"

        def _opencv_faces(p_img):
            gray = cv2.cvtColor(p_img, cv2.COLOR_BGR2GRAY)
            try:
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                gray = clahe.apply(gray)
            except Exception:
                pass
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(30,30))
            return faces

        # Try original + rotated variants to handle rotated selfies
        for angle in (0, 90, 270, 180):
            p_img = img
            if angle == 90:
                p_img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            elif angle == 270:
                p_img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
            elif angle == 180:
                p_img = cv2.rotate(img, cv2.ROTATE_180)

            faces = _opencv_faces(p_img) if face_cascade is not None else []
            if len(faces) > 0:
                # pick largest face box
                x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
                pad = int(0.2 * max(w, h))
                x0 = max(0, x - pad)
                y0 = max(0, y - pad)
                x1 = min(p_img.shape[1], x + w + pad)
                y1 = min(p_img.shape[0], y + h + pad)
                crop = p_img[y0:y1, x0:x1]

                crop_path = f"/tmp/emotion_crop_{os.urandom(6).hex()}.jpg"
                cv2.imwrite(crop_path, crop)

                try:
                    e2, c2, all2 = detect_emotion_with_deepface(crop_path)
                except Exception as ex:
                    print(f"❌ DeepFace on crop failed: {ex}")
                    e2, c2, all2 = base_emotion, base_conf, base_all

                try:
                    os.remove(crop_path)
                except Exception:
                    pass

                # If crop yields better confidence, return that (face detected)
                if c2 >= 0.25:
                    return e2, c2, all2, True, "opencv_crop"

                # otherwise still mark face detected (detected by OpenCV)
                return base_emotion, base_conf, base_all, True, "opencv_detect"

        # no faces at all
        return base_emotion, base_conf, base_all, False, "none"

    except Exception as e:
        print(f"❌ preprocess detection error: {e}")
        return base_emotion, base_conf, base_all, False, "error"


app = FastAPI(title="SoulBuddy Chat AI Service", version="1.0.0")

# In-memory task store for async photo-analysis jobs (short-lived)
TASK_STORE: dict = {}

def _new_task_id() -> str:
    return uuid.uuid4().hex

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
    user_id: Optional[int] = 1  # Default to user_id 1 for testing
    mood: Optional[str] = None  # optional mood hint (e.g., from photo analysis)

class EmotionRequest(BaseModel):
    image: str  # Base64 encoded image

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    confidence: Optional[float] = None
    user_mood: Optional[str] = None  # latest stored mood used as context (optional)

# System prompt for SoulBuddy personality
SYSTEM_PROMPT = """You are SoulBuddy, a deeply caring best friend from Sri Lanka who asks meaningful questions.

🔍 MOOD CONTEXT AWARENESS:
- If the user was feeling 'Sad' or 'Stressed' in the last 5 minutes (check mood history):
  * Start by acknowledging it warmly: "I noticed earlier you were feeling a bit down, is everything okay now?"
  * Show genuine care and continue the conversation naturally
  * Match the user's language (English/Singlish/Sinhala)
- If mood improved (Sad → Happy): Celebrate with them: "I'm so glad you're feeling better! What changed?"

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

# Backward-compatible API path for mobile app (frontend calls /api/v1/chat)
@app.post("/api/v1/chat", response_model=ChatResponse)
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
        print('DBG: chat handler entry - request=', getattr(request, 'model_dump', lambda: str(request))())
        # --- SAFE MOOD RETRIEVAL ---
        user_mood = None
        latest_mood_data = None

        if request.user_id:
            try:
                # database එකෙන් latest mood එක ගන්න වෙයි
                latest_mood_data = get_latest_mood(request.user_id)

                # Null-safe check before using .get()
                if latest_mood_data and isinstance(latest_mood_data, dict):
                    user_mood = latest_mood_data.get('emotion')
                    print(f"🔎 Found mood in DB: {user_mood}")
            except Exception as e:
                print(f"⚠️ Error fetching mood from DB: {e}")

        # --- ENHANCED PROMPT ---
        enhanced_prompt = SYSTEM_PROMPT
        if user_mood:
            enhanced_prompt += f"\nUser's last recorded mood: {user_mood}"

        # Log for debugging
        print(f"🔎 Chat context - user_id={request.user_id} user_mood={user_mood}")
        
        # Call Groq API with updated model
        try:
            print(f"DBG: sending prompt (user_id={request.user_id}) — mood={user_mood}")
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

            # Defensive parsing of AI response (handle None / dict / string)
            ai_response = None
            response_data = None
            try:
                # Some SDKs return structured objects — normalize to dict
                raw_choice = None
                if completion and getattr(completion, 'choices', None):
                    raw_choice = completion.choices[0]
                print('DBG: groq raw_choice=', raw_choice)

                # try to extract content safely
                ai_candidate = None
                if raw_choice and getattr(raw_choice, 'message', None):
                    ai_candidate = raw_choice.message.content
                elif isinstance(completion, dict) and completion.get('choices'):
                    # Defensive: guard against malformed/None entries in choices list
                    choices = completion.get('choices') if isinstance(completion, dict) else None
                    ai_candidate = None
                    if isinstance(choices, list) and len(choices) > 0:
                        first = choices[0]
                        if isinstance(first, dict):
                            # message may be missing or not a dict — normalize safely
                            msg = first.get('message') or {}
                            if isinstance(msg, dict):
                                ai_candidate = msg.get('content')
                            else:
                                # fallback to any common fields
                                ai_candidate = first.get('text') or first.get('content')
                    # leave ai_candidate as None if nothing usable found
                else:
                    ai_candidate = getattr(completion, 'content', None)

                print('DBG: ai_candidate type=', type(ai_candidate), ' value=', ai_candidate)

                if ai_candidate is None:
                    raise ValueError('AI response is empty')

                if isinstance(ai_candidate, dict):
                    response_data = ai_candidate
                else:
                    # ensure it's a JSON string and parse
                    if not isinstance(ai_candidate, str):
                        ai_candidate = str(ai_candidate)
                    response_data = json.loads(ai_candidate)

            except Exception as parse_exc:
                print(f"⚠️ Failed to parse AI response: {parse_exc}")
                print('Raw completion object:', completion)
                # Graceful fallback when AI returns unexpected output
                return ChatResponse(
                    reply="Sorry, I couldn't understand the AI response — can you try rephrasing?",
                    emotion="Neutral",
                    confidence=0.0,
                    user_mood=user_mood
                )

        except Exception as e:
            # Graceful fallback when Groq API fails (prevents a 500 bubbling to the client)
            print(f"⚠️ Groq call failed: {e}")
            return ChatResponse(
                reply="Sorry, the AI service is temporarily unavailable. I'm here to listen — how are you feeling right now?", 
                emotion="Neutral",
                confidence=0.0,
                user_mood=user_mood
            )
        
        # Validate response structure
        if "reply" not in response_data or "emotion" not in response_data:
            raise ValueError("Invalid response format from AI")
        
        # Save detected emotion to database - ALWAYS save
        if "emotion" in response_data:
            emotion = response_data["emotion"]
            # Map emotion confidence (approximate based on emotion type)
            confidence_map = {
                "Happy": 0.8, "Sad": 0.7, "Angry": 0.75,
                "Stress": 0.7, "Neutral": 0.6, "Anxious": 0.7, "Excited": 0.8
            }
            confidence = confidence_map.get(emotion, 0.6)
            user_id_to_save = request.user_id if request.user_id else 1  # Use default if not provided
            
            try:
                saved = save_mood_to_database(user_id_to_save, emotion, confidence, source="chat")
                if saved:
                    print(f"✅ Mood saved to database: user_id={user_id_to_save}, emotion={emotion}, confidence={confidence}, source=chat")
                else:
                    print(f"⚠️ Failed to save mood to database - Check Supabase credentials")
            except Exception as db_error:
                print(f"❌ Error saving mood to database: {str(db_error)}")
        
        # Save chat conversation to database
        try:
            chat_saved = save_chat_to_database(
                user_id=request.user_id if request.user_id else 1,
                user_message=request.message,
                ai_reply=response_data["reply"],
                ai_emotion=response_data["emotion"],
                user_mood=user_mood
            )
            if chat_saved:
                print(f"✅ Chat saved to database: user_id={request.user_id}, ai_emotion={response_data['emotion']}")
            else:
                print(f"⚠️ Failed to save chat to database")
        except Exception as chat_db_error:
            print(f"❌ Error saving chat to database: {str(chat_db_error)}")
        
        return ChatResponse(
            reply=response_data["reply"],
            emotion=response_data["emotion"],
            confidence=None,  # Groq doesn't provide confidence scores
            user_mood=user_mood
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
        import traceback
        print(f"Chat error: {e}")
        traceback.print_exc()
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

# Compatibility endpoint used by mobile frontend to trigger a client-side chat reset
@app.post("/api/v1/reset-chat")
async def reset_chat():
    """Return success so the mobile app can clear its chat state."""
    # Server is stateless for chat history — frontend should clear its local storage.
    return {"success": True, "message": "chat reset acknowledged"}


@app.post("/api/v1/analyze-emotion")
@app.post("/analyze-emotion")
async def analyze_emotion(request: EmotionRequest):
    """
    🎯 Emotion Detection (JSON/base64)
    - Decodes image, runs DeepFace preprocessing and returns emotion + confidence.
    - ALSO attempts to persist detected mood to Supabase (best-effort) and returns `saved` flag.
    """
    print("🔍 analyze_emotion called (json/base64)")
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
            return JSONResponse(status_code=400, content={
                "emotion": "Neutral",
                "confidence": 0.3,
                "status": "fallback_decode_error",
                "error": "Invalid base64 image data"
            })

        # 2. Save to temp file
        temp_path = f"/tmp/emotion_analysis_{os.urandom(8).hex()}.jpg"
        with open(temp_path, "wb") as f:
            f.write(image_data)

        # 3. Detect face using DeepFace + preprocessing
        detected_emotion = "Neutral"
        confidence = 0.4
        all_emotions = {}
        face_detected = False
        method = "none"

        if DEEPFACE_AVAILABLE:
            detected_emotion, confidence, all_emotions, face_detected, method = detect_emotion_with_preprocessing(temp_path)

        # 4. Attempt to save detected mood to Supabase (best-effort)
        saved = False
        try:
            saved = save_mood_to_database(user_id=1, emotion=detected_emotion, confidence=confidence, source="photo")
        except Exception as e:
            print(f"❌ analyze_emotion: exception while saving mood: {e}")

        # Clean up
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass

        status_flag = "deepface_success" if DEEPFACE_AVAILABLE and confidence >= 0.5 else ("no_face_detected" if not face_detected else "deepface_fallback")

        return JSONResponse(status_code=200, content={
            "status": "success",
            "detection_status": status_flag,
            "emotion": detected_emotion,
            "confidence": float(confidence),
            "all_emotions": all_emotions,
            "face_detected": face_detected,
            "method": "deepface" if DEEPFACE_AVAILABLE else "opencv",
            "saved": bool(saved)
        })

    except Exception as e:
        print(f"❌ Error analyzing emotion: {str(e)}")
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
        return JSONResponse(status_code=500, content={
            "emotion": "Neutral",
            "confidence": 0.0,
            "error": str(e),
            "status": "fallback_error"
        })


# --- Proxy endpoints for mood (forward to user-service) ---
@app.post("/users/mood")
async def proxy_save_mood(request_body: dict, authorization: Optional[str] = Header(None)):
    """Proxy POST /users/mood to the User Service"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        resp = requests.post(f"{USER_SERVICE_URL}/users/mood", json=request_body, headers=headers, timeout=5)
        return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.content else {})
    except Exception as e:
        print(f"Proxy save_mood error: {e}")
        raise HTTPException(status_code=502, detail="Failed to proxy to user service")


@app.get("/users/mood/today")
async def proxy_get_today_moods(authorization: Optional[str] = Header(None)):
    """Proxy GET /users/mood/today to the User Service"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        resp = requests.get(f"{USER_SERVICE_URL}/users/mood/today", headers=headers, timeout=5)
        return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.content else [])
    except Exception as e:
        print(f"Proxy get_today_moods error: {e}")
        raise HTTPException(status_code=502, detail="Failed to proxy to user service")


@app.get("/users/mood/analytics/today")
async def proxy_get_mood_analytics_today(authorization: Optional[str] = Header(None)):
    """Proxy GET /users/mood/analytics/today to the User Service"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        resp = requests.get(f"{USER_SERVICE_URL}/users/mood/analytics/today", headers=headers, timeout=5)
        return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.content else {})
    except Exception as e:
        print(f"Proxy get_mood_analytics_today error: {e}")
        raise HTTPException(status_code=502, detail="Failed to proxy to user service")

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

async def _process_photo_background(task_id: str, image_path: str, user_id: int):
    """Background worker: run detection, save to DB, update TASK_STORE."""
    try:
        print(f"🔁 [task:{task_id}] starting background processing for user_id={user_id}")
        detected_emotion, confidence, all_emotions, face_detected, method = detect_emotion_with_preprocessing(image_path)

        # Best-effort save
        saved = save_mood_to_database(user_id=user_id, emotion=detected_emotion, confidence=confidence, source="photo")
        if saved:
            print(f"✅ [task:{task_id}] mood saved for user_id={user_id}: {detected_emotion} ({confidence:.2f})")
        else:
            print(f"⚠️ [task:{task_id}] mood NOT saved for user_id={user_id}")

        TASK_STORE[task_id]["status"] = "done"
        TASK_STORE[task_id]["result"] = {
            "emotion": detected_emotion,
            "confidence": confidence,
            "saved": bool(saved),
            "bot_reply": {
                "Happy": "I can see that beautiful smile! 😊 What's making you so happy today?",
                "Sad": "I can see a bit of sadness in your eyes. 😔 Is everything okay? What's on your mind?",
                "Angry": "I can sense some frustration or anger. 😠 It's okay to feel that way. What happened?",
                "Stressed": "You look quite overwhelmed and stressed out. 😰 Take a deep breath. Do you want to tell me what's weighing you down?",
                "Anxious": "You seem a bit anxious. 😟 Everything will be fine. I'm listening.",
                "Excited": "Woah! You look amazing! 🎉🔥 What's got you so excited? Tell me more!",
                "Neutral": "You look calm! 📸 How is your day treating you so far?"
            }.get(detected_emotion, "Thanks for sharing! 📸 How are you feeling?"),
            "all_emotions": all_emotions,
            "face_detected": face_detected,
            "method": method
        }

    except Exception as ex:
        print(f"❌ [task:{task_id}] background processing failed: {ex}")
        TASK_STORE[task_id]["status"] = "error"
        TASK_STORE[task_id]["result"] = {"error": str(ex)}
    finally:
        try:
            if os.path.exists(image_path):
                os.remove(image_path)
        except Exception:
            pass


@app.get('/analyze-photo-emotion/status/{task_id}')
async def analyze_photo_status(task_id: str):
    """Get status/result for a previously queued photo analysis task"""
    item = TASK_STORE.get(task_id)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    return item


@app.post("/analyze-photo-emotion")
async def analyze_photo_emotion(
    file: UploadFile = File(...),
    user_id: int = Form(1),  # Default user_id = 1 for testing
    background: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None
):
    """
    📸 Photo Emotion Analysis - Multipart File Upload
    - If `background=true` is provided, analysis runs asynchronously and returns a task_id.
    - Otherwise it behaves synchronously (legacy behavior).
    """
    temp_path = None

    try:
        # 1. Save uploaded file temporarily
        image_data = await file.read()
        temp_path = f"/tmp/photo_emotion_{os.urandom(8).hex()}.jpg"

        with open(temp_path, "wb") as f:
            f.write(image_data)

        print(f"📸 Received photo for user_id={user_id}: {file.filename}  (background={background})")

        # If caller requested async/background processing, enqueue and return task id
        if background and background.lower() in ("1", "true", "yes"):
            task_id = _new_task_id()
            TASK_STORE[task_id] = {"status": "queued", "created_at": datetime.utcnow().isoformat(), "user_id": user_id, "result": None}
            # schedule background worker
            if background_tasks is not None:
                background_tasks.add_task(_process_photo_background, task_id, temp_path, user_id)
            else:
                # fallback - schedule on event loop
                asyncio.create_task(_process_photo_background(task_id, temp_path, user_id))

            # do NOT remove temp_path here - background worker will clean it up
            return JSONResponse(status_code=202, content={"status": "processing", "task_id": task_id, "message": "Photo analysis queued; will update when done."})

        # --- Legacy synchronous path (detect now, save now) ---
        print(f"🔁 Performing synchronous detection for user_id={user_id}")
        detected_emotion, confidence, all_emotions, face_detected, method = detect_emotion_with_preprocessing(temp_path)

        emotion_replies = {
            "Happy": "I can see that beautiful smile! 😊 What's making you so happy today?",
            "Sad": "I can see a bit of sadness in your eyes. 😔 Is everything okay? What's on your mind?",
            "Angry": "I can sense some frustration or anger. 😠 It's okay to feel that way. What happened?",
            "Stressed": "You look quite overwhelmed and stressed out. 😰 Take a deep breath. Do you want to tell me what's weighing you down?",
            "Anxious": "You seem a bit anxious. 😟 Everything will be fine. I'm listening.",
            "Excited": "Woah! You look amazing! 🎉🔥 What's got you so excited? Tell me more!",
            "Neutral": "You look calm! 📸 How is your day treating you so far?"
        }

        bot_reply = emotion_replies.get(detected_emotion, "Thanks for sharing! 📸 How are you feeling?")

        # Best-effort save
        saved = save_mood_to_database(user_id=user_id, emotion=detected_emotion, confidence=confidence, source="photo")
        if saved:
            print(f"✅ Mood saved to database: user_id={user_id}, emotion={detected_emotion}, confidence={confidence:.2f}")
        else:
            print(f"⚠️ Mood NOT saved to database for user_id={user_id}")

        # Clean up
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(status_code=200, content={
            "status": "success",
            "emotion": detected_emotion,
            "bot_reply": bot_reply,
            "confidence": confidence,
            "saved": bool(saved)
        })

    except Exception as e:
        print(f"❌ Error in photo emotion analysis: {str(e)}")

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(status_code=500, content={
            "emotion": "Neutral",
            "reply": "Thanks for sharing your photo! 📸 How are you feeling today? 😊",
            "confidence": 0.0,
            "error": str(e)
        })

@app.get("/api/v1/mood-analysis/{user_id}")
@app.get("/mood-analysis/{user_id}")
async def get_mood_analysis(user_id: int, days: int = 7):
    """
    Get step-by-step processed mood analysis for a user
    Returns trend analysis, insights, and recommendations
    """
    try:
        analysis = process_mood_logs_step_by_step(user_id, days)
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])
        
        return analysis
        
    except Exception as e:
        print(f"❌ Error in mood analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process mood analysis: {str(e)}")

@app.get("/api/v1/chat-history/{user_id}")
@app.get("/chat-history/{user_id}")
async def get_chat_history(user_id: int, limit: int = 50):
    """
    Get chat history for a user from database
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers=headers,
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": limit
            },
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {response.status_code}")
        
        chat_history = response.json()
        
        return {
            "user_id": user_id,
            "total_messages": len(chat_history),
            "messages": chat_history
        }
        
    except Exception as e:
        print(f"❌ Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

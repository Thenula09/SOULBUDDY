"""
🎭 DeepFace Emotion Detection Test Script
Test කරන්න photo එකක් දාලා
"""
import cv2
import numpy as np
from deepface import DeepFace
from PIL import Image
import sys

def test_deepface_emotion(image_path):
    """
    Test DeepFace emotion detection with a photo
    """
    print(f"\n🎭 Testing DeepFace with: {image_path}")
    print("="*60)
    
    try:
        # 1. Load image
        img = cv2.imread(image_path)
        if img is None:
            print("❌ Could not read image")
            return
        
        print(f"✅ Image loaded: {img.shape}")
        
        # 2. Analyze with DeepFace
        print("\n🔍 Analyzing emotions with DeepFace...")
        
        # Using Facenet512 model (most accurate)
        result = DeepFace.analyze(
            img_path=image_path,
            actions=['emotion'],
            enforce_detection=True,  # Ensure face is detected
            detector_backend='opencv'  # Use OpenCV for speed
        )
        
        print("\n📊 Analysis Results:")
        print("="*60)
        
        if isinstance(result, list):
            result = result[0]  # Get first face
        
        # Get emotions
        emotions = result['emotion']
        dominant_emotion = result['dominant_emotion']
        region = result['region']
        
        print(f"\n🎯 Dominant Emotion: {dominant_emotion.upper()}")
        print(f"📍 Face Region: x={region['x']}, y={region['y']}, w={region['w']}, h={region['h']}")
        print(f"\n📈 All Emotions:")
        
        # Sort emotions by confidence
        sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
        
        for emotion, score in sorted_emotions:
            bar = "█" * int(score / 5)
            print(f"  {emotion:12s}: {score:5.2f}% {bar}")
        
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
        
        app_emotion = emotion_mapping.get(dominant_emotion, 'Neutral')
        confidence = emotions[dominant_emotion] / 100.0
        
        print(f"\n🎯 For App: {app_emotion} (confidence: {confidence:.2f})")
        
        # Draw face box on image
        cv2.rectangle(img, 
                     (region['x'], region['y']), 
                     (region['x'] + region['w'], region['y'] + region['h']), 
                     (0, 255, 0), 2)
        
        # Add emotion text
        cv2.putText(img, f"{app_emotion} ({confidence:.2f})", 
                   (region['x'], region['y']-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Save result
        output_path = image_path.replace('.', '_result.')
        cv2.imwrite(output_path, img)
        print(f"\n💾 Result saved to: {output_path}")
        
        return {
            'emotion': app_emotion,
            'confidence': confidence,
            'all_emotions': emotions,
            'face_detected': True
        }
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # Test with a sample image URL (DeepFace can download)
        print("📸 No image provided. Testing with sample image...")
        image_path = "https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img1.jpg"
    
    result = test_deepface_emotion(image_path)
    
    if result:
        print("\n✅ DeepFace is working perfectly!")
    else:
        print("\n⚠️ DeepFace test failed")

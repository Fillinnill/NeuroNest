import os
import tempfile
import shutil
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.session import get_db
from db import models
from dependencies import get_current_user, require_child
from api.api_v1.endpoints.analytics import analyze_audio_features, analyze_text_nlp, generate_roleplay_response

router = APIRouter()

class ChatResponse(BaseModel):
    reply: str
    emotion_detected: str
    confidence_score: float
    feedback: str
    clarity_score: float
    clarity_feedback: str
    wpm: float
    pause_count: int
    hesitation_score: float
    anxiety_masking_score: Optional[float] = 0.0
    rumination_score: Optional[float] = 0.0
    alexithymia_score: Optional[float] = 0.0
    linguistic_markers_detected: Optional[List[str]] = []
    clinical_insights: Optional[str] = ""

@router.post("/chat", response_model=ChatResponse)
async def ai_chat_endpoint(
    db: Session = Depends(get_db),
    user_id: int = Form(...),
    scenario: str = Form(...),
    message: str = Form(...),
    response_delay: float = Form(0.0),
    audio_file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(require_child)
) -> Any:
    """
    State-of-the-art AI conversation chat endpoint.
    Accepts text message, response delay, and optional raw recorded audio.
    Runs Librosa speech-feature analysis and text sentiment & clarity NLP,
    saving full dynamic transcripts and aggregates in the database.
    """
    if current_user.id != user_id:
        print(f"[Auth Debug] Access denied: User '{current_user.username}' (ID: {current_user.id}) tried to spoof session for user ID {user_id}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student/child ID mismatch."
        )
    # 1. Initialize voice metrics
    voice_metrics = {
        "duration_sec": 0.0,
        "wpm": 0.0,
        "pause_count": 0,
        "hesitation_score": 0.0,
        "syllables_per_second": 0.0
    }
    
    # 2. Process uploaded audio if present
    if audio_file is not None:
        try:
            # Save uploaded audio file to a secure temporary path
            suffix = os.path.splitext(audio_file.filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
                shutil.copyfileobj(audio_file.file, temp_audio)
                temp_path = temp_audio.name
            
            # Analyze audio features using Librosa/Soundfile
            word_count = len(message.split())
            voice_metrics = analyze_audio_features(temp_path, word_count)
            
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
        except Exception as e:
            print(f"[Chat API] Audio processing error: {e}")
            
    # 3. Analyze text NLP & sentiment
    nlp_metrics = analyze_text_nlp(message, response_delay)
    
    # Calculate overall scores for this turn
    # Overall confidence is a function of clarity score and hesitation score
    actual_hesitation = voice_metrics.get("hesitation_score", 0.0)
    # If hesitation was not analyzed (no audio), estimate it from filler words and uncertainty
    if audio_file is None:
        actual_hesitation = float(nlp_metrics["filler_count"] * 18.0 + nlp_metrics["uncertainty_count"] * 10.0)
        
    confidence_turn = max(0.0, min(100.0, nlp_metrics["clarity_score"] - (actual_hesitation * 0.4)))
    
    # 4. Fetch last 6 messages from the database to supply context to the generator
    history = []
    prev_conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id,
        models.Conversation.scenario == scenario
    ).order_by(models.Conversation.created_at.desc()).first()
    
    if prev_conversation and isinstance(prev_conversation.transcript, list):
        history = prev_conversation.transcript
        
    # 5. Generate reply & supportive feedback (Dual-mode LLM / local rules)
    ai_generation = generate_roleplay_response(scenario, history, message, nlp_metrics, voice_metrics)
    
    reply = ai_generation["reply"]
    feedback = ai_generation["feedback"]
    
    # Extract detailed psychological metrics
    anxiety_masking = ai_generation.get("anxiety_masking_score", 0.0)
    rumination = ai_generation.get("rumination_score", 0.0)
    alexithymia = ai_generation.get("alexithymia_score", 0.0)
    linguistic_markers = ai_generation.get("linguistic_markers_detected", [])
    clinical_insights = ai_generation.get("clinical_insights", "")
    hesitation_score = ai_generation.get("hesitation_score", actual_hesitation)
    
    # Update total confidence based on delta or direct score
    if "confidence_score" in ai_generation:
        confidence_final = ai_generation["confidence_score"]
    else:
        confidence_final = max(30.0, min(100.0, confidence_turn + ai_generation.get("confidence_score_delta", 2.0)))
    
    # 6. Save transcript bubble in the database
    user_bubble = {
        "sender": "user",
        "text": message,
        "response_delay_sec": response_delay,
        "metrics": {
            "wpm": voice_metrics.get("wpm", 0.0),
            "pause_count": voice_metrics.get("pause_count", 0),
            "hesitation_score": float(hesitation_score),
            "clarity_score": nlp_metrics.get("clarity_score", 100.0),
            "sentiment": nlp_metrics.get("sentiment", "calm"),
            "sentiment_score": nlp_metrics.get("sentiment_score", 80.0),
            "clarity_feedback": nlp_metrics.get("clarity_feedback", ""),
            "anxiety_masking_score": float(anxiety_masking),
            "rumination_score": float(rumination),
            "alexithymia_score": float(alexithymia),
            "linguistic_markers_detected": linguistic_markers,
            "clinical_insights": clinical_insights
        }
    }
    
    ai_bubble = {
        "sender": "ai",
        "text": reply,
        "feedback": feedback
    }
    
    updated_transcript = history + [user_bubble, ai_bubble]
    
    try:
        new_conv = models.Conversation(
            user_id=user_id,
            scenario=scenario,
            conversation_type="voice" if audio_file else "text",
            transcript=updated_transcript,
            ai_feedback=feedback,
            confidence_score=float(confidence_final),
            emotion_score=float(nlp_metrics.get("sentiment_score", 80.0))
        )
        db.add(new_conv)
        db.commit()
    except Exception as e:
        print(f"[Chat API] DB Save failed: {e}")
        
    return ChatResponse(
        reply=reply,
        emotion_detected=nlp_metrics.get("sentiment", "calm"),
        confidence_score=float(confidence_final),
        feedback=feedback,
        clarity_score=float(nlp_metrics.get("clarity_score", 100.0)),
        clarity_feedback=nlp_metrics.get("clarity_feedback", ""),
        wpm=float(voice_metrics.get("wpm", 0.0)),
        pause_count=int(voice_metrics.get("pause_count", 0)),
        hesitation_score=float(hesitation_score),
        anxiety_masking_score=float(anxiety_masking),
        rumination_score=float(rumination),
        alexithymia_score=float(alexithymia),
        linguistic_markers_detected=linguistic_markers,
        clinical_insights=clinical_insights
    )

@router.get("/", response_model=List[Any])
def read_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_child),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve conversation history for the current active user.
    """
    conversations = db.query(models.Conversation).filter(
        models.Conversation.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return conversations

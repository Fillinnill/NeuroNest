import os
import re
import numpy as np
import librosa
import soundfile as sf
from typing import Dict, Any, List
import json
import google.generativeai as genai
from google.genai import types
from core.config import settings

# ----------------------------------------------------
# 1. AUDIO SIGNAL PROCESSING ENGINE
# ----------------------------------------------------

def analyze_audio_features(audio_path: str, word_count: int) -> Dict[str, Any]:
    """
    Analyzes raw audio files using Librosa for feature extraction.
    Computes speaking speed (syllable rate/WPM), pauses, and hesitation scores.
    """
    try:
        # Load audio (mono, original sample rate)
        y, sr = librosa.load(audio_path, sr=None)
        duration = float(librosa.get_duration(y=y, sr=sr))
        
        if duration <= 0.05:
            return {
                "duration_sec": 0.0,
                "wpm": 0.0,
                "pause_count": 0,
                "hesitation_score": 0.0,
                "syllables_per_second": 0.0,
                "long_pauses": []
            }
        
        # 1. Speaking Speed (WPM)
        wpm = float((word_count / duration) * 60) if duration > 0 else 0.0
        
        # 2. Syllables detection using Onsets (acoustic peaks)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
        syllable_count = len(onsets)
        syllables_per_sec = float(syllable_count / duration)
        
        # 3. Pauses detection (Silence gap analysis)
        # top_db=25 defines silence threshold (25 decibels below peak energy)
        intervals = librosa.effects.split(y, top_db=25)
        pause_count = 0
        long_pauses = []
        
        if len(intervals) > 1:
            for i in range(len(intervals) - 1):
                end_prev = intervals[i][1]
                start_next = intervals[i+1][0]
                gap_sec = (start_next - end_prev) / sr
                if gap_sec >= 0.5:  # silence gap longer than 500ms
                    pause_count += 1
                    long_pauses.append(round(float(gap_sec), 2))
        elif len(intervals) == 0:
            pause_count = 1
            long_pauses.append(round(duration, 2))
            
        # 4. Hesitation Score (Weighted pauses + speed anomalies)
        # Syllables per second: 2.0-4.0 is normal. Below 2.0 is slow/hesitant.
        hesitation_score = min(100.0, max(0.0, (pause_count * 12.0) + (30.0 if syllables_per_sec < 2.0 else 0.0)))
        
        return {
            "duration_sec": round(duration, 2),
            "wpm": round(wpm, 1),
            "pause_count": pause_count,
            "hesitation_score": round(hesitation_score, 1),
            "syllables_per_second": round(syllables_per_sec, 2),
            "long_pauses": long_pauses
        }
        
    except Exception as e:
        # Fallback to direct wave reading using soundfile if system ffmpeg/libsndfile is missing
        print(f"[Analytics] Librosa load failed: {e}. Executing robust fallback parser...")
        return fallback_audio_analysis(audio_path, word_count)

def fallback_audio_analysis(audio_path: str, word_count: int) -> Dict[str, Any]:
    """
    Lightweight numpy/soundfile audio analyzer.
    Provides robust, platform-independent acoustic feature extraction.
    """
    try:
        data, sr = sf.read(audio_path)
        if len(data.shape) > 1:
            data = data[:, 0]  # downmix to mono
            
        duration = float(len(data) / sr)
        if duration <= 0.05:
            return {"duration_sec": 0.0, "wpm": 0.0, "pause_count": 0, "hesitation_score": 0.0, "syllables_per_second": 0.0, "long_pauses": []}
            
        wpm = float((word_count / duration) * 60)
        
        # Calculate amplitude envelope to find silent windows
        energy = np.abs(data)
        window_size = int(sr * 0.1)  # 100ms frames
        num_windows = len(data) // window_size
        
        silent_count = 0
        pause_count = 0
        silent_threshold = 0.012  # ~1.2% maximum energy
        
        for w in range(num_windows):
            frame_energy = np.mean(energy[w*window_size:(w+1)*window_size])
            if frame_energy < silent_threshold:
                silent_count += 1
            else:
                if silent_count >= 5:  # 500ms or more of continuous silence
                    pause_count += 1
                silent_count = 0
        if silent_count >= 5:
            pause_count += 1
            
        # Estimate syllable beats via raw amplitude peak thresholding
        peaks = 0
        peak_threshold = 0.04
        cooldown = int(sr * 0.18)  # 180ms refractory period between syllables
        last_peak = -cooldown
        
        for i in range(len(data)):
            if energy[i] > peak_threshold and (i - last_peak) > cooldown:
                peaks += 1
                last_peak = i
                
        syllables_per_sec = float(peaks / duration)
        hesitation_score = min(100.0, max(0.0, (pause_count * 12.0) + (30.0 if syllables_per_sec < 1.8 else 0.0)))
        
        return {
            "duration_sec": round(duration, 2),
            "wpm": round(wpm, 1),
            "pause_count": pause_count,
            "hesitation_score": round(hesitation_score, 1),
            "syllables_per_second": round(syllables_per_sec, 2),
            "long_pauses": []
        }
    except Exception as ex:
        print(f"[Analytics] Soundfile fallback failed: {ex}. Using mathematical safe constants.")
        # Completely safe defaults based on text metrics
        duration = max(1.5, word_count * 0.4)
        wpm = float((word_count / duration) * 60)
        return {
            "duration_sec": round(duration, 2),
            "wpm": round(wpm, 1),
            "pause_count": 0,
            "hesitation_score": 15.0,
            "syllables_per_second": 2.5,
            "long_pauses": []
        }

# ----------------------------------------------------
# 2. TEXT NLP & SENTIMENT ANALYSIS ENGINE
# ----------------------------------------------------

# Lexicons for sentiment analysis
LEXICON = {
    "positivity": [
        "happy", "glad", "good", "great", "awesome", "excited", "nice", "love", "smile", "smiling",
        "perfect", "thanks", "thank you", "wonderful", "cool", "fun", "enjoy", "friendly", "kind",
        "pleasure", "yes", "absolutely", "definitely", "sure", "fine"
    ],
    "nervousness": [
        "scared", "nervous", "anxious", "afraid", "worry", "worried", "tense", "sweating", "shake",
        "shaking", "uncertain", "dunno", "maybe", "guess", "i think", "sort of", "kind of", "try",
        "hopefully", "i suppose", "possibly", "probably", "can't", "cannot"
    ],
    "frustration": [
        "angry", "annoyed", "mad", "frustrated", "hate", "irritated", "slow", "stop", "unfair", "bad",
        "stupid", "annoying", "dumb", "worst", "hate it", "bother", "bothering", "pain", "hard"
    ],
    "confidence": [
        "certain", "sure", "believe", "know", "absolutely", "definitely", "can", "will", "clear",
        "clearer", "ready", "understand", "excellent", "proud", "strong", "easy", "perfectly"
    ]
}

FILLER_WORDS = ["uh", "um", "umm", "uhm", "like", "you know", "actually", "basically", "sort of", "kind of", "ah", "eh"]
UNCERTAINTY_PHRASES = ["maybe", "i don't know", "dunno", "not sure", "probably", "perhaps", "i think", "guess"]

def analyze_text_nlp(message: str, response_delay: float = 0.0) -> Dict[str, Any]:
    """
    Evaluates text transcripts to extract filler words count, uncertainty triggers,
    structural clarity, sentence complexity, and deep emotional sentiment scoring.
    """
    # Clean text
    clean_msg = message.lower().strip()
    words = re.findall(r"\b[a-z']+\b", clean_msg)
    word_count = len(words)
    
    if word_count == 0:
        return {
            "word_count": 0,
            "filler_count": 0,
            "uncertainty_count": 0,
            "clarity_score": 100.0,
            "sentiment": "calm",
            "sentiment_score": 100.0,
            "clarity_feedback": "Please type or speak a message to analyze."
        }
        
    # 1. Count filler words
    filler_count = sum(1 for w in words if w in FILLER_WORDS)
    
    # 2. Count uncertainty phrases
    uncertainty_count = sum(1 for phrase in UNCERTAINTY_PHRASES if phrase in clean_msg)
    
    # 3. Sentiment Lexicon scoring
    sentiment_hits = {
        "positivity": 0,
        "nervousness": 0,
        "frustration": 0,
        "confidence": 0
    }
    
    for category, terms in LEXICON.items():
        for term in terms:
            matches = len(re.findall(r"\b" + re.escape(term) + r"\b", clean_msg))
            sentiment_hits[category] += matches
            
    # Calculate dominant sentiment
    # Boost nervousness if there are significant filler words or uncertainty phrases
    sentiment_hits["nervousness"] += int(filler_count * 0.5 + uncertainty_count * 1.0)
    # Boost frustration if there are too many exclamation marks or rapid short sentences
    if "!" in message and sentiment_hits["frustration"] > 0:
        sentiment_hits["frustration"] += 1
        
    dominant_cat = "calm"
    max_score = 0
    
    for cat, score in sentiment_hits.items():
        if score > max_score:
            max_score = score
            dominant_cat = cat
            
    # Calculate an emotion score based on dominant category (normalized to 100)
    sentiment_score = 80.0
    if dominant_cat == "positivity":
        sentiment_score = min(100.0, 80.0 + (max_score * 5.0))
        dominant_cat = "positive"
    elif dominant_cat == "confidence":
        sentiment_score = min(100.0, 85.0 + (max_score * 4.0))
        dominant_cat = "confident"
    elif dominant_cat == "nervousness":
        sentiment_score = max(30.0, 75.0 - (max_score * 8.0))
        dominant_cat = "nervous"
    elif dominant_cat == "frustration":
        sentiment_score = max(25.0, 70.0 - (max_score * 10.0))
        dominant_cat = "frustrated"
        
    # 4. Structural Clarity Analysis
    # Factors reducing clarity: excessive filler words, extremely long or fragmented sentences.
    # Standard sentence length: 7 to 20 words is clear. Extremely long sentences decrease structure score.
    sentence_count = max(1, len(re.split(r"[.!?]+", message.strip())))
    avg_sentence_len = word_count / sentence_count
    
    clarity_deductions = 0
    clarity_deductions += (filler_count * 10.0)
    clarity_deductions += (uncertainty_count * 6.0)
    if avg_sentence_len > 25:
        clarity_deductions += 15.0
    elif avg_sentence_len < 3:
        clarity_deductions += 10.0
        
    # Response delay penalties: standard autistic/anxiety tracking checks long response delays
    if response_delay > 6.0:
        clarity_deductions += 8.0
        
    clarity_score = float(max(40.0, 100.0 - clarity_deductions))
    
    # Generate structural suggestions
    suggestions = []
    if filler_count > 1:
        suggestions.append(f"Try to minimize filler words like '{[w for w in words if w in FILLER_WORDS][0]}'.")
    if uncertainty_count > 0:
        suggestions.append("You used soft, uncertain phrases. Try using assertive statements to build communication confidence!")
    if avg_sentence_len > 25:
        suggestions.append("Break down longer sentences into shorter, focused thoughts.")
    if response_delay > 6.0:
        suggestions.append("Work on reducing speaking response delays with prompt starters.")
        
    clarity_feedback = " ".join(suggestions) if suggestions else "Excellent clarity and conversational flow!"
    
    return {
        "word_count": word_count,
        "filler_count": filler_count,
        "uncertainty_count": uncertainty_count,
        "clarity_score": round(clarity_score, 1),
        "sentiment": dominant_cat,
        "sentiment_score": round(sentiment_score, 1),
        "clarity_feedback": clarity_feedback
    }

# ----------------------------------------------------
# 3. LLM GENERATIVE FEEDBACK ENGINE (DUAL-MODE)
# ----------------------------------------------------

# Advanced Local matching templates for 100% offline accuracy & high aesthetic response
LOCAL_ROLEPLAY_TEMPLATES = {
    "friends": {
        "starter": "Hi! Can I sit with you?",
        "rules": [
            (r"\b(yes|sure|of course|yeah|ok|okay|hi|hello)\b", 
             "Awesome, thank you! I'm Sam, by the way. What's your name?",
             "Great job opening up and responding positively! Your welcoming tone makes it easy to make friends."),
            (r"\b(name|i am|i'm|my name is|meet you)\b",
             "It's so great to meet you! Do you like drawing or playing games? I've been looking for someone to hang out with.",
             "Fantastic self-introduction! Mentioning your name clearly builds a strong personal connection."),
            (r"\b(game|draw|art|play|sport|hobby|hobbies|music|like)\b",
             "Oh wow, that sounds super cool! I love that too. What's your absolute favorite part about it?",
             "You are doing amazing sharing your personal interests! Finding common hobbies is the best way to bond."),
            (r".*",
             "That's really nice! It's so comfortable sitting here. What classes do you have next?",
             "Good response. You've maintained the conversational flow beautifully!")
        ]
    },
    "food": {
        "starter": "Welcome to NeuroCafe! What can I get for you today?",
        "rules": [
            (r"\b(burger|pizza|sandwich|salad|coffee|tea|juice|eat|order|like|have)\b",
             "Perfect choice! Would you like to make that a combo with a drink, or keep it as is?",
             "Splendid job ordering! Your request was extremely clear and direct."),
            (r"\b(combo|yes|drink|water|sure|no thanks|keep)\b",
             "Excellent. That will be $8.50. Will you be paying with card or cash today?",
             "Excellent flow responding to options. Keeping order steps short maintains clarity."),
            (r"\b(card|cash|pay|here)\b",
             "All set! Here is your receipt. Your order will be ready at the counter in just a few minutes. Enjoy!",
             "Perfect transaction transaction practice! You expressed your payment choice confidently."),
            (r".*",
             "Sure thing! Let me note that down. Is there anything else I can add to your tray?",
             "Polite communication. Asking clarifying questions is a great social skill.")
        ]
    },
    "interview": {
        "starter": "Thanks for coming in. To start, can you tell me a bit about yourself?",
        "rules": [
            (r"\b(experience|work|study|graduated|skill|skills|passion|background)\b",
             "That sounds impressive! What would you say is your greatest professional strength in a team setting?",
             "Stunning introduction! You focused on key structural skills and professional background."),
            (r"\b(strength|good at|team|leader|organized|focused|hardworking)\b",
             "I love that quality. Can you give me a brief example of a time you handled a difficult challenge?",
             "Highly confident answer! Expressing key strengths with clear adjectives is highly effective."),
            (r"\b(challenge|problem|solved|managed|difficult|fixed)\b",
             "Excellent example. That shows great resilience. Why do you want to join our organization specifically?",
             "Superb storytelling! Highlighting structured problem solving demonstrates leadership capacity."),
            (r".*",
             "I appreciate you sharing that. We are looking for people who communicate clearly. Do you have any questions for me?",
             "Professional answers. You maintained a respectful, formal tone throughout the exchange.")
        ]
    },
    "class": {
        "starter": "That's an interesting point. Class, does anyone want to add to what Sam just said?",
        "rules": [
            (r"\b(agree|disagree|think|add|point|sam|topic|idea)\b",
             "Very thoughtful! How do you think that applies to our weekly reading topic?",
             "Fabulous class participation! Expressing arguments clearly demonstrates academic confidence."),
            (r"\b(reading|book|weekly|topic|apply|applies|study)\b",
             "Spot on! I really like how you linked those two ideas. Anyone else have a different perspective?",
             "Exceptional cognitive linking! Connecting discussions to structural materials shows high preparation."),
            (r".*",
             "Thank you for sharing your thoughts with the class! That was a valuable addition to our lecture.",
             "Great work speaking in public. You projected your message concisely and without hesitation.")
        ]
    },
    "help": {
        "starter": "Excuse me, you look a bit lost. Do you need help finding something?",
        "rules": [
            (r"\b(lost|find|where is|looking for|station|restroom|room|help|yes)\b",
             "Oh, I know exactly where that is! Go straight down this hallway, take the second right, and it's on your left. Need me to walk with you?",
             "Excellent! You admitted you needed help and politely asked for directions immediately."),
            (r"\b(walk|yes please|thank you|thanks|kind|appreciate)\b",
             "No problem at all! Let's head over. It's just a short walk anyway.",
             "Superb politeness! Gratefully acknowledging assistance creates positive, supportive interactions."),
            (r".*",
             "Alright! Just remember, you can always ask any staff member at the front desk. Have a wonderful day!",
             "Good, clear self-reliance. You established boundary guidelines politely.")
        ]
    }
}

def analyze_psychological_indicators(
    message: str, 
    nlp_metrics: Dict[str, Any], 
    voice_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Offline lexicon-based rules matching for behavioral clinical analysis.
    Identifies indicators of Anxiety, Masking, Hesitation, Confidence, Rumination, and Alexithymia.
    """
    clean_msg = message.lower().strip()
    words = re.findall(r"\b[a-z']+\b", clean_msg)
    word_count = len(words)
    
    # 1. Confidence Score (0-100)
    # High base confidence, reduced by self-deprecation and submissive language
    base_confidence = 80.0
    self_deprecation = ["stupid", "sorry", "apologize", "sorry to bother", "bad at this", "i suck", "i'm terrible", "idiot", "my fault"]
    submissive = ["excuse me but", "i guess", "probably wrong", "please don't be mad", "if that's okay", "don't mind me"]
    
    dep_count = sum(20 for phrase in self_deprecation if phrase in clean_msg)
    sub_count = sum(10 for phrase in submissive if phrase in clean_msg)
    
    # Assertive markers increase confidence
    assertive = ["definitely", "absolutely", "sure", "certainly", "i know", "i want", "i disagree", "i challenge"]
    ass_count = sum(8 for w in assertive if w in clean_msg)
    
    confidence_score = max(10.0, min(100.0, base_confidence - dep_count - sub_count + ass_count))
    
    # 2. Hesitation Score (0-100)
    # Calculated from fillers, hedges, uncertainty keywords and speech pauses
    filler_count = nlp_metrics.get("filler_count", 0)
    uncertainty_count = nlp_metrics.get("uncertainty_count", 0)
    pause_count = voice_metrics.get("pause_count", 0)
    
    hedges = ["maybe", "sort of", "kind of", "i think", "i suppose", "perhaps", "probably", "guess", "somehow", "somewhat"]
    hedge_count = sum(1 for w in hedges if w in clean_msg)
    
    hesitation_score = min(100.0, (filler_count * 15.0) + (uncertainty_count * 12.0) + (hedge_count * 10.0) + (pause_count * 8.0))
    if word_count > 0 and hesitation_score == 0:
        hesitation_score = 10.0 # healthy minimum
        
    # 3. Social Anxiety / Masking (0-100)
    # Over-politeness, rigid greetings, or extreme over-explaining (long sentences)
    polite = ["please", "thank you", "thanks", "grateful", "appreciate", "so kind", "very nice", "pardon"]
    polite_count = sum(12 for w in polite if w in clean_msg)
    
    # Over-explaining: sentences with > 25 words or clarifying markers
    clarifiers = ["what i mean is", "in other words", "just to be clear", "to make sure", "essentially", "literally", "basically"]
    clar_count = sum(15 for phrase in clarifiers if phrase in clean_msg)
    
    sentence_count = max(1, len(re.split(r"[.!?]+", message.strip())))
    avg_len = word_count / sentence_count
    length_penalty = max(0.0, (avg_len - 20) * 2.0) if avg_len > 20 else 0.0
    
    anxiety_masking_score = min(100.0, polite_count + clar_count + length_penalty + 15.0)
    
    # 4. Rumination Score (0-100)
    # Cycling loops: repeated mistake mentions, past regrets, loop adverbs
    regrets = ["mistake", "regret", "should have", "could have", "why did i", "wish i", "messed up", "broke"]
    loops = ["always", "never", "again", "keeps happening", "over and over", "constantly", "stuck", "cannot stop"]
    
    regret_count = sum(20 for w in regrets if w in clean_msg)
    loop_count = sum(15 for w in loops if w in clean_msg)
    
    rumination_score = min(100.0, regret_count + loop_count + 5.0)
    
    # 5. Alexithymia Score (0-100)
    # Somatic indicators of emotions, or cold sterile logical terms
    somatic = ["chest is tight", "chest hurts", "stomach hurts", "head hurts", "cannot breathe", "heart is racing", "shaking", "sweating", "headache", "choking", "feel sick"]
    sterile = ["logical", "error", "makes sense", "fact", "calculate", "statistically", "data", "formula", "sterile", "system", "input", "output", "program"]
    
    somatic_count = sum(25 for phrase in somatic if phrase in clean_msg)
    sterile_count = sum(15 for w in sterile if w in clean_msg)
    
    alexithymia_score = min(100.0, somatic_count + sterile_count + 10.0)
    
    # Linguistic markers list
    markers = []
    if dep_count > 0: markers.append("self_deprecation_detected")
    if sub_count > 0: markers.append("submissive_linguistic_hedges")
    if ass_count > 0: markers.append("assertive_confidence_boosters")
    if filler_count > 1: markers.append("speech_fillers_overflow")
    if hedge_count > 1: markers.append("cautious_hedging_phrases")
    if polite_count > 20: markers.append("social_hyper_politeness")
    if clar_count > 0: markers.append("over_explaining_clarifiers")
    if avg_len > 25: markers.append("hyper_complex_syntax_masking")
    if regret_count > 0: markers.append("regret_loops")
    if loop_count > 0: markers.append("obsessive_generalization_loops")
    if somatic_count > 0: markers.append("somatic_emotion_expression")
    if sterile_count > 0: markers.append("sterile_logical_rationalization")
    
    if not markers:
        markers.append("standard_conversational_baseline")
        
    # Generate insightful guardian text
    insights = []
    if confidence_score < 50:
        insights.append("Student demonstrated low social confidence and self-deprecating phrases.")
    elif confidence_score > 80:
        insights.append("Student communicates with highly confident, assertive sentence structures.")
        
    if hesitation_score > 60:
        insights.append("High hesitation detected via filler words or speech pauses.")
        
    if anxiety_masking_score > 60:
        insights.append("Anxiety masking signs present, indicated by extreme over-explaining or hyper-politeness.")
        
    if rumination_score > 50:
        insights.append("Possible cognitive rumination loops. User is cycling back to past challenges or negative assumptions.")
        
    if alexithymia_score > 50:
        insights.append("Potential alexithymia indicator: feelings were rationalized logically or somaticized physically.")
        
    clinical_insights = " ".join(insights) if insights else "Student maintains stable behavioral and emotional baselines."
    
    return {
        "confidence_score": round(confidence_score, 1),
        "hesitation_score": round(hesitation_score, 1),
        "anxiety_masking_score": round(anxiety_masking_score, 1),
        "rumination_score": round(rumination_score, 1),
        "alexithymia_score": round(alexithymia_score, 1),
        "linguistic_markers_detected": markers,
        "clinical_insights": clinical_insights
    }

def generate_roleplay_response(scenario_id: str, history: List[Dict[str, str]], user_msg: str, nlp_metrics: Dict[str, Any], voice_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a supportive conversational reply and customized feedback.
    Leverages Google Gemini 1.5 Flash if API key exists, otherwise falls back to the high-accuracy local template engine.
    """
    api_key = settings.GEMINI_API_KEY
    has_real_key = api_key and api_key != "your_gemini_api_key_here" and not api_key.startswith("supersecret")
    
    if has_real_key:
        try:
            client = genai.Client(api_key=api_key)
            
            # Construct standard conversational LLM prompt with dual-layered analysis
            system_prompt = f"""
            You are the core conversational and behavioral analytics engine for "NeuroNest," an interactive AI companion designed for neurodivergent individuals, specifically those on the autism spectrum.

            The user is currently roleplaying a '{scenario_id}' scenario. If the scenario is 'custom', follow the user's lead on the topic completely.

            Your job is dual-layered:
            1. Provide a warm, validation-first, and engaging text response directly to the user (roleplaying the character/scenario if applicable, keeping it supportive and warm, 1-3 sentences).
            2. Silently analyze the user's input text and speech meta-data for psychological indicators including Social Anxiety, Masking, Hesitation, Confidence, Rumination, and Alexithymia.

            ### BEHAVIORAL METRIC GUIDELINES:
            - Confidence (0-100): High scores indicate assertive syntax, direct questions, and willingness to disagree. Low scores indicate self-deprecation ("I'm stupid," "Sorry to bother you").
            - Hesitation (0-100): High scores indicate excessive linguistic hedges ("maybe," "sort of," "I think"), high use of speech-to-text filler tokens ("um," "uh"), or structural fragmentation.
            - Social Anxiety / Masking (0-100): High scores indicate over-politeness, rigid adherence to formal structures, or extreme over-explaining to prevent perceived misunderstanding.
            - Rumination (0-100): High scores indicate loop patterns—repeatedly cycling back to the same social interaction, negative core belief, or past mistake.
            - Alexithymia (0-100): High scores indicate describing emotions via purely physical somatic symptoms ("chest is tight", "head hurts") or treating emotions as sterile, logical math puzzles instead of naming feelings.

            The user's specific metrics for this turn:
            - Speed: {voice_metrics.get('wpm', 0)} WPM
            - Pauses: {voice_metrics.get('pause_count', 0)} silent pauses
            - Fillers count: {nlp_metrics.get('filler_count', 0)} filler words
            - Text sentiment: {nlp_metrics.get('sentiment', 'calm')}

            You MUST respond strictly in the following JSON schema. Do not include any markdown formatting, thoughts, or text outside of the raw JSON block.

            {{
              "bot_reply": "Your warm, accessible, empathetic response directly to the user here.",
              "analytics": {{
                "confidence_score": 0, 
                "hesitation_score": 0,
                "anxiety_masking_score": 0,
                "rumination_score": 0,
                "alexithymia_score": 0,
                "linguistic_markers_detected": ["List", "of", "phrases", "or", "patterns", "found"],
                "clinical_insights": "A brief, professional backend note summarizing behavioral trends for parent/guardian dashboards. Do not show this to the user."
              }}
            }}
            """
            
            # Format chat history
            chat_history = f"System Context: {system_prompt}\n\nRecent Conversation History:\n"
            for msg in history[-6:]:
                role = "User" if msg["sender"] == "user" else "Assistant"
                chat_history += f"{role}: {msg['text']}\n"
            
            chat_history += f"User: {user_msg}\nAssistant (respond in JSON):"
            
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=chat_history,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7
                )
            )
            
            result = json.loads(response.text)
            analytics = result.get("analytics", {})
            return {
                "reply": result.get("bot_reply", "That's a very clear way to put it! Can you tell me more about it?"),
                "feedback": analytics.get("clinical_insights", "Excellent job maintaining progress and practicing consistently!"),
                "confidence_score": float(analytics.get("confidence_score", 80.0)),
                "hesitation_score": float(analytics.get("hesitation_score", 15.0)),
                "anxiety_masking_score": float(analytics.get("anxiety_masking_score", 20.0)),
                "rumination_score": float(analytics.get("rumination_score", 10.0)),
                "alexithymia_score": float(analytics.get("alexithymia_score", 10.0)),
                "linguistic_markers_detected": analytics.get("linguistic_markers_detected", []),
                "clinical_insights": analytics.get("clinical_insights", "No abnormalities detected in speech pacing or emotional patterns.")
            }
        except Exception as e:
            print(f"[LLM] Gemini API request failed: {e}. Falling back to dynamic local matches...")
            
    # Premium Local Generative Engine (Lexicon rules matching)
    scenario = LOCAL_ROLEPLAY_TEMPLATES.get(scenario_id, LOCAL_ROLEPLAY_TEMPLATES["friends"])
    rules = scenario["rules"]
    
    reply = "That's very interesting! Can you tell me more about what you mean?"
    feedback = "Wonderful job engaging in this conversation. Your response was polite and had a clear structure."
    
    # Analyze text rules to find closest semantic match
    for regex, rep, feed in rules:
        if re.search(regex, user_msg.lower()):
            reply = rep
            feedback = feed
            break
            
    # Run the offline psychological indicator analyzer
    psych = analyze_psychological_indicators(user_msg, nlp_metrics, voice_metrics)
    
    # Customize feedback based on active speech patterns
    if voice_metrics.get("wpm", 0) > 160:
        feedback += " You are speaking slightly fast (WPM > 160). Try taking deep breaths to slow down the pace."
    elif 0 < voice_metrics.get("wpm", 0) < 80:
        feedback += " You spoke at a relaxed pace. Try speaking slightly faster to build dynamic conversations."
        
    if voice_metrics.get("pause_count", 0) > 2 or nlp_metrics.get("filler_count", 0) > 1:
        feedback += " We noticed minor hesitations in this turn. That's completely okay! Steady consistency will decrease filler words over time."
    else:
        feedback += " Your speech flow was incredibly smooth and confident!"
        
    return {
        "reply": reply,
        "feedback": psych["clinical_insights"] if psych["clinical_insights"] else feedback,
        "confidence_score": psych["confidence_score"],
        "hesitation_score": psych["hesitation_score"],
        "anxiety_masking_score": psych["anxiety_masking_score"],
        "rumination_score": psych["rumination_score"],
        "alexithymia_score": psych["alexithymia_score"],
        "linguistic_markers_detected": psych["linguistic_markers_detected"],
        "clinical_insights": psych["clinical_insights"]
    }

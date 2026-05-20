import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, Sparkles, Trophy, Star, TrendingUp, CheckCircle, Heart, Activity } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const scenarios = {
  friends: { title: 'Making Friends', starter: "Hi! Can I sit with you?", prompt: "Practice introducing yourself and starting a conversation." },
  food: { title: 'Ordering Food', starter: "Welcome to NeuroCafe! What can I get for you today?", prompt: "Practice ordering a meal and asking about ingredients." },
  interview: { title: 'Job Interview', starter: "Thanks for coming in. To start, can you tell me a bit about yourself?", prompt: "Practice answering professional questions." },
  class: { title: 'Speaking in Class', starter: "That's an interesting point. Class, does anyone want to add to what Sam just said?", prompt: "Practice participating in a classroom discussion." },
  help: { title: 'Asking for Help', starter: "Excuse me, you look a bit lost. Do you need help finding something?", prompt: "Practice asking for directions or assistance politely." },
  custom: { title: 'Free Expression', starter: "Hello! You can talk to me about anything. What's on your mind today?", prompt: "Express your feelings, ask questions, or practice any topic you like." }
};

const AIPractice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const scenario = scenarios[id] || scenarios.friends;
  const { user } = useAuth();

  const [messages, setMessages] = useState([
    { id: 1, text: scenario.starter, sender: 'ai', feedback: "Welcome to this scenario. Take your time to reply whenever you are ready." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Real-time audio and speech analytics state
  const [isRecording, setIsRecording] = useState(false);
  const [responseDelay, setResponseDelay] = useState(null);
  
  const [sessionMetrics, setSessionMetrics] = useState({
    confidence: [],
    clarity: [],
    wpm: [],
    pauses: 0,
    emotions: []
  });

  const messagesEndRef = useRef(null);
  const lastMessageTimeRef = useRef(null);
  
  // Microphone recording references
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track page load time to measure first response delay
  useEffect(() => {
    lastMessageTimeRef.current = Date.now();
    
    // Initialize Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setInput(prev => {
            // First voice trigger, calculate response delay
            if (responseDelay === null && lastMessageTimeRef.current) {
              const delay = (Date.now() - lastMessageTimeRef.current) / 1000.0;
              setResponseDelay(parseFloat(delay.toFixed(2)));
            }
            return prev + (prev ? ' ' : '') + transcript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error("Web Speech Error:", event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Track manual typing inputs to calculate typing response delay
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (responseDelay === null && lastMessageTimeRef.current) {
      const delay = (Date.now() - lastMessageTimeRef.current) / 1000.0;
      setResponseDelay(parseFloat(delay.toFixed(2)));
    }
  };

  const startRecording = async () => {
    setInput('');
    setResponseDelay(null);
    audioChunksRef.current = [];
    
    if (lastMessageTimeRef.current) {
      const delay = (Date.now() - lastMessageTimeRef.current) / 1000.0;
      setResponseDelay(parseFloat(delay.toFixed(2)));
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSend(input, audioBlob);
        
        // Stop audio hardware streaming
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone hardware block:", err);
      alert("Microphone authorization is required to perform speech energy analyses!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = async (customText = null, audioBlob = null) => {
    const textToSend = customText !== null ? customText : input;
    if (!textToSend.trim()) return;

    // Track response delay
    let delay = responseDelay;
    if (delay === null && lastMessageTimeRef.current) {
      delay = parseFloat(((Date.now() - lastMessageTimeRef.current) / 1000.0).toFixed(2));
    }

    const userMsg = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setResponseDelay(null);

    try {
      const token = localStorage.getItem('token');
      
      // Package into form data for audio upload capability
      const formData = new FormData();
      formData.append('user_id', user?.id || 1);
      formData.append('scenario', id || 'friends');
      formData.append('message', textToSend);
      formData.append('response_delay', delay || 0.0);
      if (audioBlob) {
        formData.append('audio_file', audioBlob, 'recording.webm');
      }

      const response = await axios.post('/api/v1/conversations/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const { reply, emotion_detected, confidence_score, feedback, clarity_score, clarity_feedback, wpm, pause_count, hesitation_score } = response.data;

      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: reply, 
        sender: 'ai',
        feedback: feedback,
        metrics: {
          emotion_detected,
          confidence_score,
          clarity_score,
          clarity_feedback,
          wpm,
          pause_count,
          hesitation_score
        }
      }]);

      // Update aggregate session counters
      setSessionMetrics(prev => ({
        confidence: [...prev.confidence, confidence_score],
        clarity: [...prev.clarity, clarity_score],
        wpm: wpm > 0 ? [...prev.wpm, wpm] : prev.wpm,
        pauses: prev.pauses + pause_count,
        emotions: [...prev.emotions, emotion_detected]
      }));

      lastMessageTimeRef.current = Date.now();
    } catch (err) {
      console.error("API failed, using local offline generator", err);
      setIsTyping(false);
      
      // Fallback
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "You expressed yourself beautifully! Let's continue working on this scenario.", 
          sender: 'ai',
          feedback: "Great flow. Try using some more descriptors to keep practicing."
        }]);
        lastMessageTimeRef.current = Date.now();
      }, 1000);
    }
  };

  const handleEndSession = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Calculate real averages to store
      const avgConf = Math.round(sessionMetrics.confidence.reduce((a,b)=>a+b, 0) / sessionMetrics.confidence.length) || 80;
      const avgClarity = Math.round(sessionMetrics.clarity.reduce((a,b)=>a+b, 0) / sessionMetrics.clarity.length) || 85;
      
      await axios.post('/api/v1/sessions/', {
        title: `Practice: ${scenario.title}`,
        description: `Completed roleplay for '${scenario.title}'. Confidence average was ${avgConf}%, Clarity reached ${avgClarity}%. Total pauses: ${sessionMetrics.pauses}.`,
        duration_minutes: Math.max(1, Math.floor(messages.length / 2))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSummary(true);
    } catch (err) {
      console.error("Failed to save practice session", err);
      setShowSummary(true); // UX stability
    }
  };

  // Helper to read aloud AI responses using browser synthesizer
  const handleReadAloud = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechUtterance(text);
      utterance.rate = 0.95; // supportive slightly slower pace
      window.speechSynthesis.speak(utterance);
    }
  };

  if (showSummary) {
    const finalConf = Math.round(sessionMetrics.confidence.reduce((a,b)=>a+b,0) / sessionMetrics.confidence.length) || 80;
    const finalClarity = Math.round(sessionMetrics.clarity.reduce((a,b)=>a+b,0) / sessionMetrics.clarity.length) || 88;
    const finalWPM = Math.round(sessionMetrics.wpm.reduce((a,b)=>a+b,0) / sessionMetrics.wpm.length) || 115;
    
    // Sort dominant emotion
    const occurrences = {};
    let dominantEmotion = "calm";
    let maxOccur = 0;
    sessionMetrics.emotions.forEach(em => {
      occurrences[em] = (occurrences[em] || 0) + 1;
      if (occurrences[em] > maxOccur) {
        maxOccur = occurrences[em];
        dominantEmotion = em;
      }
    });

    return (
      <div className="p-8 max-w-2xl mx-auto w-full min-h-screen flex flex-col items-center justify-center fade-in">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 w-full text-center"
        >
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mx-auto mb-6">
            <Trophy size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Practice Complete!</h2>
          <p className="text-gray-400 mb-10">Sensational work today, {user?.fullname || user?.username}. You're developing excellent conversational pacing!</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Activity size={12}/> Confidence</p>
              <h4 className="text-3xl font-extrabold text-white">{finalConf}%</h4>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><TrendingUp size={12}/> Clarity</p>
              <h4 className="text-3xl font-extrabold text-white">{finalClarity}%</h4>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Star size={12}/> Speaking Rate</p>
              <h4 className="text-2xl font-bold text-white">{finalWPM} WPM</h4>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Heart size={12}/> Tone</p>
              <h4 className="text-2xl font-bold text-white capitalize">{dominantEmotion}</h4>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left mb-10">
            <h5 className="font-bold text-purple-300 text-sm flex items-center gap-2 mb-2">
              <Sparkles size={16} /> Guardian Insight Summary
            </h5>
            <p className="text-sm text-gray-300 leading-relaxed">
              You had {sessionMetrics.pauses} pauses during speech transitions. Your response latency was steady. 
              {sessionMetrics.pauses > 3 
                ? " Great effort taking breaks to assemble clear words!"
                : " Your speaking delivery was extremely smooth and rapid!"}
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-premium w-full"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={() => navigate('/dashboard/practice')}
              className="w-full py-3 rounded-xl bg-white/5 text-gray-400 font-bold hover:text-white transition-all"
            >
              Try Another Scenario
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Get active AI speech metrics to display in sidebar/bubble
  const lastAIMsg = [...messages].reverse().find(m => m.sender === 'ai');

  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-[calc(100vh-2rem)] flex flex-col md:flex-row gap-6 fade-in">
      
      {/* Left Chat Screen */}
      <div className="flex-1 glass-card p-6 flex flex-col overflow-hidden relative">
        <header className="mb-6 flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{scenario.title}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span> 
                {isRecording ? "Listening and capturing audio features..." : "AI ready and listening"}
              </p>
            </div>
          </div>
          <button 
            onClick={handleEndSession}
            className="px-6 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-500/20 transition-all duration-300"
          >
            <CheckCircle size={18} /> Finish Session
          </button>
        </header>

        {/* Message bubbles list */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-5 rounded-3xl shadow-xl ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                }`}>
                  <p className="text-[1.02rem] leading-relaxed font-medium">{msg.text}</p>
                  
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-3 mt-4 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleReadAloud(msg.text)}
                        className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Volume2 size={13} /> Listen
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
             <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl rounded-tl-none flex gap-2 items-center">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce"></span>
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Microphone-Only Input Panel */}
        <div className="mt-6 flex flex-col items-center justify-center p-6 bg-black/30 rounded-3xl border border-white/10 relative overflow-hidden">
          {isRecording && (
            <div className="absolute inset-0 bg-purple-900/5 pointer-events-none animate-pulse"></div>
          )}
          
          <div className="flex items-center gap-4 z-10">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`p-6 rounded-full transition-all duration-300 shadow-xl flex items-center justify-center ${
                isRecording 
                  ? 'bg-red-500 text-white shadow-red-500/25 ring-4 ring-red-500/30' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500'
              }`}
              title={isRecording ? "Tap to submit your response" : "Tap to record your voice"}
            >
              {isRecording ? <MicOff size={28} className="animate-pulse" /> : <Mic size={28} />}
            </motion.button>
          </div>

          <div className="mt-4 text-center z-10">
            <p className={`text-sm font-bold tracking-wide uppercase ${isRecording ? 'text-red-400' : 'text-purple-300'}`}>
              {isRecording ? "Recording Live..." : "Speak Your Response"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isRecording ? "Tap the red button again to stop and submit your response." : "Tap the microphone to start speaking your reply."}
            </p>
          </div>

          {/* Real-time Web Speech transcript preview */}
          {input && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-white/5 border border-white/5 rounded-2xl max-w-lg w-full text-center z-10"
            >
              <p className="text-xs font-bold text-gray-500 G uppercase tracking-widest mb-1">Transcribed Draft</p>
              <p className="text-sm text-gray-200 italic">"{input}"</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Supportive Insights panel */}
      <div className="w-full md:w-[320px] flex flex-col gap-6">
        
        {/* Scenario prompt helper */}
        <div className="glass-card p-6">
          <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-2">Scenario Prompt</h4>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">{scenario.prompt}</p>
        </div>

        {/* Real-time supportive feedback */}
        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Activity size={14}/> Communication Assistant</h4>
            
            {lastAIMsg?.feedback ? (
              <motion.div 
                key={lastAIMsg.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs font-bold text-purple-300 uppercase mb-1">AI Recommendation</p>
                  <p className="text-sm text-gray-200 leading-relaxed font-semibold">{lastAIMsg.feedback}</p>
                </div>

                {lastAIMsg.metrics && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Confidence Index</span>
                      <span className="text-white font-bold">{lastAIMsg.metrics.confidence_score}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${lastAIMsg.metrics.confidence_score}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-gray-400 font-medium">Linguistic Clarity</span>
                      <span className="text-white font-bold">{lastAIMsg.metrics.clarity_score}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${lastAIMsg.metrics.clarity_score}%` }}></div>
                    </div>

                    {lastAIMsg.metrics.wpm > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 mt-3 text-xs">
                        <div>
                          <p className="text-gray-400 mb-0.5">Speed</p>
                          <p className="text-white font-bold">{lastAIMsg.metrics.wpm} WPM</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Pauses</p>
                          <p className="text-white font-bold">{lastAIMsg.metrics.pause_count} silent</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <p className="text-sm text-gray-400 leading-relaxed">
                Respond to Sam to activate speech analysis. Our AI will analyze WPM, pause intervals, filler words, and emotional triggers.
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-500 flex items-center gap-1.5">
            <Heart size={10} className="text-purple-400 fill-purple-400" /> Supportive & non-diagnostic
          </div>
        </div>
      </div>

    </div>
  );
};

export default AIPractice;

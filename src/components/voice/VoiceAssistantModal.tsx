import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Globe,
  Radio,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Monitor, NotificationItem } from '../../types';
import { api } from '../../services/api';

export type VoiceLanguage = 'en-US' | 'te-IN' | 'hi-IN';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitors: Monitor[];
  notifications: NotificationItem[];
  onRefreshDashboard: () => void;
  onNavigateToTab: (tab: any) => void;
  onToggleRefreshMode: () => void;
  refreshMode: 'auto' | 'manual';
  onToggleWatch: (monitorId: string) => Promise<void>;
  isDark: boolean;
  voiceAlertsEnabled: boolean;
  onToggleVoiceAlerts: () => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionTaken?: string;
  audioSpoken?: boolean;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  monitors,
  notifications,
  onRefreshDashboard,
  onNavigateToTab,
  onToggleRefreshMode,
  refreshMode,
  onToggleWatch,
  isDark,
  voiceAlertsEnabled,
  onToggleVoiceAlerts
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: "Hello! I am your Voice Monitoring Assistant. You can speak to me or type commands like 'Check google.com', 'How many sites are down?', or 'Watch Staging Server'.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [speechPermissionError, setSpeechPermissionError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>('en-US');
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat log
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleProcessCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechPermissionError('Microphone access was denied. Please allow microphone permissions in your browser or use the text input below.');
        } else if (event.error !== 'no-speech') {
          setSpeechPermissionError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setIsSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [selectedLanguage]);

  // Update language dynamically on recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      setSpeechPermissionError('Speech recognition is not supported in this browser. Please use the text input below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechPermissionError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition may already be running
      }
    }
  };

  // Speak aloud helper
  const speakReply = (textToSpeak: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = selectedLanguage;

      // Select localized voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(selectedLanguage.split('-')[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech playback error
    }
  };

  // Command Execution Engine
  const handleProcessCommand = async (commandRaw: string) => {
    const command = commandRaw.trim();
    if (!command) return;

    // Add user message
    const userMsg: MessageItem = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: command,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    const lower = command.toLowerCase();
    let replyText = '';
    let actionTaken = '';

    try {
      // 1. Check a website: "Check [url]" (e.g. "Check google.com", "Check https://example.com")
      if (lower.startsWith('check ') || lower.startsWith('test ') || lower.startsWith('ping ')) {
        const target = command.replace(/^(check|test|ping)\s+/i, '').trim();
        let cleanUrl = target;
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

        replyText = `Probing ${target}...`;
        const res = await api.checkUrl(cleanUrl);

        if (res.classification === 'up') {
          replyText = `Status for ${target}: UP. Responded with HTTP ${res.statusCode} in ${res.responseTimeMs} milliseconds. SSL is ${res.sslInfo?.valid ? 'valid' : 'unchecked'}.`;
        } else if (res.classification === 'blocked') {
          replyText = `Status for ${target}: Reachable, Blocked (HTTP ${res.statusCode}). Web server is active but triggered security or bot challenge.`;
        } else {
          replyText = `Status for ${target}: DOWN. Error: ${res.reason || res.message}.`;
        }
        actionTaken = `Checked ${cleanUrl}`;
      }

      // 2. "How many sites are down?"
      else if (lower.includes('how many') && (lower.includes('down') || lower.includes('offline') || lower.includes('failing'))) {
        const downSites = monitors.filter(m => m.status === 'down');
        if (downSites.length === 0) {
          replyText = `Good news! All ${monitors.length} monitored sites are operational. Zero sites are currently down.`;
        } else if (downSites.length === 1) {
          replyText = `There is currently 1 site down: ${downSites[0].name} (${downSites[0].url}).`;
        } else {
          replyText = `There are currently ${downSites.length} sites down: ${downSites.map(m => m.name).join(', ')}.`;
        }
        actionTaken = 'Counted down monitors';
      }

      // 3. "Which monitors are down?"
      else if (lower.includes('which') && (lower.includes('down') || lower.includes('offline') || lower.includes('failing'))) {
        const downSites = monitors.filter(m => m.status === 'down');
        if (downSites.length === 0) {
          replyText = "None of your monitors are currently down. All systems are green and operational.";
        } else {
          replyText = `The following monitors are currently down: ${downSites.map(m => `${m.name} (${m.lastStatusReason || 'unreachable'})`).join('; ')}.`;
        }
        actionTaken = 'Listed down monitors';
      }

      // 4. "What is the status of [monitor name]?"
      else if (lower.includes('status of ') || lower.startsWith('status ') || (lower.includes('what') && lower.includes('status'))) {
        const queryName = lower.replace(/.*status\s+(of\s+)?/i, '').replace(/[?.!]/g, '').trim();
        const matched = monitors.find(m =>
          m.name.toLowerCase().includes(queryName) || m.url.toLowerCase().includes(queryName)
        );

        if (matched) {
          replyText = `${matched.name} is currently ${matched.status.toUpperCase()}. Response time is ${matched.responseTimeMs}ms with a 30-day uptime of ${matched.uptime30d}%. Last checked: ${matched.lastCheckedAt ? new Date(matched.lastCheckedAt).toLocaleTimeString() : 'recently'}.`;
          actionTaken = `Status for ${matched.name}`;
        } else {
          replyText = `I couldn't find a monitor matching "${queryName}". Your monitors are: ${monitors.slice(0, 4).map(m => m.name).join(', ')}${monitors.length > 4 ? ' and others' : ''}.`;
        }
      }

      // 5. "Watch [monitor name]"
      else if (lower.startsWith('watch ') || lower.includes('watch mode')) {
        const queryName = lower.replace(/^watch\s+(mode\s+)?(for\s+)?/i, '').replace(/[?.!]/g, '').trim();
        const matched = monitors.find(m =>
          m.name.toLowerCase().includes(queryName) || m.url.toLowerCase().includes(queryName)
        );

        if (matched) {
          await onToggleWatch(matched.id);
          const nowWatched = !matched.isWatched;
          replyText = nowWatched
            ? `Watch mode activated for ${matched.name}. High-frequency recovery probes started; you will be alerted the second it comes online.`
            : `Watch mode deactivated for ${matched.name}.`;
          actionTaken = `Toggled watch for ${matched.name}`;
        } else {
          replyText = `Could not find a monitor named "${queryName}". Please specify one of: ${monitors.map(m => m.name).join(', ')}.`;
        }
      }

      // 6. "Run bulk check"
      else if (lower.includes('bulk check') || lower.includes('batch check')) {
        onNavigateToTab('bulk-check');
        replyText = "Navigating to Bulk Website Check view. You can test multiple URLs in parallel.";
        actionTaken = 'Opened Bulk Check tab';
      }

      // 7. "Read my latest alerts" / "Latest notifications"
      else if (lower.includes('alert') || lower.includes('notification')) {
        if (notifications.length === 0) {
          replyText = "You have no unread notifications or alerts in your log.";
        } else {
          const top3 = notifications.slice(0, 3);
          const summaries = top3.map(n => `${n.title}: ${n.message}`).join('. ');
          replyText = `Here are your latest alerts: ${summaries}.`;
        }
        actionTaken = 'Read alerts';
      }

      // 8. "Refresh the dashboard"
      else if (lower.includes('refresh') && (lower.includes('dashboard') || lower.includes('all') || lower.includes('monitors'))) {
        onRefreshDashboard();
        replyText = `Dashboard refresh initiated. Refreshed data across all ${monitors.length} monitors.`;
        actionTaken = 'Refreshed dashboard';
      }

      // 9. "Switch to manual refresh" / "Switch to auto refresh"
      else if (lower.includes('manual refresh')) {
        if (refreshMode === 'auto') {
          onToggleRefreshMode();
        }
        replyText = "Switched to manual refresh mode. Auto-refresh countdown has been paused.";
        actionTaken = 'Mode: Manual';
      } else if (lower.includes('auto refresh')) {
        if (refreshMode === 'manual') {
          onToggleRefreshMode();
        }
        replyText = "Switched to auto refresh mode. Monitoring polls will trigger periodically in the background.";
        actionTaken = 'Mode: Auto';
      }

      // Help fallback
      else {
        replyText = `I heard: "${command}". I can check URLs, count down sites, inspect monitor statuses, toggle watch mode, read alerts, or refresh. Try asking: "How many sites are down?" or "Check github.com".`;
      }
    } catch (err: any) {
      replyText = `Sorry, I encountered an issue processing that command: ${err.message || 'Error executing request'}.`;
    } finally {
      setIsProcessing(false);
    }

    // Add assistant response
    const assistantMsg: MessageItem = {
      id: 'asst_' + Date.now(),
      sender: 'assistant',
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionTaken
    };

    setMessages(prev => [...prev, assistantMsg]);
    speakReply(replyText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleProcessCommand(inputText);
    }
  };

  const quickCommands = [
    'Check google.com',
    'How many sites are down?',
    'Which monitors are down?',
    'What is the status of ' + (monitors[0]?.name || 'API'),
    'Watch ' + (monitors.find(m => m.status === 'down')?.name || monitors[0]?.name || 'Staging Server'),
    'Run bulk check',
    'Read my latest alerts',
    'Refresh the dashboard',
    'Switch to manual refresh'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl h-[620px] max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-inherit bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                Voice Monitoring Assistant
                {isListening && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    LISTENING...
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Web Speech API Voice Recognition & Synthesis
              </p>
            </div>
          </div>

          {/* Controls: Mute, Language, Close */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-inherit bg-neutral-900/80 text-xs font-mono">
              <Globe className="h-3.5 w-3.5 text-neutral-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as VoiceLanguage)}
                className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer text-xs"
              >
                <option value="en-US" className="bg-neutral-900 text-white">English (US)</option>
                <option value="te-IN" className="bg-neutral-900 text-white">Telugu (తెలుగు)</option>
                <option value="hi-IN" className="bg-neutral-900 text-white">Hindi (हिन्दी)</option>
              </select>
            </div>

            {/* Mute Voice Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isMuted
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : 'border-inherit bg-neutral-900/80 text-neutral-300 hover:text-white'
              }`}
              title={isMuted ? 'Voice Muted (Click to unmute)' : 'Voice Audio Active'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Permission / Unsupported Warning Notice */}
        {speechPermissionError && (
          <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{speechPermissionError}</span>
            </div>
            <button
              onClick={() => setSpeechPermissionError(null)}
              className="text-amber-400 hover:text-amber-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Spoken Alert Option Banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-950/30 border-b border-inherit text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>Spoken Downtime Alerts:</span>
            <span className="text-[11px] font-mono text-neutral-500">
              {voiceAlertsEnabled ? 'Speaks aloud when servers fail or recover' : 'Off'}
            </span>
          </div>
          <button
            onClick={onToggleVoiceAlerts}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              voiceAlertsEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {voiceAlertsEnabled ? 'Enabled' : 'Enable'}
          </button>
        </div>

        {/* Chat / Conversation Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                }`}
              >
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : isDark
                    ? 'bg-neutral-950/80 text-neutral-200 border border-neutral-800 rounded-tl-xs'
                    : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-between gap-3 mt-1 text-[10px] opacity-60 font-mono">
                  <span>{msg.timestamp}</span>
                  {msg.actionTaken && (
                    <span className="font-semibold text-emerald-300">✓ {msg.actionTaken}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse pl-10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
              <span>Analyzing command...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-neutral-950/40 border-t border-inherit overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
            Try:
          </span>
          {quickCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleProcessCommand(cmd)}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                isDark
                  ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Input Bar (Microphone Button + Text Input Fallback) */}
        <div className="p-3 border-t border-inherit bg-neutral-950/60">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            {/* Main Microphone Button */}
            <button
              type="button"
              onClick={toggleListen}
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30 scale-105'
                  : isDark
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
              title={isListening ? 'Stop listening' : 'Start speaking command'}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Fallback Text Input (Always available!) */}
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... Speak your command now'
                    : 'Type a command or click the mic to speak...'
                }
                className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900 text-neutral-100 focus:border-emerald-500'
                    : 'border-slate-300 bg-white text-slate-800 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Send text command"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

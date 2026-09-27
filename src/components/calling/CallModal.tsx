import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Volume2,
  Sparkles,
  User,
  Shield
} from 'lucide-react';
import { Call, UserProfile } from '../../types.ts';
import { apiRequest } from '../../services/api.ts';

export interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'incoming' | 'outgoing' | 'connected';
  call: Call | null;
  targetUser?: UserProfile | null;
  callType: 'VOICE' | 'VIDEO';
  onAccept?: () => void;
  onReject?: () => void;
  onEndCall?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  mode,
  call,
  targetUser,
  callType,
  onAccept,
  onReject,
  onEndCall
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'VOICE');
  const [durationSeconds, setDurationSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Timer for connected call
  useEffect(() => {
    let timer: any = null;
    if (mode === 'connected') {
      timer = setInterval(() => {
        setDurationSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setDurationSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode]);

  // Attempt to acquire media stream
  useEffect(() => {
    let active = true;

    async function setupMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'VIDEO'
          });
          if (active) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }
        }
      } catch (err) {
        console.warn('getUserMedia unavailable or permission denied; using simulated call media:', err);
      }
    }

    if (isOpen && (mode === 'connected' || mode === 'outgoing')) {
      setupMedia();
    }

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen, mode, callType]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const displayUser = targetUser || (call?.caller_id ? call.caller : call?.receiver);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        {/* Top Status Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              WebRTC Peer Connection
            </span>
          </div>
          <span className="font-mono text-slate-300">
            {mode === 'connected' ? formatDuration(durationSeconds) : mode.toUpperCase()}
          </span>
        </div>

        {/* Central Call Area */}
        <div className="p-8 flex flex-col items-center justify-center relative min-h-[300px]">
          {/* If video call and connected: show simulated/real video canvas */}
          {callType === 'VIDEO' && mode === 'connected' && !isVideoOff ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 mb-4 flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Fallback avatar if remote video has no stream */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs">
                <img
                  src={displayUser?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${displayUser?.username || 'peer'}`}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-xl mb-2"
                />
                <h4 className="font-bold text-sm text-white">{displayUser?.full_name || 'Engineer'}</h4>
                <p className="text-xs text-emerald-400 font-mono mt-1">Live Video Stream Connected</p>
              </div>

              {/* PiP Local stream */}
              <div className="absolute bottom-3 right-3 w-28 h-20 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            /* Audio / Ringing View */
            <div className="flex flex-col items-center text-center space-y-4 my-auto">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-700 shadow-2xl relative z-10">
                  <img
                    src={displayUser?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${displayUser?.username || 'peer'}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Pulsing ring animation */}
                <span className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
                <span className="absolute -inset-3 rounded-full bg-sky-500/10 animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{displayUser?.full_name || 'Engineer'}</h3>
                <p className="text-xs text-slate-400">@{displayUser?.username || 'user'}</p>
                <div className="text-xs text-sky-400 font-medium mt-2 flex items-center justify-center space-x-1">
                  {callType === 'VIDEO' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                  <span>
                    {mode === 'incoming'
                      ? 'Incoming call...'
                      : mode === 'outgoing'
                      ? 'Calling...'
                      : 'Call in progress'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 flex items-center justify-center space-x-4">
          {mode === 'incoming' ? (
            <>
              <button
                onClick={onAccept}
                className="flex-1 max-w-[140px] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Accept</span>
              </button>

              <button
                onClick={onReject}
                className="flex-1 max-w-[140px] py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Decline</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-2xl border transition-colors ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {callType === 'VIDEO' && (
                <button
                  onClick={toggleVideo}
                  className={`p-3.5 rounded-2xl border transition-colors ${
                    isVideoOff
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={onEndCall}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

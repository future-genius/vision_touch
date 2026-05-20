import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AiData {
  gesture: string;
  gesture_key: string;
  confidence: number;
  fps: number;
  landmarkCount: number;
  landmarks: Point3D[];
  inferenceTimeMs: number;
  trackingStatus: 'Active' | 'Idle' | 'Offline';
  cursorX: number;
  cursorY: number;
  actionState: string;
  isFeeding: boolean;
  feedGestureKey: string | null;
  activeApp: string;
  headPitch: number;
  headYaw: number;
  voiceCommand: string;
  cpuLoad: number;
  ramLoad: number;
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface PendingPattern {
  landmark_vectors: Point3D[];
  sample_quality: number;
}

export interface AiStreamContextType {
  data: AiData;
  history: { time: string; confidence: number; fps: number }[];
  logs: SystemLog[];
  isConnected: boolean;
  pendingPattern: PendingPattern | null;
  clearPendingPattern: () => void;
  initializeEngine: () => void;
  disconnectEngine: () => void;
  startFeeding: (gestureKey: string) => void;
  stopFeeding: () => void;
  triggerHotReload: () => void;
  retrainModel: () => void;
  calibratePoint: (point: 'top_left' | 'bottom_right', x: number, y: number) => void;
  setCursorConfig: (config: { sensitivity?: number; smoothing?: number; dead_zone?: number }) => void;
  speakStatus: () => void;
  speakDashboard: () => void;
}

export const AiStreamContext = createContext<AiStreamContextType | undefined>(undefined);

export const AiStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AiData>({
    gesture: 'None',
    gesture_key: 'None',
    confidence: 0,
    fps: 0,
    landmarkCount: 0,
    landmarks: [],
    inferenceTimeMs: 0,
    trackingStatus: 'Offline',
    cursorX: 0,
    cursorY: 0,
    actionState: 'None',
    isFeeding: false,
    feedGestureKey: null,
    activeApp: 'General',
    headPitch: 0.0,
    headYaw: 0.0,
    voiceCommand: 'None',
    cpuLoad: 0,
    ramLoad: 0
  });

  const [history, setHistory] = useState<{ time: string; confidence: number; fps: number }[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingPattern, setPendingPattern] = useState<PendingPattern | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const addLog = useCallback((message: string, type: SystemLog['type'] = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      }
    ].slice(-50));
  }, []);

  const sendEvent = useCallback((type: string, payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data: payload }));
      return true;
    }
    return false;
  }, []);

  const initializeEngine = useCallback(() => {
    sendEvent('initialize_engine');
    addLog('Initializing Vision Neural Engine...', 'info');
  }, [sendEvent, addLog]);

  const disconnectEngine = useCallback(() => {
    sendEvent('disconnect_engine');
    addLog('Disconnecting Vision Neural Engine...', 'warning');
  }, [sendEvent, addLog]);

  const startFeeding = useCallback((gestureKey: string) => {
    sendEvent('start_feeding', { gesture_key: gestureKey });
    addLog(`Realtime feed active for gesture group: ${gestureKey}`, 'info');
  }, [sendEvent, addLog]);

  const stopFeeding = useCallback(() => {
    sendEvent('stop_feeding');
    addLog('Realtime feed inactive.', 'info');
  }, [sendEvent, addLog]);

  const triggerHotReload = useCallback(() => {
    sendEvent('hot_reload');
    addLog('Triggering AI Inference mappings hot-reload...', 'info');
  }, [sendEvent, addLog]);

  const retrainModel = useCallback(() => {
    sendEvent('retrain_model');
    addLog('Triggering AI Model retraining pipeline...', 'info');
  }, [sendEvent, addLog]);

  const calibratePoint = useCallback((point: 'top_left' | 'bottom_right', x: number, y: number) => {
    sendEvent('calibrate_point', { point, x, y });
    addLog(`Calibrated boundary corner: ${point} (${x.toFixed(2)}, ${y.toFixed(2)})`, 'success');
  }, [sendEvent, addLog]);

  const setCursorConfig = useCallback((config: { sensitivity?: number; smoothing?: number; dead_zone?: number }) => {
    sendEvent('set_cursor_config', config);
    addLog(`Updating cursor sensitivity and damping configs`, 'info');
  }, [sendEvent, addLog]);

  const speakStatus = useCallback(() => {
    sendEvent('speak_status');
    addLog('Requesting status voice announcement...', 'info');
  }, [sendEvent, addLog]);

  const speakDashboard = useCallback(() => {
    sendEvent('speak_dashboard');
    addLog('Requesting dashboard diagnostics voice announcement...', 'info');
  }, [sendEvent, addLog]);

  const clearPendingPattern = useCallback(() => {
    setPendingPattern(null);
  }, []);

  // WebSockets lifecycle coordination
  useEffect(() => {
    const connect = () => {
      addLog('Attempting connection to VisionTouch AI node...', 'info');
      const socket = new WebSocket('ws://localhost:8765');
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setData(prev => ({ ...prev, trackingStatus: 'Idle' }));
        addLog('Connected to local VisionTouch AI backend node', 'success');

        // Auto-initialize the neural engine once socket is open
        socket.send(JSON.stringify({ type: 'initialize_engine', data: {} }));

        // Start heartbeat ping
        pingIntervalRef.current = setInterval(() => {
          sendEvent('ping');
        }, 5000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data: eventData, message, success } = payload;

          if (type === 'hand_landmarks') {
            setData(prev => ({
              ...prev,
              gesture: eventData.gesture,
              gesture_key: eventData.gesture_key,
              confidence: eventData.confidence,
              fps: eventData.fps,
              landmarkCount: eventData.landmarkCount,
              landmarks: eventData.landmarks || [],
              inferenceTimeMs: eventData.inferenceTimeMs,
              trackingStatus: eventData.trackingStatus,
              cursorX: eventData.cursorX,
              cursorY: eventData.cursorY,
              actionState: eventData.actionState,
              isFeeding: eventData.isFeeding,
              feedGestureKey: eventData.feedGestureKey,
              activeApp: eventData.activeApp || 'General',
              headPitch: eventData.headPitch || 0.0,
              headYaw: eventData.headYaw || 0.0,
              voiceCommand: eventData.voiceCommand || 'None',
              cpuLoad: eventData.cpuLoad || 0,
              ramLoad: eventData.ramLoad || 0
            }));

            // Sync metrics history
            setHistory(prev => {
              const now = new Date();
              const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
              return [...prev, { time: timeStr, confidence: eventData.confidence, fps: eventData.fps }].slice(-20);
            });
          }

          else if (type === 'detected_unknown_pattern') {
            addLog('AI detected stable unknown gesture pattern! Prompting admin labeling.', 'warning');
            setPendingPattern(eventData);
          }

          else if (type === 'dataset_uploaded') {
            addLog(`Recorded landmark sample for gesture group '${eventData.gesture_key}'`, 'success');
          }

          else if (type === 'inference_updated') {
            if (success) {
              addLog('AI Inference Engine updated gesture mappings successfully!', 'success');
            } else {
              addLog('AI Inference Engine mappings reload failed', 'error');
            }
          }

          else if (type === 'calibration_updated') {
            addLog(message || 'Calibration mapping updated', 'success');
          }

          else if (type === 'admin_notification') {
            addLog(message || 'Action executed successfully', 'success');
          }

        } catch (e) {
          console.error('Error parsing WebSocket payload', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setData(prev => ({ ...prev, trackingStatus: 'Offline' }));
        addLog('VisionTouch backend disconnected. Retrying connection...', 'warning');
        clearInterval(pingIntervalRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    // ----------------------------------------------------
    // GLOBAL CLOUD SYNCHRONIZATION (Supabase Realtime)
    // ----------------------------------------------------
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gesture_action_map'
        },
        (_payload) => {
          addLog('[Cloud Sync] Database mappings modified globally. Synchronizing active clients...', 'warning');
          // Automatically trigger hot model reload for the connected local vision engine!
          setTimeout(triggerHotReload, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gestures'
        },
        (_payload) => {
          addLog('[Cloud Sync] Gestures list updated. Synchronizing model registry...', 'warning');
          setTimeout(triggerHotReload, 500);
        }
      )
      .subscribe();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [addLog, sendEvent, triggerHotReload]);

  return (
    <AiStreamContext.Provider value={{
      data,
      history,
      logs,
      isConnected,
      pendingPattern,
      clearPendingPattern,
      initializeEngine,
      disconnectEngine,
      startFeeding,
      stopFeeding,
      triggerHotReload,
      retrainModel,
      calibratePoint,
      setCursorConfig,
      speakStatus,
      speakDashboard
    }}>
      {children}
    </AiStreamContext.Provider>
  );
};

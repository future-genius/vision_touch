import { useState, useEffect } from 'react';

export interface AiData {
  gesture: string;
  confidence: number;
  fps: number;
  landmarkCount: number;
  inferenceTimeMs: number;
  trackingStatus: 'Active' | 'Idle' | 'Offline';
}

export function useAiStream() {
  const [data, setData] = useState<AiData>({
    gesture: 'None',
    confidence: 0,
    fps: 0,
    landmarkCount: 0,
    inferenceTimeMs: 0,
    trackingStatus: 'Offline',
  });

  const [history, setHistory] = useState<{ time: string; confidence: number; fps: number }[]>([]);
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
      socket = new WebSocket('ws://localhost:8765');

      socket.onopen = () => {
        console.log('Connected to Vision Engine');
        setData(prev => ({ ...prev, trackingStatus: 'Idle' }));
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: 'Connected to local Vision Engine', type: 'success' as const }].slice(-50));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setData({
            gesture: payload.gesture,
            confidence: payload.confidence,
            fps: payload.fps,
            landmarkCount: payload.landmarkCount,
            inferenceTimeMs: payload.inferenceTimeMs,
            trackingStatus: payload.trackingStatus,
          });

          // Update Logs if a significant gesture is detected
          if (payload.gesture !== 'None') {
            setLogs(prev => [...prev, { 
              timestamp: new Date().toLocaleTimeString(), 
              message: `Detected: ${payload.gesture} (${payload.confidence.toFixed(1)}%)`, 
              type: 'info' as const 
            }].slice(-50));
          }

          setHistory(prev => {
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            return [...prev, { time: timeStr, confidence: payload.confidence, fps: payload.fps }].slice(-20);
          });
        } catch (e) {
          console.error('Error parsing WebSocket data', e);
        }
      };

      socket.onclose = () => {
        setData(prev => ({ ...prev, trackingStatus: 'Offline' }));
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: 'Vision Engine Disconnected. Attempting reconnect...', type: 'warning' as const }].slice(-50));
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      socket?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return { data, history, logs };
}

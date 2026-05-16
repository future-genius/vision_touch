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

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket('ws://localhost:8765');

      socket.onopen = () => {
        console.log('Connected to Vision Engine');
        setData(prev => ({ ...prev, trackingStatus: 'Idle' }));
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        setData({
          gesture: payload.gesture,
          confidence: payload.confidence,
          fps: payload.fps,
          landmarkCount: payload.landmarkCount,
          inferenceTimeMs: payload.inferenceTimeMs,
          trackingStatus: payload.trackingStatus,
        });

        // Update History for Analytics
        setHistory(prev => {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
          return [...prev, { time: timeStr, confidence: payload.confidence, fps: payload.fps }].slice(-20);
        });
      };

      socket.onclose = () => {
        console.log('Vision Engine Disconnected. Retrying...');
        setData(prev => ({ ...prev, trackingStatus: 'Offline' }));
        reconnectTimeout = setTimeout(connect, 3000); // Retry every 3 seconds
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

  return { data, history };
}

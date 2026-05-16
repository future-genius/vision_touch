// src/hooks/useAiStream.ts
import { useEffect, useState } from 'react';
import { aiService, type AiStreamData } from '../services/mockAiService';

export function useAiStream() {
  const [data, setData] = useState<AiStreamData>({
    gesture: 'None',
    confidence: 0,
    fps: 0,
    inferenceTimeMs: 0,
    landmarkCount: 0,
    trackingStatus: 'Initializing'
  });

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeData = aiService.subscribe((newData) => {
      setData(newData);
    });

    const unsubscribeLogs = aiService.subscribeLogs((newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
    });

    return () => {
      unsubscribeData();
      unsubscribeLogs();
    };
  }, []);

  return { data, logs };
}

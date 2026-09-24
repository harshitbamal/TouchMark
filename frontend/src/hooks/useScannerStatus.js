import { useCallback, useEffect, useState } from 'react';
import { API_URL, fingerprintService } from '../services/api';

const INITIAL_STATUS = { state: 'connecting', ready: false, enrolled_count: 0 };

export function useScannerStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS);

  const refresh = useCallback(async () => {
    const result = await fingerprintService.checkStatus();
    setStatus({
      state: result.ready || result.connected ? 'connected' : 'disconnected',
      ready: Boolean(result.ready ?? result.connected),
      enrolled_count: result.enrolled_count || 0,
    });
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    let abortController;
    const waitToReconnect = () => new Promise((resolve) => window.setTimeout(resolve, 2500));

    const listen = async () => {
      while (active) {
        abortController = new AbortController();
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL.replace(/\/$/, '')}/fingerprint/events`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: abortController.signal,
          });

          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.assign('/login');
            return;
          }
          if (!response.ok || !response.body) throw new Error('Scanner status stream unavailable');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (active) {
            const { value, done } = await reader.read();
            if (done) throw new Error('Scanner status stream closed');
            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split(/\r?\n\r?\n/);
            buffer = messages.pop() || '';
            for (const message of messages) {
              const data = message.split(/\r?\n/).find((line) => line.startsWith('data:'))?.slice(5).trim();
              if (!data) continue;
              try {
                const nextStatus = JSON.parse(data);
                if (active) setStatus({
                  state: nextStatus.state || 'disconnected',
                  ready: Boolean(nextStatus.ready),
                  enrolled_count: nextStatus.enrolled_count || 0,
                });
              } catch {
                // Ignore malformed events and keep the stream alive.
              }
            }
          }
        } catch {
          if (!active) return;
          setStatus((current) => ({ ...current, state: 'reconnecting', ready: false }));
          await waitToReconnect();
        }
      }
    };

    listen();
    return () => {
      active = false;
      abortController?.abort();
    };
  }, []);

  return { status, refresh };
}

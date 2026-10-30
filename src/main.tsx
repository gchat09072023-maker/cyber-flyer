import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Vite WebSocket Reconnection Guard for hosted container environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    if (
      (reason instanceof Event && (reason.type === 'error' || (window.WebSocket && reason.target instanceof WebSocket))) ||
      (reason && typeof reason.message === 'string' && (
        reason.message.includes('WebSocket') ||
        reason.message.includes('vite') ||
        reason.message.includes('ws://') ||
        reason.message.includes('wss://')
      ))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { useGame } from './store/game';
import { App } from './ui/App';

// Dev-only handle so automated play-tests can inspect state and fast-forward time.
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

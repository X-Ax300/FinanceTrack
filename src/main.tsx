import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload critical resources
function preloadResources() {
  // Preload fonts if using web fonts
  if ('fonts' in document) {
    try {
      // This will be used if you add Google Fonts or similar
      (document as any).fonts?.ready?.catch?.(() => {});
    } catch (e) {
      // Ignore font preload errors
    }
  }

  // Prefetch DNS for Firebase
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = 'https://firebaseio.com';
  document.head.appendChild(link);
}

preloadResources();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


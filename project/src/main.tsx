import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
<meta
  http-equiv="Content-Security-Policy"
  content="frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com;"
/>
<!--
  The above change adds the URL in the error message to the allowed frame sources.
  Note that you might also need to change other directives in your CSP, for
  example the one for script-src.
-->

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

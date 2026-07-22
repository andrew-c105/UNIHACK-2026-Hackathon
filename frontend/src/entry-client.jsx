import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Hydrate if server-rendered, otherwise mount fresh
const isSSR =
  container.hasChildNodes() &&
  container.firstChild?.nodeType !== 8; /* Node.COMMENT_NODE */

if (isSSR) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}

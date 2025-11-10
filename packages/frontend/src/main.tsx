import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
// import { TestApp } from './test-app.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Uncomment below to test if React is working */}
    {/* <TestApp /> */}
  </StrictMode>
);

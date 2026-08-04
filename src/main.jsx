import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import "./styles.css";
import App from './App.jsx'
import { ThemeProvider } from './components/ThemeContext.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MiniPlayerBar } from './shell/MiniPlayerBar';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    {/* A mesma página serve o miniplayer da chamada (janelinha flutuante). */}
    {location.hash === '#mini' ? <MiniPlayerBar /> : <App />}
  </StrictMode>,
);

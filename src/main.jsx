import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import { capturarTokenDaUrl } from './services/sessao.js';
import App from './App.jsx';

// O token de sessão vem no fragmento da URL impressa no terminal. Captura antes do primeiro render.
capturarTokenDaUrl();

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

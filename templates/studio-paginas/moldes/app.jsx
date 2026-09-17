import { BrowserRouter, Routes, Route } from 'react-router-dom';
{{IMPORTS}}

// Rotas de {{PROJETO}}, uma por página desenhada no Studio, na ordem do desenho. Página nova entra
// aqui e em src/paginas/.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
{{ROTAS}}
      </Routes>
    </BrowserRouter>
  );
}

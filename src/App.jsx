import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LayoutApp from './components/layout/LayoutApp.jsx';
import PaginaInicio from './features/inicio/PaginaInicio.jsx';
import SemSessao from './features/inicio/SemSessao.jsx';
import PaginaConfig from './features/config/PaginaConfig.jsx';
import PaginaEficiencia from './features/eficiencia/PaginaEficiencia.jsx';
import { obterToken } from './services/sessao.js';

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export default function App() {
  if (!obterToken()) return <SemSessao />;
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<LayoutApp />}>
            <Route index element={<PaginaInicio />} />
            <Route path="eficiencia" element={<PaginaEficiencia />} />
            <Route path="config" element={<PaginaConfig />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

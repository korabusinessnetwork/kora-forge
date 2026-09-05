import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LayoutApp from './components/layout/LayoutApp.jsx';
import SemSessao from './features/sessao/SemSessao.jsx';
import PaginaRegistry from './features/registry/PaginaRegistry.jsx';
import PaginaNovoProjeto from './features/registry/PaginaNovoProjeto.jsx';
import PaginaProjeto from './features/registry/PaginaProjeto.jsx';
import PaginaWizard from './features/wizard/PaginaWizard.jsx';
import PaginaStudio from './features/studio/PaginaStudio.jsx';
import PaginaConfig from './features/config/PaginaConfig.jsx';
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
            <Route index element={<PaginaRegistry />} />
            <Route path="novo" element={<PaginaNovoProjeto />} />
            <Route path="projetos/:id" element={<PaginaProjeto />} />
            <Route path="projetos/:id/wizard" element={<PaginaWizard />} />
            <Route path="projetos/:id/wizard/:etapa" element={<PaginaWizard />} />
            <Route path="projetos/:id/studio" element={<PaginaStudio />} />
            <Route path="config" element={<PaginaConfig />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

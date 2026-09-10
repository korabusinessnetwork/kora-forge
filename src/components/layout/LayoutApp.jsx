import { useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useHealth } from '../../hooks/useHealth.js';
import { useAtalhoGlobal } from '../../hooks/useAtalhoGlobal.js';
import Botao from '../shared/Botao/Botao.jsx';
import GavetaIdeias from '../ideias/GavetaIdeias/GavetaIdeias.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './LayoutApp.module.css';

const classeLink = ({ isActive }) => [estilos.link, isActive ? estilos.ativo : null].filter(Boolean).join(' ');

const ehMac = () => /mac/i.test(globalThis.navigator?.platform ?? globalThis.navigator?.userAgent ?? '');

// Template. Barra lateral com menus, topo com projeto ativo, área de conteúdo.
// A gaveta de ideias mora aqui porque o atalho é do aplicativo inteiro (RN-10), e porque assim
// existe uma gaveta só, com um estado só, de qualquer tela.
export default function LayoutApp() {
  const { data } = useHealth();
  const local = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);

  const abrirGaveta = useCallback(() => setGavetaAberta(true), []);
  const fecharGaveta = useCallback(() => setGavetaAberta(false), []);

  // Com a gaveta aberta o atalho é desligado: reapertar não faz nada e não rouba o foco de quem
  // está digitando lá dentro.
  useAtalhoGlobal('i', abrirGaveta, { ativo: !gavetaAberta });

  return (
    <div className={estilos.casca}>
      <aside className={estilos.lateral}>
        <p className={estilos.marca}>
          {mensagens.app.nome}
          <span className={estilos.versao}>{data?.versao ?? mensagens.app.versaoDesconhecida}</span>
        </p>
        <nav className={estilos.nav} aria-label={mensagens.app.navegacao}>
          <NavLink to="/" end className={classeLink}>{mensagens.menu.projetos}</NavLink>
          <NavLink to="/config" className={classeLink}>{mensagens.menu.config}</NavLink>
        </nav>
        <div className={estilos.rodape}>
          <Botao variante="secundario" onClick={abrirGaveta}>{mensagens.menu.ideias}</Botao>
          <span className={estilos.dica}>{ehMac() ? mensagens.ideias.atalhoMac : mensagens.ideias.atalho}</span>
        </div>
      </aside>
      <div className={estilos.principal}>
        <header className={estilos.topo}>
          <span>{mensagens.app.semProjetoAtivo}</span>
        </header>
        <main className={estilos.conteudo}>
          <Outlet />
        </main>
      </div>

      {/* A origem é a rota onde a ideia surgiu, e é ela que o cartão mostra depois. */}
      <GavetaIdeias aberta={gavetaAberta} onFechar={fecharGaveta} origem={local.pathname} />
    </div>
  );
}

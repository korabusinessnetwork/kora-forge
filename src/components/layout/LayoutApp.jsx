import { NavLink, Outlet } from 'react-router-dom';
import { useHealth } from '../../hooks/useHealth.js';
import { mensagens } from '../../mensagens.js';
import estilos from './LayoutApp.module.css';

const classeLink = ({ isActive }) => [estilos.link, isActive ? estilos.ativo : null].filter(Boolean).join(' ');

// Template. Barra lateral com menus, topo com projeto ativo, área de conteúdo.
export default function LayoutApp() {
  const { data } = useHealth();
  return (
    <div className={estilos.casca}>
      <aside className={estilos.lateral}>
        <p className={estilos.marca}>
          {mensagens.app.nome}
          <span className={estilos.versao}>{data?.versao ?? mensagens.app.versaoDesconhecida}</span>
        </p>
        <nav className={estilos.nav} aria-label={mensagens.app.navegacao}>
          <NavLink to="/" end className={classeLink}>{mensagens.menu.projetos}</NavLink>
          <NavLink to="/eficiencia" className={classeLink}>{mensagens.menu.eficiencia}</NavLink>
          <NavLink to="/config" className={classeLink}>{mensagens.menu.config}</NavLink>
        </nav>
      </aside>
      <div className={estilos.principal}>
        <header className={estilos.topo}>
          <span>{mensagens.app.semProjetoAtivo}</span>
        </header>
        <main className={estilos.conteudo}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

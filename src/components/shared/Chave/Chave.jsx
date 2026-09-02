import { useEffect, useState } from 'react';
import Botao from '../Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Chave.module.css';

// Atom. Caminho, comando ou nome de tabela em mono, com botão de copiar.
export default function Chave({ valor, rotulo }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return undefined;
    const temporizador = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  const copiar = async () => {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) return;
    try {
      await clipboard.writeText(valor);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <span className={estilos.chave}>
      <code className={estilos.valor}>{valor}</code>
      <Botao variante="fantasma" onClick={copiar} aria-label={`${mensagens.chave.copiar} ${rotulo ?? valor}`}>
        {copiado ? mensagens.chave.copiado : mensagens.chave.copiar}
      </Botao>
    </span>
  );
}

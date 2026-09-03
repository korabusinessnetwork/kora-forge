import { useMemo, useState } from 'react';
import { CATALOGO, simularMensal } from '@shared/eficiencia/motor.js';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Selecao from '../../components/shared/Selecao/Selecao.jsx';
import Selo from '../../components/shared/Selo/Selo.jsx';
import { mensagens } from '../../mensagens.js';
import { formatarPercentual, formatarUsd, preencher } from './formatar.js';
import estilos from './SimuladorCusto.module.css';

const m = mensagens.eficiencia.simulador;
const PADRAO = { tokensEntrada: '3000', tokensSaida: '1000', chamadasPorMes: '60' };

// Campo vazio, negativo ou não numérico vira zero e ganha aviso junto do campo (prevenção de erro,
// não mensagem de erro no fim). Nunca lança: o simulador sempre mostra um resultado.
export function interpretarNumero(texto) {
  const valor = Number(String(texto).trim());
  if (String(texto).trim() === '' || !Number.isFinite(valor) || valor < 0) return { valor: 0, invalido: true };
  return { valor: Math.round(valor), invalido: false };
}

// Simulador de custo mensal por modelo. Calcula no cliente com o mesmo motor do servidor: nenhuma
// chamada de rede, resultado idêntico ao que a skill imprime no terminal.
export default function SimuladorCusto({ tetoUsd = null }) {
  const [form, setForm] = useState({ ...PADRAO, cache: 'ligado', lote: 'desligado' });
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const { linhas, erros } = useMemo(() => {
    const entrada = interpretarNumero(form.tokensEntrada);
    const saida = interpretarNumero(form.tokensSaida);
    const chamadas = interpretarNumero(form.chamadasPorMes);
    return {
      linhas: simularMensal({
        tokensEntrada: entrada.valor,
        tokensSaida: saida.valor,
        chamadasPorMes: chamadas.valor,
        cache: form.cache === 'ligado',
        lote: form.lote === 'ligado',
        tetoUsd,
      }, CATALOGO),
      erros: {
        tokensEntrada: entrada.invalido ? m.invalido : undefined,
        tokensSaida: saida.invalido ? m.invalido : undefined,
        chamadasPorMes: chamadas.invalido ? m.invalido : undefined,
      },
    };
  }, [form, tetoUsd]);

  const opcoesLigado = (padraoLigado) => [
    { valor: 'ligado', rotulo: m.ligado, padraoKora: padraoLigado },
    { valor: 'desligado', rotulo: m.desligado, padraoKora: !padraoLigado },
  ];

  return (
    <section className={estilos.painel} aria-labelledby="titulo-simulador">
      <div className={estilos.cabecalho}>
        <h2 id="titulo-simulador">{m.titulo}</h2>
        <p className={estilos.micro}>{m.micro}</p>
      </div>

      <div className={estilos.formulario}>
        <Campo id="sim-entrada" rotulo={m.entrada.rotulo} microtexto={m.entrada.micro} erro={erros.tokensEntrada} padrao={PADRAO.tokensEntrada} type="number" min="0" step="100" inputMode="numeric" value={form.tokensEntrada} onChange={(evento) => alterar('tokensEntrada')(evento.target.value)} />
        <Campo id="sim-saida" rotulo={m.saida.rotulo} microtexto={m.saida.micro} erro={erros.tokensSaida} padrao={PADRAO.tokensSaida} type="number" min="0" step="100" inputMode="numeric" value={form.tokensSaida} onChange={(evento) => alterar('tokensSaida')(evento.target.value)} />
        <Campo id="sim-chamadas" rotulo={m.chamadas.rotulo} microtexto={m.chamadas.micro} erro={erros.chamadasPorMes} padrao={PADRAO.chamadasPorMes} type="number" min="0" step="1" inputMode="numeric" value={form.chamadasPorMes} onChange={(evento) => alterar('chamadasPorMes')(evento.target.value)} />
        <Campo id="sim-cache" rotulo={m.cache.rotulo} microtexto={m.cache.micro}>
          <Selecao id="sim-cache" valor={form.cache} onChange={alterar('cache')} opcoes={opcoesLigado(true)} />
        </Campo>
        <Campo id="sim-lote" rotulo={m.lote.rotulo} microtexto={m.lote.micro}>
          <Selecao id="sim-lote" valor={form.lote} onChange={alterar('lote')} opcoes={opcoesLigado(false)} />
        </Campo>
      </div>

      <div className={estilos.rolagem}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th scope="col">{m.colunas.modelo}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.porChamada}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.porMes}</th>
              <th scope="col" className={estilos.numero}>{m.colunas.doTeto}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.id} data-modelo={linha.id}>
                <th scope="row" className={estilos.modelo}>
                  <span>{linha.nome}</span>
                  <Selo estado={linha.tier} />
                </th>
                <td className={estilos.numero}>{formatarUsd(linha.custoPorChamadaUsd)}</td>
                <td className={estilos.numero}>{formatarUsd(linha.custoMensalUsd)}</td>
                <td className={estilos.numero}>{linha.percentualDoTeto === null ? m.semTeto : formatarPercentual(linha.percentualDoTeto, { jaEmPercentual: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={estilos.micro}>{preencher(mensagens.eficiencia.catalogo, { versao: CATALOGO.versao, data: CATALOGO.atualizado_em, fonte: CATALOGO.fonte })}</p>
    </section>
  );
}

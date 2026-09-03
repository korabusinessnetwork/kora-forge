import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ErroForge } from '../../lib/erro.js';
import { resolverNoWorkspace } from '../../lib/caminhos.js';
import { executar, parar as pararProcesso, validarComando } from '../../lib/processo.js';
import { checarRequisitos } from './requisitos.js';

function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

// O runner é a única parte do Forge que escreve em disco e executa processo. Ele recebe um plano
// já aprovado e regenerado pelo servidor: nunca conteúdo vindo do cliente (ADR-002, P-02).
export function criarServicoRunner({ db, transmissor, registrarEvento = () => true, log = null }) {
  const stmts = {
    inserirRun: db.prepare(`
      INSERT INTO command_runs (id, project_id, comando_id, cmd, args_json, cwd, estado, exit_code, iniciado_em, terminado_em)
      VALUES (@id, @project_id, @comando_id, @cmd, @args_json, @cwd, 'rodando', NULL, @agora, NULL)
    `),
    fecharRun: db.prepare('UPDATE command_runs SET estado = @estado, exit_code = @exit_code, terminado_em = @agora WHERE id = @id'),
    run: db.prepare('SELECT id, project_id, estado FROM command_runs WHERE id = ?'),
    inserirLog: db.prepare('INSERT INTO command_logs (run_id, stream, linha, ts) VALUES (?, ?, ?, ?)'),
    marcarMaterializado: db.prepare("UPDATE projects SET status = 'materializado', caminho_disco = @caminho, atualizado_em = @agora WHERE id = @id"),
  };
  const gravarLogs = db.transaction((runId, linhas) => {
    for (const { stream, linha, ts } of linhas) stmts.inserirLog.run(runId, stream, linha, ts);
  });

  const emAndamento = new Map();
  const processos = new Map();
  let encerrado = false;

  // O callback de um processo pode chegar depois de o servidor começar a encerrar, com o banco
  // já fechado. Gravar aqui é registro, não a operação principal: falhar não pode derrubar nada.
  function gravarComCuidado(acao, contexto) {
    if (encerrado) return false;
    try {
      acao();
      return true;
    } catch (erro) {
      log?.warn({ err: erro, ...contexto }, 'falha ao gravar estado do runner');
      return false;
    }
  }

  const publico = (materializacao) => ({
    projetoId: materializacao.projetoId,
    raiz: materializacao.raiz,
    estado: materializacao.estado,
    arquivos: materializacao.arquivos,
    comandos: materializacao.comandos.map((comando) => ({
      id: comando.id, cmd: comando.cmd, args: comando.args, obrigatorio: comando.obrigatorio,
      longaDuracao: comando.longaDuracao, estado: comando.estado, runId: comando.runId,
      exitCode: comando.exitCode, erro: comando.erro,
    })),
    indice: materializacao.indice,
    iniciadaEm: materializacao.iniciadaEm,
    terminadaEm: materializacao.terminadaEm,
  });

  function obter(projetoId) {
    const materializacao = emAndamento.get(projetoId);
    return materializacao ? publico(materializacao) : null;
  }

  // Escrita: pastas primeiro, depois os arquivos na ordem do plano (RN-05.4). Todo caminho é
  // revalidado contra a raiz aqui, e não só no plano: defesa em profundidade (C4).
  function escreverArquivos(plano) {
    const contagem = { criados: 0, sobrescritos: 0, pulados: 0 };
    fs.mkdirSync(plano.raiz, { recursive: true });
    const pastas = new Set(plano.arquivos.map((arquivo) => path.dirname(arquivo.caminho)).filter((pasta) => pasta !== '.'));
    for (const pasta of [...pastas].sort()) fs.mkdirSync(resolverNoWorkspace(plano.raiz, pasta), { recursive: true });

    for (const arquivo of plano.arquivos) {
      if (arquivo.acao === 'pular') {
        contagem.pulados += 1;
        continue;
      }
      const destino = resolverNoWorkspace(plano.raiz, arquivo.caminho);
      try {
        fs.writeFileSync(destino, arquivo.conteudo, 'utf8');
      } catch (erro) {
        throw new ErroForge('FORGE_RUN_FAILED', `Não deu para escrever ${arquivo.caminho}: ${erro.message}`, {
          issues: [{ caminho: arquivo.caminho, mensagem: erro.message }],
          escritos: contagem,
        });
      }
      contagem[arquivo.acao === 'criar' ? 'criados' : 'sobrescritos'] += 1;
    }
    return contagem;
  }

  function finalizar(materializacao, estado) {
    materializacao.estado = estado;
    materializacao.terminadaEm = new Date().toISOString();
    if (estado === 'concluida') {
      if (encerrado) return;
      stmts.marcarMaterializado.run({ id: materializacao.projetoId, caminho: materializacao.raiz, agora: materializacao.terminadaEm });
      registrarEvento('projeto.materializado', { raiz: materializacao.raiz, comandos: materializacao.comandos.length }, materializacao.projetoId);
    }
  }

  function rodarProximo(materializacao) {
    const comando = materializacao.comandos[materializacao.indice];
    if (!comando) return finalizar(materializacao, 'concluida');

    validarComando(comando);
    const cwd = resolverNoWorkspace(path.dirname(materializacao.raiz), path.basename(materializacao.raiz));
    const runId = randomUUID();
    const agora = new Date().toISOString();
    stmts.inserirRun.run({ id: runId, project_id: materializacao.projetoId, comando_id: comando.id, cmd: comando.cmd, args_json: JSON.stringify(comando.args), cwd, agora });

    comando.runId = runId;
    comando.estado = 'rodando';
    materializacao.estado = 'rodando';

    const pendentes = [];
    const despejar = () => {
      if (pendentes.length === 0) return;
      const lote = pendentes.splice(0, pendentes.length);
      gravarComCuidado(() => gravarLogs(runId, lote), { runId });
    };

    const { processo, terminou } = executar({
      cmd: comando.cmd,
      args: comando.args,
      cwd,
      timeoutMs: comando.timeoutMs,
      longaDuracao: comando.longaDuracao,
      onLinha: (stream, linha) => {
        const evento = { tipo: 'linha', stream, linha, ts: new Date().toISOString() };
        pendentes.push({ stream, linha, ts: evento.ts });
        if (pendentes.length >= 50) despejar();
        transmissor.publicar(runId, evento);
      },
    });
    processos.set(runId, processo);

    const concluir = (resultado) => {
      despejar();
      processos.delete(runId);
      comando.estado = resultado.estado;
      comando.exitCode = resultado.exitCode;
      comando.erro = resultado.erro;
      gravarComCuidado(() => stmts.fecharRun.run({ id: runId, estado: resultado.estado, exit_code: resultado.exitCode, agora: new Date().toISOString() }), { runId });
      transmissor.publicar(runId, { tipo: 'fim', estado: resultado.estado, exitCode: resultado.exitCode, erro: resultado.erro });
      if (encerrado) return;

      const deuCerto = resultado.estado === 'sucesso' || resultado.estado === 'cancelado';
      registrarEvento(deuCerto ? 'comando.executado' : 'comando.falhou', { comandoId: comando.id, estado: resultado.estado, exitCode: resultado.exitCode }, materializacao.projetoId);

      // Comando obrigatório que falha para a fila e espera decisão humana (RN-05.5). Comando
      // opcional que falha fica registrado e o fluxo segue: exigir decisão sobre algo que o
      // próprio preset marcou como dispensável só adicionaria carga mental.
      if (deuCerto || !comando.obrigatorio) {
        materializacao.indice += 1;
        rodarProximo(materializacao);
        return;
      }
      materializacao.estado = 'parado_em_falha';
    };

    if (comando.longaDuracao) {
      // Processo destacado: não seguramos a fila esperando um dev server que nunca termina.
      comando.estado = 'rodando';
      terminou.then((resultado) => {
        despejar();
        processos.delete(runId);
        gravarComCuidado(() => stmts.fecharRun.run({ id: runId, estado: resultado.estado, exit_code: resultado.exitCode, agora: new Date().toISOString() }), { runId });
        transmissor.publicar(runId, { tipo: 'fim', estado: resultado.estado, exitCode: resultado.exitCode, erro: resultado.erro });
        if (comando.estado === 'rodando') comando.estado = resultado.estado;
      });
      registrarEvento('comando.executado', { comandoId: comando.id, estado: 'rodando', exitCode: null }, materializacao.projetoId);
      materializacao.indice += 1;
      rodarProximo(materializacao);
      return;
    }

    terminou.then(concluir);
  }

  async function materializar({ projeto, preset, plano }) {
    if (emAndamento.has(projeto.id) && !['concluida', 'abortada'].includes(emAndamento.get(projeto.id).estado)) {
      throw new ErroForge('FORGE_CONFLICT', 'Este projeto já está sendo materializado.');
    }

    const ferramentas = await checarRequisitos(preset, process.cwd());
    const ausentes = ferramentas.filter((ferramenta) => !ferramenta.ok);
    if (ausentes.length > 0) {
      throw new ErroForge('FORGE_TOOL_MISSING', `Falta instalar: ${ausentes.map((f) => f.bin).join(', ')}.`, { ferramentas });
    }

    const arquivos = escreverArquivos(plano);
    const materializacao = {
      projetoId: projeto.id,
      raiz: plano.raiz,
      estado: 'escrevendo',
      arquivos,
      comandos: plano.comandos.map((comando) => ({ ...comando, estado: 'pendente', runId: null, exitCode: null, erro: null })),
      indice: 0,
      iniciadaEm: new Date().toISOString(),
      terminadaEm: null,
    };
    emAndamento.set(projeto.id, materializacao);
    rodarProximo(materializacao);
    return publico(materializacao);
  }

  function decidir(projetoId, acao) {
    const materializacao = emAndamento.get(projetoId);
    if (!materializacao) throw new ErroForge('FORGE_NOT_FOUND', 'Não há materialização em andamento para este projeto.');
    if (materializacao.estado !== 'parado_em_falha') {
      throw erroCampo('acao', 'Só dá para decidir quando a materialização está parada em uma falha.');
    }
    const comando = materializacao.comandos[materializacao.indice];
    if (acao === 'abortar') {
      finalizar(materializacao, 'abortada');
      return publico(materializacao);
    }
    if (acao === 'pular') {
      comando.estado = 'pulado';
      materializacao.indice += 1;
    } else {
      comando.estado = 'pendente';
      comando.exitCode = null;
      comando.erro = null;
    }
    rodarProximo(materializacao);
    return publico(materializacao);
  }

  function pararRun(runId) {
    const linha = stmts.run.get(runId);
    if (!linha) throw new ErroForge('FORGE_NOT_FOUND', 'Execução não encontrada.');
    const processo = processos.get(runId);
    if (linha.estado !== 'rodando' || !processo) throw erroCampo('runId', 'Essa execução já terminou.');
    pararProcesso(processo);
    return { runId, estado: 'cancelado' };
  }

  function encerrarTudo() {
    encerrado = true;
    for (const processo of processos.values()) pararProcesso(processo);
    processos.clear();
  }

  return { materializar, obter, decidir, pararRun, encerrarTudo, checarRequisitos: (preset) => checarRequisitos(preset, process.cwd()) };
}

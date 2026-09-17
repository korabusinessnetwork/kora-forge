// Resumo do diagnóstico que pode sair da máquina (ADR-014, C8). Só título, severidade e contagens:
// nenhum caminho, nenhum conteúdo de arquivo. Serializado como JSON, que é dado e não prosa, na
// ordem do diagnóstico. A redação do pedido fica no template versionado.
export function resumirParaModelo(sinais) {
  const lista = Array.isArray(sinais) ? sinais : [];
  return JSON.stringify(
    lista.map((sinal) => ({
      titulo: sinal.titulo,
      severidade: sinal.severidade,
      arquivos: sinal.total,
      ocorrencias: sinal.ocorrencias,
      unidade: sinal.unidade,
    })),
    null,
    2,
  );
}

// O documento de design que vale para o plano, dada a escolha feita na etapa Design do wizard.
//
// A escolha não é um campo: "usar o padrão Kora" é a etapa em `assumidas`, "usar o desenho do
// Studio" é a etapa em `etapasConcluidas`. Com o padrão escolhido, o documento salvo fica guardado
// mas não entra no plano, e é isso que faz assumir o padrão gerar o mesmo plano de um projeto que
// nunca abriu o Studio (Fase 2, bloco 5). Função pura: um lugar só decide, e o gerador consulta.
export function designEfetivo(blueprintPayload, design) {
  if (!design) return null;
  if (blueprintPayload.assumidas.includes('design')) return null;
  return design;
}

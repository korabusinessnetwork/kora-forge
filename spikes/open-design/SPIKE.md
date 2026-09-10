# Spike, Open Design como motor de design do Forge

> ## ⚠️ ESTE SPIKE NÃO FOI EXECUTADO
>
> Decisão do dono nesta rodada: levantamento documental, sem instalar nada e sem gastar token.
> **Portanto este arquivo é um roteiro, não uma prova.** Nenhum tempo, nenhuma saída e nenhum
> comando abaixo foi verificado nesta máquina.
>
> O **ADR-011** depende deste spike ser executado para sair de Proposto. Enquanto esta seção
> estiver aqui, a resposta para "é viável?" é **não sabemos**, e não "sim".

**Objetivo quando for executado**: provar ou refutar que dá para, no Windows, instalar o Open
Design, gerar uma landing page a partir de um `DESIGN.md` produzido pelo Forge, e exportar HTML e
PDF, de forma reproduzível e com tempo aceitável.

**Ambiente alvo**: Windows 11 Pro, PowerShell 7, conforme T-02.

---

## 1. O que este spike precisa responder

Estas são as perguntas que o ADR-011 deixou em aberto. Um spike que rode e não responda a elas não
serviu para nada.

| # | Pergunta | Por que trava a decisão |
|---|---|---|
| P-01 | Dá para instalar no Windows **sem** build da fonte? | A fonte exige Node ~24 e pnpm 10.33.x, contra o Node 20 do Forge. Ver RD-06 |
| P-02 | A CLI `od` fica no PATH depois da instalação do app empacotado? | O `install-guide.md` não documenta Windows nem a CLI. Ver RD-02 |
| P-03 | Existe caminho **headless de verdade**, sem abrir a interface? | É a premissa inteira do adapter |
| P-04 | O daemon aceita `DESIGN.md` externo como contrato de marca? | É o formato de handoff proposto |
| P-05 | Quanto tempo leva uma geração completa e uma exportação? | Define o `timeoutMs`. Ver RD-05 |
| P-06 | Quanto custa em token uma geração? | Ver RD-04 e C-02 |
| P-07 | Qual a licença efetiva do HTML exportado, com assets inlined? | Ver RD-03 |
| P-08 | O daemon respeita `127.0.0.1` e o que ele grava em disco, onde? | Ver RD-07 |
| P-09 | Qual a versão exata testada? | Fixa a `faixaSuportada` do adapter |

---

## 2. Pré-requisitos a conferir antes de começar

```powershell
$PSVersionTable.PSVersion
node --version
git --version
```

Esperado: PowerShell 7 ou superior, e Node presente. **O Node do Forge é 20 e não deve ser
atualizado por causa deste spike.** Se o Open Design exigir Node 24, isso é resposta a P-01, não um
problema a contornar.

---

## 3. Caminho A, app empacotado para Windows (preferido)

O README anuncia binário para Windows x64. É o caminho que não mexe no ambiente do Forge.

```powershell
$spike = "C:\Users\bonas\OneDrive\Documentos\Projetos\Kora-forge\spikes\open-design"
Set-Location $spike
New-Item -ItemType Directory -Force -Path "$spike\gerado" | Out-Null
```

Baixar o instalador de Windows a partir de https://github.com/nexu-io/open-design/releases,
anotando **a versão exata baixada** (responde P-09). Instalar. Em seguida:

```powershell
# P-02, a CLI existe e está no PATH?
Get-Command od -ErrorAction SilentlyContinue
od --version
```

Se `Get-Command od` não devolver nada, **P-02 falhou** e a instalação da CLI precisa ser
investigada antes de continuar. Registrar isso é um resultado válido do spike.

```powershell
# P-08, o daemon está de pé e em que endereço
Get-NetTCPConnection -LocalPort 7456 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, State, OwningProcess
```

Esperado: `LocalAddress` igual a `127.0.0.1`. Qualquer `0.0.0.0` é achado de segurança e vai direto
para RD-07.

```powershell
# Superfície da CLI, para comparar com o que o README anuncia
od --help
od project list
od skills list
```

## 4. Caminho B, Docker (alternativa se o A falhar)

```powershell
docker --version
Set-Location $spike
docker compose up -d
Start-Process "http://127.0.0.1:7456"
```

O `install-guide.md` documenta `OPEN_DESIGN_PORT`, `OPEN_DESIGN_ALLOWED_ORIGINS`,
`OPEN_DESIGN_MEM_LIMIT` e `NODE_OPTIONS`. Se o caminho B for o escolhido, medir também o tamanho da
imagem, que entra em RD-06:

```powershell
docker image ls | Select-String "open-design"
```

## 5. Caminho C, build da fonte

**Descartado de propósito.** Exige Node ~24 e pnpm 10.33.x, o que conflita com o Node 20 do Forge,
T-03. Só executar se A e B falharem, e mesmo assim apenas para responder P-01, nunca como caminho
de integração.

---

## 6. A geração

O arquivo de entrada do teste é `spikes/open-design/DESIGN.md`, ao lado deste. Ele foi escrito no
formato de nove seções que o ADR-011 propõe como handoff, com uma marca fictícia, justamente para
testar a regra white-label: **se o nome fictício vazar para fora dos tokens no HTML gerado, isso é
um achado.**

```powershell
Set-Location $spike
Get-Content .\DESIGN.md | Select-Object -First 20
```

Colocar o `DESIGN.md` como contrato de marca ativo e disparar a geração. **Os comandos exatos são
desconhecidos** e descobri-los é o coração de P-03 e P-04. Os três candidatos, em ordem de
preferência para o Forge:

**Candidato 1, HTTP direto**, que é a superfície real segundo o levantamento:

```powershell
$corpo = @{ prompt = (Get-Content .\DESIGN.md -Raw); kind = "landing" } | ConvertTo-Json -Depth 5
Measure-Command {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:7456/api/runs" -Method Post `
        -ContentType "application/json" -Body $corpo
  $r | ConvertTo-Json -Depth 5 | Set-Content .\gerado\run.json -Encoding utf8
}
```

> O shape de `POST /api/runs` **não está documentado**. O corpo acima é chute e provavelmente está
> errado. Descobrir o shape real, olhando o tráfego da interface ou o código do daemon, faz parte do
> spike.

**Candidato 2, MCP**, `start_run` é proxy do endpoint acima:

```powershell
od mcp install claude-code
```

E então disparar a partir do Claude Code, usando `start_run` e depois `get_artifact`.

**Candidato 3, interface gráfica**, só para estabelecer o caso base e ver o que a rede faz. Se
**apenas** este funcionar, **P-03 falhou e o adapter morre**, porque o Forge não vai pilotar uma
janela.

## 7. A exportação

```powershell
Measure-Command { od lint }   # 0.20.0, checagem de artefato em ambiente headless
```

Exportar HTML e PDF. Comando exato a descobrir, mesma situação de P-03. Depois:

```powershell
Get-ChildItem .\gerado -Recurse |
  Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
```

Conferência de RD-03, procurar atribuição de licença dentro do HTML exportado:

```powershell
Select-String -Path .\gerado\*.html -Pattern "MIT|Apache|Copyright|guizang|html-ppt" |
  Select-Object LineNumber, Line
```

Conferência da regra white-label, o nome fictício não pode aparecer fora dos tokens:

```powershell
Select-String -Path .\gerado\*.html -Pattern "Vetro" | Measure-Object
```

---

## 8. Tabela de resultados, a preencher quando executar

| Item | Medido | Observação |
|---|---|---|
| Versão instalada | — | |
| Caminho de instalação usado (A, B ou C) | — | |
| `od` no PATH | — | P-02 |
| Daemon em 127.0.0.1 | — | P-08 |
| Tempo de instalação | — | |
| Tempo da geração | — | P-05 |
| Tempo da exportação HTML | — | P-05 |
| Tempo da exportação PDF | — | P-05 |
| Tamanho do HTML exportado | — | |
| Custo em USD da geração | — | P-06 |
| Modelo usado | — | |
| Geração 100% headless | — | P-03, é o item eliminatório |
| `DESIGN.md` externo aceito | — | P-04 |
| Licenças encontradas no HTML | — | P-07 |
| Vazamento da marca fictícia | — | white-label |
| Espaço em disco total | — | RD-06 |

## 9. Critério de sucesso

**Aprova** se: instalou no Windows sem build da fonte, a geração rodou sem interface, o `DESIGN.md`
do Forge foi respeitado, HTML e PDF saíram, e o total ficou abaixo de dez minutos e de um dólar.

**Reprova** se qualquer um destes acontecer: geração só funciona pela interface gráfica, exige conta
ou login, exige Node 24 no ambiente do Forge, o daemon escuta fora de `127.0.0.1`, ou a marca
fictícia vaza hardcodada para o HTML.

Reprovado, o ADR-011 vira **opção (a), não integrar**, e o `DESIGN.md` fica de pé sozinho como
entrega do Forge, que é a parte que valia a pena de qualquer jeito.

## 10. Limpeza

```powershell
Remove-Item -Recurse -Force "$spike\gerado" -ErrorAction SilentlyContinue
docker compose down -v   # se tiver usado o caminho B
```

Desinstalar o app pelo Painel de Controle e conferir o que sobrou em disco, que também é dado de
RD-06 e RD-07.

/**
 * Versão da Microsoft Store (pacote MSIX). Mesmo código do instalador comum, mas
 * dentro do pacote algumas coisas são do Windows/da Store:
 * - atualizações: a Store instala sozinha (o atualizador do app fica desligado);
 * - abrir com o Windows e Jump List: as APIs comuns não valem dentro do MSIX.
 */
export function isStoreBuild(): boolean {
  return process.windowsStore === true;
}

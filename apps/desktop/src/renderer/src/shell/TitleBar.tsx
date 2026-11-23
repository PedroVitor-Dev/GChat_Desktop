import logo from '../../../../resources/icon.png';
import { SHELL_LAYOUT } from '../../../shared/shell';

/**
 * Barra de título própria. Os botões minimizar/maximizar/fechar são os nativos do
 * Windows (titleBarOverlay), desenhados à direita sobre esta faixa.
 */
export function TitleBar({ title }: { title: string }) {
  return (
    <header
      className="drag bg-rail text-muted relative flex shrink-0 items-center px-3 text-xs font-semibold"
      style={{ height: SHELL_LAYOUT.titleBarHeight }}
    >
      <div className="flex items-center gap-2">
        <img src={logo} alt="" className="h-4 w-4" draggable={false} />
        <span className="text-interactive">GChat Desktop+</span>
      </div>
      <span className="absolute left-1/2 max-w-[40%] -translate-x-1/2 truncate">{title}</span>
    </header>
  );
}

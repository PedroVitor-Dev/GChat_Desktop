import { useEffect, useState } from 'react';
import type { ShellState } from '../../../shared/shell';

/** Estado da janela principal, mantido pelo main e enviado por push. */
export function useShellState(): ShellState | null {
  const [state, setState] = useState<ShellState | null>(null);
  useEffect(() => {
    let alive = true;
    void window.gchat.shell.getState().then((s) => alive && setState(s));
    const off = window.gchat.shell.onState((s) => alive && setState(s));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

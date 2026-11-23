import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AppInfo } from '../../../shared/ipc';
import logo from '../../../../resources/icon.png';
import { Card } from '../components/Card';

const AUTHOR = 'PedroVitor-Dev';
const AUTHOR_URL = 'https://github.com/PedroVitor-Dev';

export function AboutPage() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.gchat.getAppInfo().then(setInfo, () => setError(true));
  }, []);

  const rows: [string, string | undefined][] = [
    ['Versão', info?.version],
    ['Electron', info?.electron],
    ['Chromium', info?.chrome],
    ['Plataforma', info?.platform],
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <img src={logo} alt="" className="h-16 w-16 shrink-0" draggable={false} />
          <div>
            <p className="text-lg font-semibold">GChat Desktop+</p>
            <p className="text-muted mt-0.5">
              Cliente do Google Chat para Windows. Não é afiliado ao Google.
            </p>
            <p className="mt-2">
              Criado pelo{' '}
              {/* Abre no navegador padrão (as janelas locais não navegam para fora). */}
              <a
                href={AUTHOR_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex items-center gap-1 font-medium hover:underline"
              >
                {AUTHOR}
                <ExternalLink size={12} aria-hidden />
              </a>{' '}
              <span aria-hidden>🧙</span>
            </p>
          </div>
        </div>
      </Card>
      <Card>
        {error ? (
          <p className="text-muted">Não foi possível obter as informações do aplicativo.</p>
        ) : (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="font-mono text-[13px] select-text">{value ?? '…'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
      <p className="text-muted text-xs">Licença GPL-3.0.</p>
    </div>
  );
}

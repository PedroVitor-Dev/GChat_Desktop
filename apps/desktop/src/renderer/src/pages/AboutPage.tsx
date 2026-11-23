import { useEffect, useState } from 'react';
import type { AppInfo } from '../../../shared/ipc';
import { Card } from '../components/Card';

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
    <div className="space-y-4">
      <Card>
        <p className="text-base font-semibold">GChat Desktop+</p>
        <p className="text-muted mt-1">
          Companheiro do Google Chat para Windows. Não é afiliado ao Google.
        </p>
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

import { useCallback, useEffect, useState } from 'react';
import type { Settings, SettingsPatch } from '../../../shared/settings';

/** Configurações atuais + função de atualização. O main é a fonte de verdade. */
export function useSettings(): [Settings | null, (patch: SettingsPatch) => void] {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let alive = true;
    void window.gchat.getSettings().then((s) => alive && setSettings(s));
    const off = window.gchat.onSettingsChanged((s) => alive && setSettings(s));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const update = useCallback((patch: SettingsPatch) => {
    void window.gchat.updateSettings(patch).then(setSettings);
  }, []);

  return [settings, update];
}

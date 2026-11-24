import { useState } from 'react';
import logo from '../../../../resources/icon.png';

const TIPS = [
  'Ctrl + , abre e fecha as configurações.',
  'Você pode escolher um som diferente para cada conversa em Configurações → Sons.',
  'O botão “Silenciar conversa” na notificação silencia direto, sem abrir o app.',
  'Ctrl + R recarrega o Google Chat.',
  'Fechar a janela mantém o app na bandeja, avisando sobre novas mensagens. Ctrl + Q sai de vez.',
  'Configure o horário de silêncio para não ser incomodado à noite.',
  'Fixe as conversas do dia a dia no painel Fixados (alfinete no trilho). Alt + 1…9 abre as primeiras.',
];

/**
 * Área do Chat por trás da view. Aparece enquanto o Google Chat carrega
 * (a view só é exibida após o primeiro carregamento, sem flash branco).
 */
export function ChatPlaceholder({ loading }: { loading: boolean }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  return (
    <div className="bg-content flex flex-1 items-center justify-center rounded-tl-lg">
      {loading && (
        <div className="flex max-w-sm animate-[fade-in_400ms_ease] flex-col items-center text-center">
          <img
            src={logo}
            alt=""
            className="mb-6 h-20 w-20 animate-pulse drop-shadow-lg"
            draggable={false}
          />
          <p className="text-muted mb-1 text-xs font-bold tracking-wide uppercase">Você sabia?</p>
          <p className="text-ink">{tip}</p>
          <p className="text-muted mt-6 text-sm">Conectando ao Google Chat…</p>
        </div>
      )}
    </div>
  );
}

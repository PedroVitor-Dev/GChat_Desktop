import type { ComponentType } from 'react';
import {
  Bell,
  Info,
  type LucideIcon,
  Palette,
  Settings,
  Shield,
  Users,
  Volume2,
} from 'lucide-react';
import { AboutPage } from './pages/AboutPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PlannedPage } from './pages/PlannedPage';
import { PrivacyPage } from './pages/PrivacyPage';

export type SectionId =
  'geral' | 'notificacoes' | 'sons' | 'contas' | 'aparencia' | 'privacidade' | 'sobre';

interface Section {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  page: ComponentType;
}

const planned = (phase: string, items: string[]) => () => (
  <PlannedPage phase={phase} items={items} />
);

export const sections: Section[] = [
  {
    id: 'geral',
    label: 'Geral',
    icon: Settings,
    page: planned('Fase 6', [
      'Iniciar com o Windows',
      'Iniciar minimizado',
      'Minimizar para a bandeja ao fechar',
    ]),
  },
  {
    id: 'notificacoes',
    label: 'Notificações',
    icon: Bell,
    page: NotificationsPage,
  },
  {
    id: 'sons',
    label: 'Sons',
    icon: Volume2,
    page: planned('Fase 5', ['Som padrão e de menções', 'Importar MP3/WAV/OGG', 'Volume e prévia']),
  },
  {
    id: 'contas',
    label: 'Contas',
    icon: Users,
    page: planned('Fase 7', ['Várias contas Google, cada uma com sua sessão', 'Sair da conta']),
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    icon: Palette,
    page: planned('Fase 7', ['Tema claro, escuro ou do sistema']),
  },
  {
    id: 'privacidade',
    label: 'Privacidade',
    icon: Shield,
    page: PrivacyPage,
  },
  { id: 'sobre', label: 'Sobre', icon: Info, page: AboutPage },
];

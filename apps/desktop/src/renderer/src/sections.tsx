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
import { AccountsPage } from './pages/AccountsPage';
import { AppearancePage } from './pages/AppearancePage';
import { GeneralPage } from './pages/GeneralPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SoundsPage } from './pages/SoundsPage';

export type SectionId =
  'geral' | 'notificacoes' | 'sons' | 'contas' | 'aparencia' | 'privacidade' | 'sobre';

interface Section {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  page: ComponentType;
}

export const sections: Section[] = [
  {
    id: 'geral',
    label: 'Geral',
    icon: Settings,
    page: GeneralPage,
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
    page: SoundsPage,
  },
  {
    id: 'contas',
    label: 'Contas',
    icon: Users,
    page: AccountsPage,
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    icon: Palette,
    page: AppearancePage,
  },
  {
    id: 'privacidade',
    label: 'Privacidade',
    icon: Shield,
    page: PrivacyPage,
  },
  { id: 'sobre', label: 'Sobre', icon: Info, page: AboutPage },
];

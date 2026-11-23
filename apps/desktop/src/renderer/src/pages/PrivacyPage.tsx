import { Card } from '../components/Card';
import { SectionTitle, Toggle } from '../components/controls';
import { useSettings } from '../hooks/useSettings';

export function PrivacyPage() {
  const [settings, update] = useSettings();
  if (!settings) return null;
  const n = settings.notifications;

  return (
    <div className="max-w-2xl">
      <SectionTitle>Conteúdo das notificações</SectionTitle>
      <Card>
        <Toggle
          label="Mostrar remetente"
          description="Desligado: o aviso mostra apenas “Google Chat”."
          checked={n.showSender}
          onChange={(showSender) => update({ notifications: { showSender } })}
        />
        <Toggle
          label="Mostrar texto da mensagem"
          description="Desligado: o aviso mostra apenas “Nova mensagem”."
          checked={n.showPreview}
          onChange={(showPreview) => update({ notifications: { showPreview } })}
        />
      </Card>

      <SectionTitle>Seus dados</SectionTitle>
      <Card>
        <ul className="text-muted list-disc space-y-1.5 pl-5">
          <li>O login é feito na página oficial do Google. O app nunca vê sua senha.</li>
          <li>
            A sessão fica salva neste computador, protegida pela criptografia do Windows para o seu
            usuário.
          </li>
          <li>O texto das mensagens não é gravado em disco nem em logs.</li>
          <li>
            A foto e o nome da sua conta Google (os que o Chat mostra) ficam salvos só neste
            computador para aparecer no app. O e-mail não é lido.
          </li>
          <li>Nada é enviado a servidores além dos do próprio Google.</li>
        </ul>
      </Card>
    </div>
  );
}

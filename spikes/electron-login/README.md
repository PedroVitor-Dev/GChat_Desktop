# Sonda: login do Google dentro do Electron

Testa se dá para usar **só o app** (sem navegador e sem extensão). Usa o
user-agent padrão do Electron, sem nenhuma falsificação.

```bash
npx electron spikes/electron-login
```

Faça login normalmente. Resultados possíveis:

- **"Não foi possível fazer login. Este navegador ou app pode não ser seguro"** →
  bloqueado; "só o app" não é viável sem violar as regras do projeto.
- **Login conclui e o Chat abre** → viável hoje, mas sem garantia (o Google pode
  passar a bloquear a qualquer momento).

Para apagar a sessão de teste depois: `%APPDATA%\spike-electron-login`.

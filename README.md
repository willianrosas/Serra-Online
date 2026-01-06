# Serra MVP (server + client) — pronto para rodar no Windows

## Requisitos
- Node.js LTS instalado (https://nodejs.org)

## Rodar (PowerShell - recomendado)

### 1) Abrir 2 terminais PowerShell

#### Terminal 1 (SERVER)
```powershell
cd .\server
npm install
npm run dev
```
Deixe esse terminal rodando. Deve aparecer: `Server on :3001`

#### Terminal 2 (CLIENT)
```powershell
cd .\client
npm install
npm run dev
```
Vai mostrar uma URL (geralmente `http://localhost:5173`). Abra no navegador.

## Testar com 4 jogadores
- Abra a URL do client.
- Clique **Criar sala** (guarde o código).
- Abra mais 3 abas do navegador e entre com o código.
- Clique **Pronto** nas 4 abas para iniciar.

## Observações
- MVP roda 1 rodada (8 vazas). Encerra se alguém fizer 61 pontos ou se acabar a rodada.
- Trunfo é o naipe da última carta do baralho após embaralhar.

## Rodar com 2 cliques (Windows)
Dentro da pasta do projeto (onde tem `server/` e `client/`), dê duplo clique em:

- `start-serra.bat`

Ele vai abrir 2 janelas CMD:
- Serra Server (porta 3001)
- Serra Client (porta 5173)

Para parar, use `stop-serra.bat` ou feche as janelas (Ctrl+C).

- Tempo limite por jogada: 30 segundos (se expirar, o servidor joga automaticamente a carta mais fraca do jogador).

# DataManagment

Sistem financiar dhe analitik për agjenci turistike (shitje, pagesa, borxhe, fitim, fatura me TVSH, raporte, shumë-firma me superadministrator). I gatshëm për **GitHub** dhe **deploy në Vercel** me ruajtje të dhënash në **Vercel KV (Redis)**.

---

## 🗂️ Struktura

```
.
├─ api/[...path].js     # Pika hyrëse serverless për Vercel (/api/*)
├─ lib/handler.js       # Logjika e plotë (API, ruajtja, sesionet)
├─ public/              # Ballina (HTML, CSS, JS, foto) — statike
├─ server.js            # Serveri lokal për zhvillim (npm start)
├─ vercel.json          # Konfigurimi i Vercel
├─ .env.example         # Shembull i variablave të mjedisit
└─ package.json
```

Në zhvillim ruan te `data/db.json`. Në Vercel ruan në Vercel KV (Redis) — kalimi bëhet automatikisht kur ekzistojnë variablat `KV_REST_API_URL` dhe `KV_REST_API_TOKEN`.

---

## ▶️ Nisja lokale

Kërkohet Node.js 18+.

```bash
npm start
```

Hapni http://localhost:3000

(Nuk ka varsi / `npm install` nuk është i nevojshëm — përdor vetëm Node-in.)

---

## 🔑 Kredencialet fillestare

| Roli | Përdoruesi | Fjalëkalimi |
|------|-----------|-------------|
| Superadministrator | `urimi1806` | `1806` |
| Administrator firme | `admin.travelia` | `Travelia1806!` |
| Punëtor | `pun.travelia` | `Travelia1806!` |

> Ndryshojini fjalëkalimet pas hyrjes së parë.

---

## 🚀 Hapat: GitHub → Vercel → KV

### 1) Ngarko në GitHub
```bash
git init
git add .
git commit -m "DataManagment — versioni fillestar"
git branch -M main
git remote add origin https://github.com/<PERDORUESI>/<REPO>.git
git push -u origin main
```

### 2) Importo në Vercel
1. Hyni në https://vercel.com → **Add New… → Project**.
2. Zgjidhni repo-n nga GitHub → **Import**.
3. Framework Preset: **Other** (lëreni si është). Mos vendosni Build Command.
4. Klikoni **Deploy**. (Do funksionojë, por ende pa ruajtje të përhershme — shihni hapin 3.)

### 3) Shto bazën e të dhënave (Vercel KV / Redis)
1. Në projektin tuaj në Vercel → skeda **Storage** → **Create Database** → **KV (Redis / Upstash)**.
2. Jepini një emër dhe **Connect** te projekti (Production + Preview + Development).
3. Vercel shton automatikisht variablat `KV_REST_API_URL` dhe `KV_REST_API_TOKEN`.

### 4) Shto sekretin e sesionit
1. Vercel → Project → **Settings → Environment Variables**.
2. Shtoni:
   - **Name:** `SESSION_SECRET`
   - **Value:** një varg i gjatë i rastit (p.sh. gjeneroni me `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - Environment: Production, Preview, Development.

### 5) Rideploy
- Vercel → **Deployments** → menûja `…` te i fundit → **Redeploy**.
- Pas rideploy-it, të dhënat ruhen në KV dhe mbeten edhe pas rinisjeve.

---

## 🌐 Domain me nënfushë (subdomain) për secilin klient

Aplikacioni njeh firmën nga nënfusha (p.sh. `travelia.datapos.pro` → firma “Travelia”).
1. Vercel → Project → **Settings → Domains** → shtoni domain-in tuaj ose `*.datapos.pro` (wildcard).
2. Krijoni firmat nga superadministratori duke vendosur nënfushën përkatëse.

---

## 💡 Shënime teknike

- Sesionet përdorin **cookie të nënshkruar** (HMAC) — pa gjendje në server, i përshtatshëm për serverless.
- E gjithë baza ruhet si një objekt JSON në KV nën çelësin `datamanagment:db`.
- Trafik i ulët/mesatar: një biznes i vetëm pa shkrime konkurruese të rralla. Për ngarkesë të lartë rekomandohet bazë relacionale.

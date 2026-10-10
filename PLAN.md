# FF Sensitivity — Product Plan

> Tools app ke taur pe ship-ready; marketplace/community ke liye backend + admin baaki.  
> **Gyro skip** — Free Fire me gyro nahi hota.

---

## Partial (chal raha, lekin limited)

| Item | Status |
|------|--------|
| **Redeem codes** | Sample/demo, live inventory nahi |
| **Community share feed** | Sample cards |
| **Graphics** | Mostly RAM se quality; baaki fields fixed |
| **FPS** | Auto Hz se; manual override nahi |
| **Profile / Attachments** | Formula me default (`1.0` / `0`), wizard me step nahi |
| **Shop packs** | Kuch packs disabled |

---

## Missing

| Item | Notes |
|------|--------|
| **App Settings screen** | Theme/language/prefs UI nahi |
| **Push notifications** | FCM / local — pending |
| **Real admin panel / backend** | Codes, shop, community server-side |
| **Live redeem delivery / real community** | Abhi local/sample only |

---

## New features (FF ke hisaab se)

1. **Manual FPS** (60 / 90 / 120) — auto galat ho to fix  
2. **App Settings** — language, last playstyle save, clear data  
3. **Profile + attachments** wizard steps (formula ready)  
4. **Saved presets** — device pe last sensi save  
5. **Apply guide** — FF me kahan kya set karna hai  
6. **Admin + live codes + push** — baad me best  
7. **Sensitivity practice / trainer** mini drill  
8. **Daily Challenge streak + scratch** — admin-configurable (see below)  

---

## Daily Challenge + scratch (retention) — admin-configurable

> Full detail: web admin plan Phase 5 (`web_admin_panel_016c06e4`).

**Defaults (admin override, no APK needed):**

| Rule | Default |
|------|---------|
| Challenge complete → scratch | **1 card / user / day** |
| Card expire | Same calendar day (miss = gone) |
| Miss day | Streak **reset to 0** |
| Streak target | **7 days** → bonus scratch (higher gift odds) |
| Scratch outcomes | Coins **or** real Play gift **or** better luck |
| Ads on scratch/gift | **No** |
| Coins → buy scratch (with gift) | **No** |
| Diamonds in shop/scratch | **No** |
| Redeem gate | Same: challenge done → then redeem scratch |

Admin sets: odds %, streak length, expire policy, gift pool stock, coin reward range.

---

## User account profile (app + admin)

> Alag cheez: upar wala **Profile + attachments** sensi formula wizard hai. Yeh **Google account profile** hai — name, Gmail, device, FF UID.

Abhi: admin **Users** list + right drawer (masked email, 1 device, coins, 7d journey). App me Profile screen nahi — sirf Google name + Sign out.

### 1. Admin — full user page (`/users/[id]`)

List se click → dedicated page (drawer se zyada space). Super admin **poori Gmail** dekh sakta hai (staff ko mask reh sakta hai).

| Block | Admin dekhega |
|-------|----------------|
| Identity | Name, full Gmail, Google photo, status, joined, last login, ops note |
| Devices | Brand/model, Android, install id, app version, last seen, push on/off, blocked; multiple installs |
| Economy | Coins, streak / last check-in, wallet frozen, claims, ledger, scratch rolls |
| Usage | Last 7–30d screens + app_open / login / logout / scratch / redeem |
| Support | Us user ke tickets |

**Mat dikhao:** password (Google login), full FCM token, Google recovery.

Actions (pehle se Users pe hain): Restrict / Suspend / Restore / Delete-after-suspend (Gmail banned).

### 2. App — Profile (drawer se)

Google se auto: name, Gmail (lock), photo.

| User add/edit kare | Kyun |
|--------------------|------|
| Display name | In-app naam |
| Free Fire UID / IGN | Redeem + support |
| Role (Rush / Sniper / …) | Sensi suggest |
| Region / server | India, BR, etc. |
| Notification on/off | Push |

Read-only: coins, streak. Actions: Sign out, Delete account (Play).

**Mat lo:** phone, address, age, password.

App save ↔ Nest ↔ admin page same fields.

### Build order

1. Admin full page + Super Admin unmask Gmail (data pehle se Nest me hai)  
2. App Profile screen + drawer entry  
3. FF UID / role / region save + admin pe dikhao  

---

## Auto notify on content update (admin-controlled)

> Abhi Push desk **manual campaign** hai (compose → Send). Yeh **naya**: admin content save kare to users ko **auto FCM** jaaye — **sirf tab** jab checkbox ON ho. Notification ka **text admin edit** kare.

### Admin UI (Push page pe block)

| Control | Kya kare |
|---------|----------|
| **Auto notify users** (checkbox) | ON = eligible Save pe push; OFF = silent update, koi ping nahi |
| **Title** | Tray heading — admin likhe / baad me edit kare |
| **Body** | Tray text — admin likhe / baad me edit kare |
| **Open screen** | Tap pe Redeem / Home / Challenge / Names / … |
| **Save settings** | Checkbox + title + body pehle save; later content Saves **usi text** se bhejein |

Har save pe naya campaign compose nahi. Text **template** hai. User ko jo dikhega woh **yahi title + body** hai.

Default: checkbox **OFF** (galti se blast na ho). Title/body length = existing push limits.

### Flow

```
Admin Redeem / Names / Challenge / Shop / Scratch / Promos / Copy  →  SAVE
        ↓
Content DB me save (pehle jaisa)
        ↓
Auto-notify OFF  →  stop (users ko kuch nahi)
Auto-notify ON   →  FCM send
        ↓
Title + body jo admin ne last save kiya
Audience: All devices with push token (pushEnabled)
        ↓
Phone tray + existing Push inbox
Tap → chosen deep link screen
```

User kuch extra nahi karega. Device token app open pe pehle se register hota hai.

### Kab bhejna (user-facing content)

| Module | Trigger |
|--------|---------|
| Redeem | naya / edit / ACTIVE scratch ya code |
| Names | naya name pack |
| Daily challenge | naya quiz / reward |
| Shop | naya item |
| Scratch prizes | prize change |
| Promos / copy | home copy change |

### Kab nahi (spam + galat)

- Users restrict / suspend / note
- Ads on/off, coin min/max typo, paused/draft
- Staff, audit, settings, devices
- Har chhoti field pe ping

### Safety

- **Cooldown:** same module pe **1 auto-push / 60 min** (10 Saves = 1 notification)
- FCM fail se **content save fail nahi** hona
- Sirf `pushEnabled` devices
- Reuse existing FCM + inbox + deep-link allowlist (naya app UI nahi)

### Build order

1. Admin: checkbox + editable title/body + open-screen + save  
2. Nest: settings store + send-on-eligible-save + cooldown  
3. E2E: OFF = no send; ON = send admin text; cooldown holds; save still OK if FCM down  

---

## Suggested order

1. Manual FPS + App Settings (quick user wins)  
2. Profile + attachments wizard steps  
3. Saved presets + Apply guide  
4. Admin + live redeem + community + push  
5. Daily Challenge / scratch config (admin Phase 5)  
6. **Admin full user page** (Gmail + device + economy + journey ek jagah)  
7. **App Profile** (Google lock + FF UID / role / region + sign out / delete)  
8. **Auto notify on content update** (checkbox + admin-editable title/body + cooldown)  

---

## Out of scope

- Gyro On/Off (FF me nahi)
- Ad → coins → Play gift / diamonds loop

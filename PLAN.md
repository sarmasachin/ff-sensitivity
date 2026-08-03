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

## Suggested order

1. Manual FPS + App Settings (quick user wins)  
2. Profile + attachments wizard steps  
3. Saved presets + Apply guide  
4. Admin + live redeem + community + push  
5. Daily Challenge / scratch config (admin Phase 5)  

---

## Out of scope

- Gyro On/Off (FF me nahi)
- Ad → coins → Play gift / diamonds loop

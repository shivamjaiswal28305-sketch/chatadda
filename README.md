# ChatAdda — Real-time Chat Web App

Account banao (username + phone number + password), login karo, aur real-time
chat karo — public "Adda Room" mein sabke saath, ya kisi ek se private mein.

## Kya-kya hai isme
- **Accounts** — phone number + password se signup/login (JWT token se session)
- **Public group chat** ("Adda Room") + **Private 1-on-1 chat**
- **Message history** — MongoDB mein save hoti hai, dobara login karne pe purani chat wapas milti hai
- **Media sharing** — photo (built-in editor ke saath: crop/rotate/filter/draw/text), document, voice message, location, contact — sab Cloudinary pe store hote hain
- **Reply / Forward / Pin / Edit / Delete for everyone**
- **Emoji reactions**
- **In-chat search**
- **Read receipts** (✓✓) aur **typing indicator**
- **Profile photo (DP)**, online/last-seen status
- **Web Push notifications** (app band hone par bhi naya message ka notification)
- **Audio & Video Call** (WebRTC, Instagram-style filters ke saath)
- **Block / Report** kisi user ko
- 6 app themes + chat wallpapers, dark mode
- PWA — phone pe "install" karke app jaisa use ho sakta hai

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT auth, bcrypt
- **Media storage**: Cloudinary
- **Push notifications**: Web Push API (VAPID)
- **Frontend**: Plain HTML/CSS/JS (koi framework nahi), WebRTC for calls

## Folder Structure
```
├── server.js              # Main backend entry point
├── package.json
├── routes/
│   ├── auth.js             # Signup/login (JWT)
│   └── upload.js           # File upload (Cloudinary) — login required
├── models/
│   ├── User.js
│   ├── Message.js
│   └── PushSubscription.js
├── config/
│   └── cloudinary.js
└── public/                 # Frontend
    ├── index.html
    ├── client.js
    ├── style.css
    ├── sw.js                # Service worker (push + offline cache)
    ├── manifest.json
    ├── robots.txt
    └── sitemap.xml
```

## Environment Variables (zaroori)

Ye sab Render dashboard → **Environment** tab mein set karne hain (ya local
`.env` file mein agar apne computer pe test kar rahe ho):

| Variable | Kis liye | Zaroori? |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ Haan |
| `JWT_SECRET` | Login token secure banane ke liye — koi bhi random 32+ character string | ✅ Haan (bina iske server start hi nahi hoga) |
| `CLOUDINARY_CLOUD_NAME` | Photo/file/voice uploads ke liye | ✅ Haan |
| `CLOUDINARY_API_KEY` | Cloudinary account key | ✅ Haan |
| `CLOUDINARY_API_SECRET` | Cloudinary account secret | ✅ Haan |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push notifications ke liye | Optional — na ho to push notifications bas kaam nahi karengi, baaki sab chalega |
| `PORT` | Server kis port pe chale | Optional — Render khud set karta hai |

> ⚠️ Kisi bhi variable ki value seedha code mein kabhi mat likhna — hamesha
> Render ke Environment tab se hi set karo.

## Local pe test karna (optional)
1. [Node.js](https://nodejs.org) install karo (LTS version).
2. Is folder mein ek `.env` file banao aur upar wale variables usmein daalo.
3. Terminal mein:
   ```
   npm install
   npm start
   ```
4. Browser mein `http://localhost:3000` kholo.

## Render pe deploy karna
1. Code GitHub repo mein push/upload karo.
2. [render.com](https://render.com) → **New +** → **Web Service** → apna repo select karo.
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (ya jo bhi chaho)
4. Upar wale saare Environment Variables **Environment** tab mein add karo.
5. **Create Web Service** → 2-3 minute mein deploy ho jayega.
6. Deploy hone ke baad `public/robots.txt` aur `public/sitemap.xml` mein jo
   `YOUR-SITE-NAME.onrender.com` likha hai use apne asli live URL se replace
   karke phir se deploy karo.

> ⚠️ Free plan pe 15 minute inactivity ke baad service "so" jaati hai —
> agli request pe 30-50 second lag sakta hai. Ye normal hai.

## Reports kaise dekhein
`reportUser` se aaye reports server ke `reports.json` file mein save hote
hain. **Render ke free plan pe disk temporary hai** — restart/redeploy pe ye
file delete ho jaati hai. Agar reports permanently chahiye, to inhe bhi
MongoDB mein save karwaya ja sakta hai (abhi sirf messages/users DB mein
hain).

## Security
- Sab REST/socket routes login-protected hain (private chat history, file
  uploads, user list — sab ke liye valid login token chahiye).
- Login/signup/upload pe rate limiting hai (bots/brute-force se bachne ke liye).
- Photo/file/voice ka URL server pe validate hota hai (sirf apne Cloudinary
  account se aayi URLs accept hoti hain).
- Passwords bcrypt se hash hoke store hote hain, kabhi plain text mein nahi.

## Safety note (users ke liye)
- Apna real address kisi ajnabi ko na do.
- Kisi bhi galat/abusive behaviour ko **Block** ya **Report** karo — dono
  options har private chat ke ⋮ menu mein milte hain.

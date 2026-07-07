# ChatAdda — Live Chat Website

Sirf username daalo aur real-time chat karo. Koi login/signup nahi, koi database nahi — bilkul simple.

## Kya hai isme
- `server.js` — backend (Node.js + Express + Socket.io)
- `public/` — frontend (HTML, CSS, JS)
- Real-time public group chat ("Adda Room")
- **Private 1-on-1 chat** — sidebar me kisi bhi online user ke naam pe click karo
- **Audio & Video Call** — private chat khol ke 🎤 Call ya 📹 Video button dabao. Call jitni der chaho utni der chal sakti hai, koi time limit nahi hai (WebRTC seedha dono browsers ke beech connect karta hai)
- **Block** — kisi ko block karo to unke messages (public aur private dono) hide ho jayenge, aur aap unhe message nahi bhej paoge. Ye setting is browser me save rehti hai.
- **Report** — kisi user ko report karo (wajah ke saath), report `reports.json` file me server pe save hoti hai jise aap khud check kar sakte ho
- Online users list, typing indicator

## Call feature ke liye zaroori baatein
- Browser camera/mic permission mangega — allow karna padega
- Calling sirf **HTTPS** pe kaam karti hai (Render automatically HTTPS deta hai, isliye live site pe dikkat nahi hogi). `localhost` pe testing bhi chal jaati hai.
- Ye 2 logo ke beech seedha peer-to-peer connection banata hai (free public STUN server ka use karke). **Zyadatar home wifi aur mobile data** pe ye seedha kaam kar jayega.
- Kuch strict networks (office/college wifi, kuch corporate firewalls) me seedha connection nahi ban pata — unhe ek "TURN server" chahiye hota hai jo relay ka kaam karta hai. Free reliable TURN service available nahi hai; agar zyada log strict networks se use karenge to future me ek paid TURN service (jaise Twilio ya Metered.ca) jodwana padega — abhi ke liye free setup me ye edge case hai, baaki sab normal networks pe call chalegi.

---

## Step 1: Apne computer pe test karo (optional par recommended)

1. [Node.js](https://nodejs.org) install karo (agar nahi hai) — "LTS" version download karo.
2. Terminal/Command Prompt me is folder me jao:
   ```
   cd chatapp
   npm install
   npm start
   ```
3. Browser me kholo: `http://localhost:3000`
4. Do alag tabs/browsers me kholo aur test karo ki chat real-time me kaam kar raha hai.

---

## Step 2: FREE me live karo (koi bhi use kar sake) — Render.com

Render.com free plan pe Node.js apps host karta hai (WebSocket bhi support karta hai, jo hume chahiye).

### 2.1 — GitHub pe code daalo
1. [github.com](https://github.com) pe free account banao (agar nahi hai).
2. Naya repository banao, naam do jaise `chatadda`.
3. Is poore `chatapp` folder ko us repository me upload kar do (GitHub website pe "uploading an existing file" option se seedha bhi kar sakte ho, ya `git push` se).

### 2.2 — Render pe deploy karo
1. [render.com](https://render.com) pe free account banao — GitHub se sign in kar sakte ho.
2. Dashboard me **"New +"** → **"Web Service"** click karo.
3. Apna GitHub repo (`chatadda`) select karo.
4. Ye settings bharo:
   - **Name**: chatadda (ya jo bhi naam pasand ho)
   - **Region**: Singapore (India ke sabse paas)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. **"Create Web Service"** click karo.
6. 2-3 minute me deploy ho jayega, aur ek live link milega jaise:
   `https://chatadda.onrender.com`
7. Ye link kisi ko bhi bhejo — wo seedha browser me khol ke, username daal ke chat kar sakta hai!

> ⚠️ Free plan pe agar 15 minute tak koi use na kare to service "so" jaati hai, aur agli baar khulne me 30-50 second lag sakta hai. Ye normal hai, free plan ki limitation hai.

---

## Aage kya add kar sakte ho (agar chaho)
- Private/1-on-1 messaging (sirf 2 logo ke beech)
- Multiple chat rooms (jaise "General", "Music", "Movies")
- Profile picture/avatar
- Message history save karna (database ke saath, jaise MongoDB Atlas — uska free tier bhi hai)

## Reports kaise dekhein
Server ke folder me ek `reports.json` file ban jayegi jisme har report `reportedUser`, `reportedBy`, `reason` aur time ke saath save hoti hai. Render ke free plan pe ye file **restart/redeploy hone par delete ho jaati hai** (disk temporary hai) — agar reports permanently chahiye to aage MongoDB Atlas (free) jodwa sakte hain.

## Testing kaise karo

### A) Pehle local pe test karo (apne computer pe)
1. `npm install` phir `npm start` chalao.
2. Browser me `http://localhost:3000` kholo — ye tab 1 hai, isme username "Rahul" daalo.
3. Ek **naya incognito/private window** kholo (normal tab nahi — warna dono ek hi socket session share kar sakte hain), same URL kholo, username "Priya" daalo.
4. Ab check karo:
   - **Public chat**: Rahul se message bhejo → Priya ke screen pe turant aana chahiye
   - **Online list**: dono tabs me dusre ka naam sidebar me dikhna chahiye
   - **Private chat**: sidebar me naam pe click karo, message bhejo → sirf wahi 2 log dekh paayenge
   - **Typing indicator**: message likhte waqt dusri taraf "likh raha hai..." dikhna chahiye
   - **Block**: ek user ko block karo → uske messages gayab ho jaane chahiye, aur reply na ja paye
   - **Report**: report bhejo → server folder me `reports.json` file check karo, entry aani chahiye
   - **Audio/Video call**: dono tabs alag-alag browser windows me hone chahiye (mic/camera conflict na ho); ek se call karo, dusre pe accept/reject popup aana chahiye, phir video/audio connect ho jaana chahiye

### B) Live (deployed) site pe test karo
1. Deploy hone ke baad jo link mile (jaise `https://chatadda.onrender.com`), wo apne phone aur laptop dono pe kholo.
2. Alag-alag username se join karo aur wahi sab cheezein upar wale checklist se test karo.
3. Sabse achha test: 2 alag logo (dost/family) ko link bhejo, dono se ek saath try karwao — real network conditions pe pata chalega ki call theek se connect ho rahi hai ya nahi.

---

## Website ko Google pe laana (SEO)

Google pe naya website turant nahi aata — usme aam taur pe **kuch din se lekar 2-3 hafte** lagte hain. Koi bhi guaranteed/turant tareeka nahi hai, lekin ye steps process ko tez karte hain:

### Step 1: Google Search Console me site jodo
1. [search.google.com/search-console](https://search.google.com/search-console) pe jao, Google account se login karo.
2. **"Add Property"** → apna live URL daalo (jaise `https://chatadda.onrender.com`).
3. Ownership verify karne ke liye "HTML tag" method choose karo — Google ek meta tag dega, use `public/index.html` ke `<head>` me paste kar dena (mai add kar sakta hu, bas apna final Render URL bhej dena).
4. Verify hone ke baad, **"Sitemaps"** section me jao aur `sitemap.xml` submit karo (maine wo file bana di hai — bas usme apna asli URL daal dena, abhi placeholder hai).
5. **"URL Inspection"** tool me apna homepage URL daal ke **"Request Indexing"** click karo — isse Google ko turant pata chal jata hai ki page hai.

### Step 2: `robots.txt` aur `sitemap.xml` me apna real URL daalo
Maine dono files `public/` folder me bana di hain, lekin unme `YOUR-SITE-NAME.onrender.com` likha hai — deploy karne ke baad apna asli link daal ke replace kar do.

### Kya expect karo
- Search Console me submit karne ke baad bhi Google apni marzi se decide karta hai kab aur kahan dikhana hai — kisi bhi tool se "Google ke pehle page pe aana" guarantee nahi hota.
- Naye, chote websites shuru me low ranking pe aate hain — traffic/backlinks/time ke saath improve hota hai.
- Agar chaho to specific keyword bata do (jaise "free video call website"), main **title aur description** us hisaab se aur optimize kar dunga.

> ⚠️ Ek baat dhyan me rakhna: ye ek **open public chat** hai — Google pe aane ka matlab hai koi bhi ajnabi search se seedha aa ke join kar sakta hai. Agar chaho to invite-only ya password-protected version bhi bana sakte hain — bolna.

## Safety note
Ye ek **public chat room** hai — jo bhi link kholega, wo dusro ke saath chat kar sakta hai. Users ko batao ke:
- Apna real naam, phone number, address kisi ajnabi ko na de
- Kisi bhi galat/abusive behaviour ko report/block karne ka system aage add karwaya ja sakta hai

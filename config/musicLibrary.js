// ChatAdda ke "Story" feature ke liye background music tracks.
// Instagram jaisi poori copyrighted music library kisi bhi chhote project mein
// legally daalna possible nahi hai — isliye ye chhoti si ROYALTY-FREE library hai.
//
// YAHAN APNE GAANE ADD KARNE KA TARIKA (10-15 tracks kaafi hain):
// 1. pixabay.com/music kholo (ya YouTube Audio Library: youtube.com/audiolibrary) —
//    dono jagah explicitly "free to use, no copyright" wale tracks milte hain.
// 2. Jo track pasand aaye use download karo (MP3 file).
// 3. Us MP3 ko Cloudinary pe upload karo — apne Cloudinary dashboard se seedha
//    (Media Library > Upload), ya chaho to /api/upload route se bhi ho jayega.
// 4. Jo "secure_url" mile, use neeche ek naye object mein "url" field mein daal do.
//
// Fields:
//   id    -> koi bhi unique chhota naam (jaise 'happy-1', 'chill-2') — spaces mat rakhna
//   name  -> jo user ko app mein dikhega (jaise "Upbeat Morning")
//   url   -> Cloudinary se mila hua audio ka secure_url

module.exports = [
  // Example (isko uncomment karke apna real Cloudinary URL daal dena):
  // { id: 'happy-1', name: 'Upbeat Morning', url: 'https://res.cloudinary.com/your-cloud/video/upload/v123/happy1.mp3' },
  // { id: 'chill-1', name: 'Lo-fi Chill', url: 'https://res.cloudinary.com/your-cloud/video/upload/v123/chill1.mp3' },
  // { id: 'love-1', name: 'Soft Romance', url: 'https://res.cloudinary.com/your-cloud/video/upload/v123/love1.mp3' },
];

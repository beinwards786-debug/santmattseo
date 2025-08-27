// api/youtube/seo.js
// Fetch real YouTube metadata via Data API v3 and return full SEO package.

const API_KEY = process.env.YT_API_KEY;

// --- helpers ---
function extractVideoId(input) {
  try {
    const u = new URL(input);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1];
    }
    if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0];
    return u.searchParams.get('v');
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  }
  return null;
}

function parseChapters(description = '') {
  const lines = description.split(/\r?\n/);
  const ts = /(?<!\d)(\d{1,2}:)?\d{1,2}:\d{2}(?!\d)/;
  const out = [];
  for (const line of lines) {
    const m = line.match(ts);
    if (m) {
      const time = m[0];
      const label = line.replace(time, '').trim() || 'Chapter';
      out.push({ start: time, label });
    }
  }
  return out;
}
function secondsFromTimestamp(t) {
  const parts = t.split(':').map(n => parseInt(n, 10));
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return 0;
}
function detectTopic(text='') {
  const lc = text.toLowerCase();
  const topics = [
    { key: 'Naam Simran', test: /naam\s*simran|simran/ },
    { key: 'Anhad Naad', test: /anhad\s*naad|inner\s*sound/ },
    { key: 'Dasam Dwaar', test: /dasam\s*dwa(ar|ar)|tenth\s*gate/ },
    { key: 'Surat Shabd Yoga', test: /surat\s*shabd|shabd\s*yoga/ },
    { key: 'Gurbani Vyakhya', test: /gurbani|shabad|vyakhya/ },
    { key: 'Radha Soami', test: /radha\s*soami|rs\s*beas|beas\s*satsang/ },
  ];
  for (const t of topics) if (t.test.test(lc)) return t.key;
  return 'Naam Simran';
}
function pickPlaylist(topic) {
  const playlists = {
    'Meditation for Beginners': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzH670JaGyfx3h7TvrFw6Db',
    'Naam Simran': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqxXsRfFeez4K7m6loJ-VpFw',
    'Sant Mat Teachings': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqw9k_4WtXEGA2nnjnpok1jX',
    'Spiritual Awakening': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqyGq8X-K0pPI27tte-hpcOr',
    'Bhawar Gufa': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqx0k9f1_pLTANU6JeO8Jjrq',
    'Dasam Dwaar': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqy2TxBC4KrPRuM7H27hsfyO',
    'Anhad Naad': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzcV0NA26EwxrOk9dGdV-ku',
    'Gurbani Vyakhya': 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzjsUu6-gcb4uTlfEXotrS-',
    'Sant Mat Shorts': ''
  };
  if (topic === 'Anhad Naad') return playlists['Anhad Naad'];
  if (topic === 'Dasam Dwaar') return playlists['Dasam Dwaar'];
  if (topic === 'Surat Shabd Yoga') return playlists['Sant Mat Teachings'];
  if (topic === 'Gurbani Vyakhya') return playlists['Gurbani Vyakhya'];
  if (topic === 'Radha Soami') return playlists['Sant Mat Teachings'];
  return playlists['Naam Simran'];
}
function buildTags(topic) {
  const core = ["Naam Simran","Sant Mat","Santmat Meditation","Surat Shabd Yoga","Anhad Naad","Dasam Dwaar Meditation","Shabd Dhun","Radha Soami","Sant Mat Satsang","Aatma Ka Safar"];
  const med = ["Dhyan ke Anubhav","Naam Simran ke Anubhav","Meditation in Hindi","Guided Meditation Hindi","Inner Light and Sound","Simran Meditation Technique","How to Meditate in Hindi","Spiritual Awakening in Hindi"];
  const saints = ["Kabir Das Ji","Kabir Bhajan","Sant Vaani","Nanak Sahib","Adhyatm Gyan","आत्म ज्ञान satsang","Premanand Maharaj","Gurudev Dayalu","Kaya Khoji"];
  const broad = ["Vipassana Sadhana","Kundalini Meditation","Bhakti Yog","Spiritual Motivation Hindi","Self Development Spirituality"];
  let out = [];
  if (topic === 'Anhad Naad') out.push('Anhad Naad');
  if (topic === 'Dasam Dwaar') out.push('Dasam Dwaar Meditation');
  if (topic === 'Surat Shabd Yoga') out.push('Surat Shabd Yoga');
  if (topic === 'Gurbani Vyakhya') out.push('Gurbani Vyakhya');
  out = out.concat(core);
  out = out.concat(med.slice(0,6));
  out = out.concat(['Kabir Das Ji','Sant Vaani']);
  out = out.concat(broad.slice(0,3));
  out.push('Ruhani Satsang');
  const seen = new Set();
  const dedup = out.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
  return dedup.slice(0,25);
}
function buildHashtags(topic) {
  const base = ["#SantMatShorts","#NaamSimran","#SuratShabdYoga","#SantMat","#MeditationHindi","#SpiritualAwakening","#RadhaSoami","#RuhaniSatsang"];
  if (topic === 'Anhad Naad') base.push('#AnhadNaad');
  if (topic === 'Dasam Dwaar') base.push('#DasamDwaar');
  if (topic === 'Gurbani Vyakhya') base.push('#Gurbani');
  return Array.from(new Set(base)).slice(0,10);
}
function stubChapters(topic) {
  return [
    { start: '00:00', label: 'Intro & Intent' },
    { start: '01:30', label: 'Naam Simran basics' },
    { start: '04:00', label: `${topic} explained` },
    { start: '07:30', label: 'Surat Shabd Yoga steps' },
    { start: '11:00', label: 'Common mistakes & fixes' },
    { start: '13:30', label: 'Daily practice plan' }
  ];
}
function joinAffiliateBlock() {
  return `
📚 अनुशंसित पुस्तकें और साधना सामग्री
🔹 Sant Mat & Spiritual Books
Shabd Yoga and Sant Mat → https://fktr.in/v8xDR9w
Sant Mat Darshan → https://fktr.in/1nIMNO6
Anurag Sagar → https://fktr.in/Va6L54u
Practising Spiritual Intelligence → https://fktr.in/I6C1xsa
The Teachings of Ramana Maharshi → https://fktr.in/pbb4YH1
Sri Siddhi Ma → https://fktr.in/8s7lq4U
Walking With Nanak → https://fktr.in/MvpBs87
Two Saints → https://fktr.in/gt7V15R
🔹 Meditation Essentials
🧘‍♂️ Meditation Mat with Seat → https://fktr.in/EZ2QaNW
🪑 Meditation Chair – Option 1 → https://fktr.in/hsDg7zs
🪑 Meditation Chair – Option 2 → https://fktr.in/x9sB72E
✨ जब आप इन links से खरीदते हैं, तो channel को सहयोग मिलता है — और आपका साधना पथ भी गहराता है। धन्यवाद 🙏
📲 हमारे satsang परिवार से जुड़ें:
WhatsApp → https://whatsapp.com/channel/0029VaNbhH359PwW1oufMf0W
Telegram → https://t.me/santmatt
Facebook → https://www.facebook.com/santmatthindi
`.trim();
}
function buildDescription(topic, chaptersList) {
  const hook = `Meditation in Hindi के इस @santmatt Sant Mat Satsang में: ${topic} और Naam Simran पर स्पष्ट, व्यावहारिक मार्गदर्शन मिलेगा — Sant Mat Teachings व Surat Shabd Yoga की रोशनी में।`;
  const bullets = [
    'Naam Simran का सही ढंग और साधना में निरंतरता कैसे बनायें',
    `${topic} को समझने के संकेत और सामान्य भ्रांतियाँ`,
    'Surat Shabd Yoga के चरण और ध्यान में बैठने की तैयारी',
    'Inner Light & Sound के अनुभव को संभालना — अहंकार से बचें',
    'Daily practice plan: समय, आसन, नीयत और स्व-अवलोकन'
  ];
  const chaptersLines = chaptersList.map(c => `${c.start} — ${c.label}`).join('\n');
  return [
    hook,
    '',
    'इस satsang वीडियो में आप जानेंगे:',
    bullets.map(b => `• ${b}`).join('\n'),
    '',
    '⏱️ Timestamp Chapters:',
    chaptersLines,
    '',
    'CTA: Like करें, Comment में अपने ध्यान अनुभव साझा करें, और @santmatt को Subscribe करें! आपका प्रश्न: हाल में ध्यान में आपका सबसे गहरा अनुभव क्या रहा?',
    '',
    joinAffiliateBlock(),
    '',
    '👉 Explore more satsangs:',
    pickPlaylist(topic)
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  try {
    if (!API_KEY) return res.status(500).json({ error: 'Missing YT_API_KEY env' });

    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`;
    const r = await fetch(apiURL);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: 'YouTube API error', details: txt });
    }
    const data = await r.json();
    if (!data.items || !data.items.length) return res.status(404).json({ error: 'Video not found' });

    const item = data.items[0];
    const sn = item.snippet || {};
    const sourceTitle = sn.title || '';
    const sourceDesc = sn.description || '';

    let chapters = parseChapters(sourceDesc).map(c => ({ ...c, seconds: secondsFromTimestamp(c.start) }));
    const topic = detectTopic(sourceTitle + '\n' + sourceDesc);
    if (chapters.length < 5) chapters = stubChapters(topic);

    const playlist = pickPlaylist(topic);
    const tags = buildTags(topic);
    const hashtags = buildHashtags(topic);

    let title = `${topic} Explained | Naam Simran Sant Mat Satsang`;
    if (title.length > 70) title = `${topic} | Naam Simran Sant Mat Satsang`;

    const description = buildDescription(topic, chapters);

    const endScreens = [
      { type: 'video', title: 'Watch this Satsang', url: `https://www.youtube.com/watch?v=${videoId}` },
      { type: 'video', title: 'Naam Simran Technique Explained', url: `https://www.youtube.com/watch?v=${videoId}` },
      { type: 'playlist', title: 'Sant Mat Teachings Playlist', url: playlist || 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqw9k_4WtXEGA2nnjnpok1jX' }
    ];
    const growth = {
      shorts: [`${topic} का रहस्य`, 'Naam Simran कैसे करें', 'Inner Sound अनुभव', 'Daily Simran Plan'],
      externalPush: ['WhatsApp satsang group', 'Telegram channel', 'Facebook page'],
      engagement: 'Pin: आपने ध्यान में क्या अनुभव किया?',
      revival: 'Day 2 poll + Shorts push if views slow',
      tracking: 'Track CTR >5% and AVD >50% in Studio'
    };

    return res.status(200).json({
      title, description, tags, hashtags, chapters, playlist, endScreens, growth,
      source: { videoId, sourceTitle, thumbnails: sn.thumbnails || {} }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}

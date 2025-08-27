// api/youtube/seo.js
// YouTube Data API v3 → Real metadata → Topic-specific SEO package for @santmatt

const API_KEY = process.env.YT_API_KEY;

/* ----------------------------- Utilities ----------------------------- */
const uniq = (arr) => Array.from(new Set(arr));

function extractVideoId(input) {
  try {
    const u = new URL(input);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if (['shorts','embed','live','v'].includes(parts[0])) return parts[1] || parts[0];
      return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0];
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  }
  return null;
}

function primaryFromTitle(t='') {
  // Leftmost meaningful chunk
  const seg = t.split(/[\|\-:–—]/)[0] || t;
  return seg.trim().replace(/\s+/g,' ').slice(0,80);
}

function secondsFromTimestamp(t) {
  const parts = t.split(':').map(n=>parseInt(n,10));
  if (parts.length===3) return parts[0]*3600+parts[1]*60+parts[2];
  if (parts.length===2) return parts[0]*60+parts[1];
  return 0;
}
function parseChapters(description='') {
  const lines = description.split(/\r?\n/);
  const ts = /(?<!\d)(\d{1,2}:)?\d{1,2}:\d{2}(?!\d)/;
  const out=[];
  for (const line of lines) {
    const m = line.match(ts);
    if (m) {
      const time = m[0];
      const label = line
        .replace(time,'')
        .replace(/[—–\-:•·]\s*/g,'')
        .trim() || 'Chapter';
      out.push({ start: time, label, seconds: secondsFromTimestamp(time) });
    }
  }
  return out;
}

function detectCluster(text='') {
  const lc = text.toLowerCase();
  const map = [
    { key:'Naam Simran', test:/\bnaam\s*simran\b|\bsimran\b/ },
    { key:'Anhad Naad', test:/anhad\s*naad|anahad|inner\s*sound/ },
    { key:'Dasam Dwaar', test:/dasam\s*dwa(ar|ar)|tenth\s*gate/ },
    { key:'Surat Shabd Yoga', test:/surat\s*shabd|shabd\s*yoga/ },
    { key:'Gurbani Vyakhya', test:/gurbani|shabad\s+arth|vyakhya/ },
    { key:'Brahmacharya', test:/brahmacharya|ब्रह्मचर्य|रज-शक्ति|raja\s*shakti/ },
    { key:'Radha Soami', test:/radha\s*soami|rs\s*beas|beas\s*satsang/ },
  ];
  for (const t of map) if (t.test.test(lc)) return t.key;
  return 'General';
}

function pickPlaylist(cluster) {
  const P = {
    beginners:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzH670JaGyfx3h7TvrFw6Db',
    naam:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqxXsRfFeez4K7m6loJ-VpFw',
    teachings:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqw9k_4WtXEGA2nnjnpok1jX',
    awaken:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqyGq8X-K0pPI27tte-hpcOr',
    bhawar:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqx0k9f1_pLTANU6JeO8Jjrq',
    dasam:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqy2TxBC4KrPRuM7H27hsfyO',
    anhad:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzcV0NA26EwxrOk9dGdV-ku',
    gurbani:'https://www.youtube.com/playlist?list=PLwtx0IKIzJqzjsUu6-gcb4uTlfEXotrS-',
  };
  if (cluster==='Anhad Naad') return P.anhad;
  if (cluster==='Dasam Dwaar') return P.dasam;
  if (cluster==='Surat Shabd Yoga') return P.teachings;
  if (cluster==='Gurbani Vyakhya') return P.gurbani;
  if (cluster==='Naam Simran') return P.naam;
  if (cluster==='Brahmacharya') return P.awaken;
  return P.teachings;
}

function ensureCount(list, target, pool=[]) {
  const d = uniq(list);
  if (d.length>=target) return d.slice(0,target);
  const fill=[];
  for (const p of pool) {
    if (fill.length + d.length >= target) break;
    if (!d.includes(p)) fill.push(p);
  }
  return d.concat(fill).slice(0,target);
}

function buildTags(cluster, primaryKW) {
  const core=["Naam Simran","Sant Mat","Santmat Meditation","Surat Shabd Yoga","Anhad Naad","Dasam Dwaar Meditation","Shabd Dhun","Radha Soami","Sant Mat Satsang","Aatma Ka Safar"];
  const med=["Dhyan ke Anubhav","Naam Simran ke Anubhav","Meditation in Hindi","Guided Meditation Hindi","Inner Light and Sound","Simran Meditation Technique","How to Meditate in Hindi","Spiritual Awakening in Hindi"];
  const saint=["Kabir Das Ji","Kabir Bhajan","Sant Vaani","Nanak Sahib","Adhyatm Gyan","आत्म ज्ञान satsang","Premanand Maharaj","Gurudev Dayalu","Kaya Khoji"];
  const broad=["Vipassana Sadhana","Kundalini Meditation","Bhakti Yog","Spiritual Motivation Hindi","Self Development Spirituality"];
  const trend=["Ruhani Satsang","Amrit Vela Satsang","Today Live Satsang Beas","Sunday Special Satsang","Trending Satsang","Bageshwar Dham"];

  let topicTag = primaryKW;
  if (/brahm/i.test(primaryKW)) topicTag = 'Brahmacharya';
  if (/raj[ae]?\s*shakti/i.test(primaryKW)) topicTag = 'Raja Shakti';

  let out = [];
  if (topicTag && !/naam simran/i.test(topicTag)) out.push(topicTag);
  if (cluster==='Anhad Naad') out.push('Anhad Naad');
  if (cluster==='Dasam Dwaar') out.push('Dasam Dwaar Meditation');
  if (cluster==='Surat Shabd Yoga') out.push('Surat Shabd Yoga');
  if (cluster==='Gurbani Vyakhya') out.push('Gurbani Vyakhya');
  if (cluster==='Brahmacharya') out.push('Brahmacharya');

  out = out.concat(core, med.slice(0,6), ['Kabir Das Ji','Sant Vaani'], broad.slice(0,3), ['Ruhani Satsang']);
  const pool = uniq(core.concat(med, saint, broad, trend));
  return ensureCount(out, 25, pool);
}

function buildHashtags(cluster, primaryKW) {
  let base=["#SantMatShorts","#NaamSimran","#SuratShabdYoga","#SantMat","#MeditationHindi","#SpiritualAwakening","#RadhaSoami","#RuhaniSatsang"];
  if (/anhad/i.test(cluster) || /anhad/i.test(primaryKW)) base.push('#AnhadNaad');
  if (/dasam/i.test(cluster) || /dasam/i.test(primaryKW)) base.push('#DasamDwaar');
  if (/gurbani/i.test(cluster) || /gurbani/i.test(primaryKW)) base.push('#Gurbani');
  if (/brahm/i.test(cluster) || /brahm/i.test(primaryKW)) base.push('#Brahmacharya');
  base = uniq(base);
  return ensureCount(base, 8, base);
}

function stubChapters(primaryKW) {
  return [
    { start:'00:00', label:`Introduction to ${primaryKW}`, seconds:0 },
    { start:'01:30', label:'Context & core concepts', seconds:90 },
    { start:'04:00', label:'Common myths & clarity', seconds:240 },
    { start:'07:30', label:'Practice steps & discipline', seconds:450 },
    { start:'11:00', label:'Inner experience & pitfalls', seconds:660 },
    { start:'13:30', label:'Daily plan & self-review', seconds:810 },
  ];
}

function wordCount(s=''){ return (s.trim().match(/\S+/g) || []).length; }

/** Derive bullets from real video text (chapters/description). */
function deriveBullets(primaryKW, cluster, chapters, sourceDesc) {
  const bullets=[];
  const add=(s)=>{
    if(!s) return;
    const clean = s.replace(/^\W+|\W+$/g,'').replace(/\s+/g,' ').trim();
    if(!clean) return;
    const lower = clean.toLowerCase();
    if (lower==='chapter' || lower==='introduction') return;
    if(!bullets.find(b=>b.toLowerCase()===lower)) bullets.push(clean);
  };

  // Use chapter labels first
  chapters.slice(0,7).forEach(c=> add(c.label));

  // Pull meaningful lines from description
  sourceDesc.split(/\r?\n/).forEach(line=>{
    if (/(\d{1,2}:)?\d{1,2}:\d{2}/.test(line)) return; // skip timestamp lines
    const parts = line.split(/[—–\-:•·]/).map(s=>s.trim()).filter(Boolean);
    parts.forEach(p=>{
      if (p.length>=8 && p.length<=140) add(p);
    });
  });

  // Filter to 5 best
  let selected = bullets.slice(0,5);

  // If insufficient, fill topic-specific (no generic SSY/Naam Simran)
  if (selected.length<4) {
    const pool=[
      `${primaryKW} का अर्थ, उद्देश्य और साधना की दिशा`,
      `${primaryKW} में अनुशासन, आहार व दिनचर्या`,
      `${primaryKW} में मानसिक प्रवृत्तियों से निपटना (awareness)`,
      `आरंभिक साधकों के लिये सरल दैनिक योजना`,
      `गलतफ़हमियाँ व सही समझ (${primaryKW})`
    ];
    selected = ensureCount(selected,5,pool);
  }

  // If cluster is 'Brahmacharya', prefer Brahmacharya-language
  if (cluster==='Brahmacharya') {
    selected = [
      'रज-शक्ति (Raja Shakti) की समझ और संरक्षण',
      'ऊर्जा का रूपांतरण: इच्छाओं से ओज में',
      'सात्त्विक आहार, दिनचर्या और संयम',
      'मन-चित्त की शुद्धि: अवलोकन बिना दमन',
      'समाधि की दिशा: प्रेम, श्रद्धा और समर्पण'
    ];
  }

  return selected.slice(0,5);
}

function buildDescription(primaryKW, cluster, chaptersList, sourceDesc) {
  const hook = `Meditation in Hindi के इस @santmatt Sant Mat Satsang में: ${primaryKW} पर स्पष्ट, व्यावहारिक मार्गदर्शन मिलेगा — ${cluster!=='General' ? cluster + ' व ' : ''}Sant Mat Teachings की रोशनी में।`;

  const bullets = deriveBullets(primaryKW, cluster, chaptersList, sourceDesc);
  const chaptersLines = chaptersList.slice(0,7).map(c=>`${c.start} — ${c.label}`).join('\n');

  let desc = [
    hook,
    '',
    'इस satsang वीडियो में आप जानेंगे:',
    bullets.map(b=>`• ${b}`).join('\n'),
    '',
    '⏱️ Timestamp Chapters:',
    chaptersLines,
    '',
    'CTA: Like करें, Comment में अपने ध्यान अनुभव साझा करें, और @santmatt को Subscribe करें! आपका प्रश्न: आज के satsang से आपकी एक सबसे उपयोगी सीख क्या रही?',
    '',
    `📚 अनुशंसित पुस्तकें और साधना सामग्री
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
Facebook → https://www.facebook.com/santmatthindi`,
    '',
    '👉 Explore more satsangs:',
    pickPlaylist(cluster)
  ].join('\n');

  const wc = wordCount(desc);
  if (wc < 200) {
    const pad = `\n\nनोट: यह satsang seekers को ${primaryKW} को रोज़मर्रा की जीवन-चर्या में उतारने के व्यावहारिक तरीके देता है — छोटे-छोटे steps, gentle discipline और प्रेमपूर्ण awareness के साथ। शुरुआत में कम समय लें, posture स्थिर रखें, और mind-wandering को बिना जज किये awareness में लौटाएँ।`;
    desc += pad;
  }
  if (wordCount(desc) > 350) {
    const beforeAffiliate = desc.split('📚 अनुशंसित पुस्तकें')[0] || desc;
    const trimmed = beforeAffiliate.trim();
    if (wordCount(trimmed) >= 200) {
      desc = trimmed + '\n\n👉 Explore more satsangs:\n' + pickPlaylist(cluster);
    }
  }
  return desc;
}

/* ------------------------------- Handler ------------------------------ */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return res.status(405).json({ error:'Method not allowed. Use POST.' });

  try {
    if (!API_KEY) return res.status(500).json({ error:'Missing YT_API_KEY env' });

    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error:'Missing url' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error:'Invalid YouTube URL' });

    const apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`;
    const r = await fetch(apiURL);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error:'YouTube API error', details: txt });
    }
    const data = await r.json();
    if (!data.items || !data.items.length) return res.status(404).json({ error:'Video not found' });

    const item = data.items[0];
    const sn = item.snippet || {};
    const sourceTitle = (sn.title || '').trim();
    const sourceDesc  = sn.description || '';

    const primaryKW = primaryFromTitle(sourceTitle) || 'Sant Mat';
    const cluster   = detectCluster(`${sourceTitle}\n${sourceDesc}`);

    // Chapters
    let chapters = parseChapters(sourceDesc).sort((a,b)=>a.seconds-b.seconds);
    const seen = new Set();
    chapters = chapters.filter(c=>{
      const key = `${c.start}-${c.label}`.toLowerCase();
      if (seen.has(key)) return false; seen.add(key); return true;
    });
    if (chapters.length < 5) chapters = stubChapters(primaryKW);
    if (chapters.length > 7) chapters = chapters.slice(0,7);

    // SEO pieces
    const title = `${primaryKW} | ${cluster!=='General' ? cluster+' ' : ''}Sant Mat Satsang`.replace(/\s+/g,' ').trim();
    const description = buildDescription(primaryKW, cluster, chapters, sourceDesc);
    const tags = buildTags(cluster, primaryKW);
    const hashtags = buildHashtags(cluster, primaryKW);
    const playlist = pickPlaylist(cluster);

    const endScreens = [
      { type:'video', title:'Watch this Satsang', url:`https://www.youtube.com/watch?v=${videoId}` },
      { type:'video', title:`${primaryKW} — Essentials`, url:`https://www.youtube.com/watch?v=${videoId}` },
      { type:'playlist', title:'Sant Mat Teachings Playlist', url: playlist }
    ];

    const growth = {
      shorts: [
        `${primaryKW} का सार`,
        `${primaryKW}: शुरुआती 3 tips`,
        `Inner Journey अनुभव`,
        `Daily Practice Plan`
      ],
      externalPush: ['WhatsApp satsang group','Telegram channel','Facebook page'],
      engagement: `Pin: ${primaryKW} पर आपका अनुभव क्या रहा?`,
      revival: 'Day 2 poll + Shorts push if views slow',
      tracking: 'Track CTR >5% and AVD >50% in Studio'
    };

    return res.status(200).json({
      title, description, tags, hashtags, chapters, playlist, endScreens, growth,
      debug: {
        version: 'topic-extract-v3',
        counts: {
          tags: tags.length, hashtags: hashtags.length, chapters: chapters.length, words: wordCount(description)
        },
        primaryKW, cluster
      },
      source: { videoId, sourceTitle, thumbnails: sn.thumbnails || {} }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error:'Server error' });
  }
}

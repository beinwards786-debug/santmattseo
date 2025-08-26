export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const { url } = req.body || {}
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url' })
    }

    return res.status(200).json({
      title: 'Anhad Naad Explained | Naam Simran Sant Mat Satsang',
      description: 'Meditation in Hindi के इस @santmatt Sant Mat Satsang में dummy description...',
      tags: ['Sant Mat','Naam Simran','Surat Shabd Yoga','Ruhani Satsang','Anhad Naad'],
      hashtags: ['#SantMatShorts','#NaamSimran','#SuratShabdYoga','#RuhaniSatsang'],
      chapters: [{ start:'00:00', label:'Intro' }, { start:'01:30', label:'Naam Simran' }],
      playlist: 'https://www.youtube.com/playlist?list=PLwtx0IKIzJqw9k_4WtXEGA2nnjnpok1jX',
      endScreens: [
        { type:'video', title:'Naam Simran Technique', url:'https://example.com/v1' },
        { type:'playlist', title:'Sant Mat Teachings', url:'https://example.com/p1' }
      ],
      growth: {
        shorts: ['Naam Simran का रहस्य','Anhad Naad कैसे सुने'],
        externalPush: ['WhatsApp','Telegram','Facebook'],
        engagement: 'Pin a question',
        revival: 'Day 2 poll + Shorts push',
        tracking: 'CTR >5% | AVD >50%'
      }
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

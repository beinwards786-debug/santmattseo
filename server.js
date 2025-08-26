// server.js
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({ origin: '*', methods: ['GET','POST'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json())

// health check route
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// dummy SEO generator route
app.post('/youtube/seo', (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url' })

  // अभी फिलहाल dummy डेटा return कर रहे हैं
  return res.json({
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
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`[SEO] Listening on :${PORT}`))

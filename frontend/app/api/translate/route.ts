import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'hi', sourceLang = 'auto' } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (!res.ok) {
      throw new Error(`Translation service returned status ${res.status}`)
    }

    const data = await res.json()
    // Extract translated sentences
    const translatedText = (data[0] || []).map((part: any) => part[0]).join('')
    const detectedLang = data[2] || 'auto'

    return NextResponse.json({
      translatedText,
      detectedLang,
      originalText: text,
      targetLang,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Translation failed' },
      { status: 500 }
    )
  }
}

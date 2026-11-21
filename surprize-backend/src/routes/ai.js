const express = require('express');
const router = express.Router();

const SYSTEM = `You are the Surprize AI Assistant for a gift and surprise-planning website in Bhutan.
Help users choose gifts, plan surprises, and write short card messages.
Prices are in Nu. (Ngultrum). Available items include: Balloon Decoration Set (Nu. 1,200),
Chocolate Oreo Cake (Nu. 900), Tulip Glass Lamp (Nu. 850), Cute Teddy Pair (Nu. 750),
Heart Photo Frame (Nu. 700), Pastel Design Cake (Nu. 600).
Keep answers short, warm and practical. Only talk about gifts, occasions and surprises.`;

router.post('/chat', async (req, res) => {
  try {
    const key = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL;
    if (!key || !model) return res.status(500).json({ message: 'The AI assistant is not set up yet.' });

    const messages = (Array.isArray(req.body.messages) ? req.body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content.slice(0, 500) }));

    if (!messages.length || messages[0].role !== 'user') {
      return res.status(400).json({ message: 'Please type a message.' });
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });

    const data = await r.json();
    if (r.status === 429) {
      return res.status(429).json({ message: 'Too many requests right now. Please try again in a minute.' });
    }
    if (!r.ok) {
      console.error('AI error:', data);
      return res.status(502).json({ message: 'The assistant is unavailable right now.' });
    }
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not think of an answer.';
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
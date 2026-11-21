const OpenAI = require('openai');
const db = require('./db');

const occasionToTypes = {
  Birthday: ['Birthday', 'Personalized', 'Flowers', 'Food', 'Cards'],
  Anniversary: ['Flowers', 'Personalized', 'Jewellery', 'Food', 'Cards'],
  Graduation: ['Personalized', 'Accessories', 'Flowers', 'Cards'],
  Proposal: ['Flowers', 'Jewellery', 'Personalized', 'Cards'],
  'Other Event': ['Personalized', 'Flowers', 'Food', 'Cards']
};

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

function ruleSuggestions(gifts, occasion, budget) {
  const preferred = occasionToTypes[occasion] || [];
  const sorted = [...gifts].sort((a, b) => {
    const ap = preferred.includes(a.type) ? 0 : 1;
    const bp = preferred.includes(b.type) ? 0 : 1;
    return ap - bp || Number(a.price) - Number(b.price);
  });

  const bundle = [];
  let spent = 0;
  for (const gift of sorted) {
    const price = Number(gift.price);
    if (price <= budget - spent && bundle.length < 5) {
      bundle.push(gift);
      spent += price;
    }
  }
  const ideas = sorted.filter(g => Number(g.price) <= budget).slice(0, 5);
  return {
    source: 'rules',
    explanation: 'These suggestions were selected from the Surprize catalogue using the occasion and your budget.',
    bundle,
    spent,
    ideas,
    messages: [
      `Wishing you a day filled with happiness and beautiful memories!`,
      `You make every moment special. Hope you enjoy this surprise!`,
      `A little surprise for someone truly special. With love!`
    ]
  };
}

async function getGiftSuggestions(input) {
  const occasion = String(input.occasion || '').trim();
  const budget = Number(input.budget);
  const interests = String(input.interests || '').trim().slice(0, 500);
  const recipient = String(input.recipient || '').trim().slice(0, 100);

  if (!occasion || !Number.isFinite(budget) || budget <= 0) {
    const error = new Error('Please provide an occasion and a budget greater than zero.');
    error.status = 400;
    throw error;
  }

  const [gifts] = await db.execute(
    'SELECT id,name,type,description AS desc_text,price,emoji FROM gifts WHERE active=1 AND price<=? ORDER BY price ASC',
    [budget]
  );

  if (!gifts.length) {
    return { source: 'rules', explanation: 'No catalogue gifts currently fit this budget.', bundle: [], spent: 0, ideas: [], messages: [] };
  }

  if (!process.env.OPENAI_API_KEY) {
    return ruleSuggestions(gifts, occasion, budget);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const catalog = gifts.map(g => ({
      id: Number(g.id), name: g.name, category: g.type,
      description: g.desc_text || '', price: Number(g.price), emoji: g.emoji || '🎁'
    }));

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      instructions: [
        'You are Surprize, a thoughtful gift-planning assistant.',
        'Recommend only items from the supplied catalogue. Never invent products or IDs.',
        'The sum of all recommended items must not exceed the user budget.',
        'Use Bhutanese Ngultrum (Nu.) when discussing prices.',
        'Return ONLY valid JSON with keys: explanation, recommendedGiftIds (array of integer IDs), messages (array of 3 short card messages).',
        'Keep recommendations suitable for the occasion, recipient and interests.'
      ].join(' '),
      input: JSON.stringify({
        request: { occasion, budget, recipient, interests },
        availableCatalogue: catalog
      })
    });

    const parsed = parseJson(response.output_text);
    const allowed = new Map(gifts.map(g => [Number(g.id), g]));
    const selected = [];
    let spent = 0;

    for (const id of Array.isArray(parsed.recommendedGiftIds) ? parsed.recommendedGiftIds : []) {
      const gift = allowed.get(Number(id));
      if (gift && !selected.some(x => Number(x.id) === Number(gift.id)) &&
          spent + Number(gift.price) <= budget) {
        selected.push(gift);
        spent += Number(gift.price);
      }
      if (selected.length >= 5) break;
    }

    if (!selected.length) return ruleSuggestions(gifts, occasion, budget);

    return {
      source: 'ai',
      explanation: String(parsed.explanation || 'Here are some ideas chosen for your celebration.'),
      bundle: selected,
      spent,
      ideas: gifts.filter(g => !selected.some(s => Number(s.id) === Number(g.id))).slice(0, 5),
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.filter(x => typeof x === 'string').slice(0, 3)
        : []
    };
  } catch (error) {
    console.error('AI suggestion error; using rules fallback:', error.message);
    return ruleSuggestions(gifts, occasion, budget);
  }
}

module.exports = { getGiftSuggestions, ruleSuggestions };

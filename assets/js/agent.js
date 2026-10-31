// shiva.ai: a tiny in-browser retrieval agent (BM25 over resume chunks, no network calls)
(function () {
  const STOP = new Set('a an the is are was were be been am i you he his him her she it its of to in on for and or with what which who whom how why when where do does did can could would should tell me about please give show any some this that there his your my our we us at as by from into than then so if just know more'.split(' '));

  const stem = (w) => w.replace(/(ing|ed|es|s)$/,'').replace(/(.)\1$/, '$1');
  const tokenize = (text) =>
    text.toLowerCase()
      .replace(/\.net/g, ' dotnet ')
      .replace(/c#/g, ' csharp ')
      .replace(/[^a-z0-9_]+/g, ' ')
      .split(' ')
      .filter((t) => t && !STOP.has(t))
      .map(stem);

  const FIELDS = [
    { key: 'keywords', weight: 3 },
    { key: 'title', weight: 2 },
    { key: 'answer', weight: 0.5 },
  ];

  function buildIndex(docs) {
    const N = docs.length;
    const df = new Map();
    const docTf = docs.map((d) => {
      const tf = new Map();
      FIELDS.forEach(({ key, weight }) => {
        tokenize(d[key] || '').forEach((t) => tf.set(t, (tf.get(t) || 0) + weight));
      });
      tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
      const len = [...tf.values()].reduce((a, b) => a + b, 0);
      return { tf, len };
    });
    const avgLen = docTf.reduce((a, d) => a + d.len, 0) / N;
    return { N, df, docTf, avgLen };
  }

  function bm25(index, qTokens, i, k1 = 1.4, b = 0.6) {
    const { N, df, docTf, avgLen } = index;
    const { tf, len } = docTf[i];
    let score = 0;
    qTokens.forEach((t) => {
      const f = tf.get(t);
      if (!f) return;
      const n = df.get(t);
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen)));
    });
    return score;
  }

  const SMALL_TALK = [
    { re: /^(hi|hello|hey|hola|namaste|yo|good (morning|afternoon|evening))\b/i, key: 'greeting' },
    { re: /\b(thank|thanks|thx|ty)\b/i, key: 'thanks' },
    { re: /\b(who|what) are you\b|\bare you (an? )?(ai|bot|real|gpt)\b|\bhow do you work\b/i, key: 'self' },
  ];

  function createAgent(data) {
    const docs = data.knowledge;
    const index = buildIndex(docs);

    return {
      ask(question) {
        const q = question.trim();
        for (const s of SMALL_TALK) {
          if (s.re.test(q) && q.split(/\s+/).length <= 5) {
            return { answer: data.agent[s.key], sources: [], tokens: [] };
          }
        }

        const tokens = [...new Set(tokenize(q))];
        const ranked = docs
          .map((d, i) => ({ d, score: bm25(index, tokens, i) }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score);

        if (!ranked.length || ranked[0].score < 1.2) {
          return { answer: data.agent.fallback, sources: [], tokens, retrieved: 0 };
        }

        // Merge a strong runner-up for compound questions ("graphrag and code review")
        const picked = [ranked[0]];
        if (ranked[1] && ranked[1].score > ranked[0].score * 0.55 && /\b(and|also|both|plus|&)\b/i.test(q)) {
          picked.push(ranked[1]);
        }

        return {
          answer: picked.map((r) => r.d.answer).join('\n\n'),
          sources: picked.map((r) => r.d.source),
          tokens,
          retrieved: ranked.length,
          confidence: Math.min(0.99, ranked[0].score / (ranked[0].score + 2)).toFixed(2),
        };
      },
    };
  }

  window.createAgent = createAgent;
})();

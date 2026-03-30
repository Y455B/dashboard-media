export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis env vars missing' });
  }

  async function redis(command, ...args) {
    const r = await fetch(`${REDIS_URL}/${[command, ...args].map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await r.json();
    return data.result;
  }

  try {
    const { action, key, value } = req.method === 'POST'
      ? req.body
      : { action: req.query.action, key: req.query.key };

    if (!action) return res.status(400).json({ error: 'action required' });

    if (action === 'get') {
      const raw = await redis('GET', key);
      return res.status(200).json({ value: raw ? JSON.parse(raw) : null });
    }

    if (action === 'set') {
      await redis('SET', key, JSON.stringify(value));
      return res.status(200).json({ ok: true });
    }

    if (action === 'del') {
      await redis('DEL', key);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

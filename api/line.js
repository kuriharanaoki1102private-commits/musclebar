export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token)   return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' });
  if (!groupId) return res.status(500).json({ error: 'LINE_GROUP_ID not set' });

  const { messages } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'messages required' });

  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ to: groupId, messages }),
    });
    const data = await lineRes.json();
    if (!lineRes.ok) throw new Error('LINE push failed: ' + JSON.stringify(data));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('LINE error:', err);
    return res.status(500).json({ error: err.message });
  }
}

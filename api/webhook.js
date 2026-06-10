export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const events = req.body?.events || [];
    for (const event of events) {
      const src = event.source;
      if (src?.type === 'group' && src?.groupId) {
        console.log('LINE Group ID detected:', src.groupId);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: true });
  }
}

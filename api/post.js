// api/post.js - X（Twitter）投稿エンドポイント
import crypto from 'crypto';

function oauthSign(method, url, params, consumerKey, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
  ).join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function buildOAuthHeader(method, url, extraParams, keys) {
  const oauthParams = {
    oauth_consumer_key: keys.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.accessToken,
    oauth_version: '1.0',
  };
  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, keys.apiSecret, keys.accessTokenSecret);
  const header = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
    `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
  ).join(', ');
  return header;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keys = {
    apiKey:            process.env.TWITTER_API_KEY,
    apiSecret:         process.env.TWITTER_API_SECRET,
    accessToken:       process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };
  if (!keys.apiKey) return res.status(500).json({ error: 'Twitter API keys not configured' });

  const { text, mediaBase64 } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    let mediaId = null;

    if (mediaBase64) {
      const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
      const authHeader = buildOAuthHeader('POST', uploadUrl, {}, keys);
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `media_data=${encodeURIComponent(mediaBase64)}`,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error('Media upload failed: ' + JSON.stringify(uploadData));
      mediaId = uploadData.media_id_string;
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const tweetBody = { text };
    if (mediaId) tweetBody.media = { media_ids: [mediaId] };

    const tweetAuthHeader = buildOAuthHeader('POST', tweetUrl, {}, keys);
    const tweetRes = await fetch(tweetUrl, {
      method: 'POST',
      headers: { 'Authorization': tweetAuthHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(tweetBody),
    });
    const tweetData = await tweetRes.json();
    if (!tweetRes.ok) throw new Error('Tweet failed: ' + JSON.stringify(tweetData));

    return res.status(200).json({ success: true, tweetId: tweetData.data?.id });

  } catch (err) {
    console.error('post error:', err);
    return res.status(500).json({ error: err.message });
  }
}

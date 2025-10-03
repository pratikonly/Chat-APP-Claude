import { sql } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get users who were active in last 5 minutes
      const users = await sql`
        SELECT DISTINCT username, user_id, MAX(created_at) as last_seen
        FROM messages
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY username, user_id
        ORDER BY last_seen DESC
      `;

      return res.status(200).json({ users });

    } else if (req.method === 'POST') {
      // Update user activity
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

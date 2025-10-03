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
      const { since } = req.query;
      
      let messages;
      if (since) {
        messages = await sql`
          SELECT * FROM messages 
          WHERE id > ${parseInt(since)}
          ORDER BY created_at ASC
        `;
      } else {
        messages = await sql`
          SELECT * FROM messages 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        messages = messages.reverse();
      }

      return res.status(200).json({ messages });

    } else if (req.method === 'POST') {
      let body;
      
      // Parse body if it's a string
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      } else {
        body = req.body;
      }

      const { userId, username, message } = body;

      if (!userId || !username || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sql`
        INSERT INTO messages (user_id, username, message) 
        VALUES (${parseInt(userId)}, ${username}, ${message}) 
        RETURNING *
      `;

      return res.status(201).json({ 
        success: true, 
        message: result[0] 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Messages error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

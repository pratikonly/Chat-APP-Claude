import bcrypt from 'bcryptjs';
import { sql } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, username, password } = req.body;

  try {
    if (action === 'register') {
      const existing = await sql`SELECT id FROM users WHERE username = ${username}`;

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (username, password) 
        VALUES (${username}, ${hashedPassword}) 
        RETURNING id, username
      `;

      return res.status(201).json({ 
        success: true, 
        user: { id: result[0].id, username: result[0].username }
      });

    } else if (action === 'login') {
      const users = await sql`SELECT * FROM users WHERE username = ${username}`;

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({ 
        success: true, 
        user: { id: user.id, username: user.username }
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
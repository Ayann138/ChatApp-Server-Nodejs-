

const express = require('express');
const { Pool } = require('pg');
const port = process.env.PORT || 8000;

const app = express();

// Create a new pool instance
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ChatApp',
  password: '2906',
  port: 5432, // Default PostgreSQL port
});
app.use(express.json())
app.use(express.urlencoded({extended:false}));
// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

app.post('/RegisterUser', async (req, res) => {
    try {
        const { uid, email, pass, fullname, phoneNo, profilepic } = req.body;

        // Insert user data into the User table
        const query = `
            INSERT INTO Users (uid,email, pass, fullname, phoneNo, profilepic) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [uid,email, pass, fullname, phoneNo, profilepic]);

        res.status(201).send('User created successfully');
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(8000, () => {
  console.log('Server is running on port 3000');
});

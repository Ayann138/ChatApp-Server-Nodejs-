

const express = require('express');
const multer = require('multer');
var bodyParser = require('body-parser')
const cors = require('cors')
const { Pool } = require('pg');
const port = process.env.PORT || 8000;
const bcrypt = require('bcrypt');
const app = express();
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Specify the directory where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Keep the original file name
  }
});
const upload = multer({ storage: storage });

app.post('/RegisterUser', upload.single('profilePic'), async (req, res) => {
  try {
      const { uid, email, password, fullName, phoneNo } = req.body;
      const profilepic = req.file; 

      // Hashing the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
          INSERT INTO Users (uid,email, pass, fullname, phoneNo, profilepic) 
          VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const result = await pool.query(query, [uid, email, hashedPassword, fullName, phoneNo, profilepic.filename]);
      console.log("User Created with UID: " , uid)
      res.status(200).send('User created successfully');
  } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if(!email || !password){
      res.status(404).send({ValidUser: false, Status: "Fill All The Required Fields" });
      return; 
    }
    const query = `SELECT * FROM Users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.pass);
      if (validPassword) {
        res.status(200).send({ user, ValidUser: true, Status: "User Logged-In" });
      } else {
        res.status(404).send({ ValidUser: false, Status: "Invalid Credentials" });
      }
    } else {
      res.status(404).send({ ValidUser: false, Status: "Invalid Credentials" });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(8000, () => {
  console.log('Server is running on port 3000');
});

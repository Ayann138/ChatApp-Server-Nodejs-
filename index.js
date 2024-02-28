const express = require('express');
const multer = require('multer');
var bodyParser = require('body-parser')
const cors = require('cors')
const pool = require('./Config/db');
const { generateToken } = require('./Config/token')
const port = process.env.PORT || 8000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const app = express();
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.json())
app.use(express.urlencoded({ extended: false }));
// Test the connection


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
    console.log("User Created with UID: ", uid)
    res.status(200).send('User created successfully');
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(404).send({ ValidUser: false, Status: "Fill All The Required Fields" });
      return;
    }
    const query = `SELECT * FROM Users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.pass);
      if (validPassword) {
        const payload = {
          userId: user.uid,
          email: user.email
        };
        const token = generateToken(payload);

        res.status(200).send({ user, token, ValidUser: true, Status: "User Logged-In" });

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

app.post('/AddUserChat', async (req, res) => {

  try {
    const { chat_guid, sender_guid, receiver_guid } = req.body
    const query = `Insert into UserChats (chat_guid, sender_guid, receiver_guid) VALUES ($1, $2, $3)`
    const response = await pool.query(query, [chat_guid, sender_guid, receiver_guid])
    const senderQuery = ` SELECT fullname FROM users WHERE uid = $1`;
    const senderResult = await pool.query(senderQuery, [sender_guid]);
    const sender_fullname = senderResult.rows[0].fullname;
    const receiverQuery = `SELECT fullname FROM users WHERE uid = $1`;
    const receiverResult = await pool.query(receiverQuery, [receiver_guid]);
    const receiver_fullname = receiverResult.rows[0].fullname;
    console.log(`New UserChat Created beteen ${sender_fullname} and ${receiver_fullname}`)
    res.status(200).send(`New UserChat Created beteen ${sender_fullname} and ${receiver_fullname}`);
  } catch (error) {
    console.error('Error creating New UserChat:', error);
    res.status(500).send('Internal Server Error');
  }
})
app.get('/GetAllUserChats/:userid', async (req, res) => {
  try {
      const uid = req.params.userid;
      const query = "SELECT * FROM UserChats WHERE sender_guid LIKE $1 OR receiver_guid LIKE $1";
      const response = await pool.query(query, [uid]);

      let userChats = [];

      for (const row of response.rows) {
          const senderQuery = `SELECT fullname FROM users WHERE uid = $1`;
          const senderResult = await pool.query(senderQuery, [row.sender_guid]);
          const sender_fullname = senderResult.rows[0].fullname;

          const receiverQuery = `SELECT fullname FROM users WHERE uid = $1`;
          const receiverResult = await pool.query(receiverQuery, [row.receiver_guid]);
          const receiver_fullname = receiverResult.rows[0].fullname;

          userChats.push({
              chat_guid: row.chat_guid,
              sender_guid: row.sender_guid,
              receiver_guid: row.receiver_guid,
              sender_name: sender_fullname,
              receiver_name: receiver_fullname
          });
      }

      res.status(200).json(userChats);

  } catch (error) {
      console.error('Error Getting UserChats:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/SendMessage', async (req, res) => {
  try {
    const {message_guid ,chat_guid, sender_guid, message_text, message_date} = req.body
    const query = `Insert into chatmessages (message_guid ,chat_guid, sender_guid, message_text, message_date) VALUES($1, $2,$3,$4,$5)`
    const response = await pool.query(query,[message_guid ,chat_guid, sender_guid, message_text, message_date])
    res.status(200).json("Message Sent");

  } catch (error) {
      console.error('Error Getting UserChats:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(8000, () => {
  console.log('Server is running on port 3000');
});

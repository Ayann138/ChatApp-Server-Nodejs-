const express = require('express');
const multer = require('multer');
var bodyParser = require('body-parser')
const cors = require('cors')
const pool = require('./Config/db');
const { generateToken } = require('./Config/token')
const port = process.env.PORT || 8000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Socket } = require('socket.io');
const io = require('socket.io')(8080, {
  cors: {
    origin: 'http://localhost:3000'
  }
})
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
let users = []
io.on('connection', socket => {
  //console.log("User Connected: ", socket.id)
  socket.on('addUser', userId => {
    const CheckUserExit = users.find(user => user.userId === userId)
    if (!CheckUserExit) {
      const user = { userId, socketId: socket.id }
      users.push(user)
      io.emit('getUsers', users)
    }
    console.log("users: ", users)

  })

  socket.on('sendMessage', ({ message_guid, chat_guid, sender_guid, message_text, message_date, receiver_guid }) => {
    const receiver = users.find(user => user.userId === receiver_guid)
    const sender = users.find(user => user.userId === sender_guid)

    if (receiver) {
      io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
        message_guid, chat_guid, sender_guid, message_text, message_date, receiver_guid
      })
    } else {
      io.to(sender.socketId).emit('getMessage', {
        message_guid, chat_guid, sender_guid, message_text, message_date, receiver_guid
      })
    }
  })

  socket.on('disconnect', () => {
    users = users.filter(user => user.socketId !== socket.id);
    io.emit('getUsers', users)
  })
  // //to send something from backend to frontend we have to use io.emit
  // io.emit("getUsers" , socket.userId)
});


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

app.get("/GetAllUser", async (req, res) => {
  try {
    const query = `Select * from users`
    const result = await pool.query(query)
    if (result.rowCount == 0) {
      res.status(200).send("No User Exists");
    }
    res.status(200).send(result.rows);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).send('Internal Server Error');
  }
})
app.post('/AddUserChat', async (req, res) => {

  try {
    const { chat_guid, sender_guid, receiver_guid } = req.body
    const checkQuery = 'Select * from UserChats where (sender_guid = $1 and receiver_guid = $2) OR (sender_guid = $2 and receiver_guid = $1)'
    const checkResposne = await pool.query(checkQuery, [sender_guid, receiver_guid])
    if (checkResposne.rowCount > 0) {
      res.status(200).send(`User Chat Already Exits`);
    } else {
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
    }

  } catch (error) {
    console.error('Error creating New UserChat:', error);
    res.status(500).send('Internal Server Error');
  }
})
app.get('/GetAllUserChats/:userid', async (req, res) => {
  try {
    const uid = req.params.userid;
    const query = "SELECT * FROM UserChats WHERE sender_guid = $1 OR receiver_guid = $1";
    const response = await pool.query(query, [uid]);

    let userChats = [];

    for (const row of response.rows) {
      let senderName, senderGuid;
      let receiverQuery, receiverResult;
      if (row.sender_guid === uid) {
        senderName = row.sender_name;
        senderGuid = row.sender_guid;
        receiverQuery = `SELECT fullname, email FROM users WHERE uid = $1`;
        receiverResult = await pool.query(receiverQuery, [row.receiver_guid]);
        // console.log("Sender")
      } else {
        senderName = row.receiver_name;
        senderGuid = row.receiver_guid;
        receiverQuery = `SELECT fullname, email FROM users WHERE uid = $1`;
        receiverResult = await pool.query(receiverQuery, [row.sender_guid]);
        //  console.log("Receiver")
      }


      const receiver_fullname = receiverResult.rows[0].fullname;
      const receiver_email = receiverResult.rows[0].email;

      userChats.push({
        chat_guid: row.chat_guid,
        sender_guid: senderGuid,
        receiver_guid: row.receiver_guid,
        sender_name: senderName,
        receiver_name: receiver_fullname,
        receiver_email: receiver_email
      });
    }

    res.status(200).json(userChats);

  } catch (error) {
    console.error('Error Getting UserChats:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/GetGroups/:userid', async (req, res) => {
  try {
    const userId = req.params.userid;
    const query = 'SELECT DISTINCT groupguid FROM groupusers WHERE userguid = $1';
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      res.status(200).send("No User Exists");
    } else {
      const groups = result.rows;
      const groupChats = [];
      for (let i = 0; i < groups.length; i++) {
        const groupId = groups[i].groupguid;
        const query2 = 'SELECT * FROM groupchats WHERE groupguid = $1';
        const chatResult = await pool.query(query2, [groupId]);
        groupChats.push({ group: groups[i], chats: chatResult.rows });
      }
      res.status(200).send(groupChats);
    }
  } catch (error) {
    console.error('Error retrieving groups:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/CreateGroup', async (req, res) => {
  try {
    const query = `
    INSERT INTO groupchats (groupguid,groupname) 
    VALUES ($1, $2)
`;
    const result = await pool.query(query, [req.body.group_guid,req.body.groupName ]);

    for(var i=0; i< req.body.selectedUsers.length; i++){
      const query1 = `
      INSERT INTO groupusers (groupguid,userguid) 
      VALUES ($1, $2)
  `;
      const result = await pool.query(query1, [req.body.group_guid,req.body.selectedUsers[i] ]);
    }
    res.status(200).send(`New GroupChat Created`);

  } catch (error) {
    console.error('Error creating New UserChat:', error);
    res.status(500).send('Internal Server Error');
  }
})
app.post('/SendMessage', async (req, res) => {
  try {
    const { message_guid, chat_guid, sender_guid, message_text, message_date } = req.body
    if (chat_guid == null) {
      res.status(200).json("Provide Chat Guid");
    }
    const query = `Insert into chatmessages (message_guid ,chat_guid, sender_guid, message_text, message_date) VALUES($1, $2,$3,$4,$5)`
    const response = await pool.query(query, [message_guid, chat_guid, sender_guid, message_text, message_date])
    res.status(200).json("Message Sent");

  } catch (error) {
    console.error('Error Getting UserChats:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get("/GetMessages/:chatguid", async (req, res) => {
  try {
    const chat_guid = req.params.chatguid;
    const query = `Select * from chatmessages where chat_guid like $1`
    const response = await pool.query(query, [chat_guid])
    res.status(200).json(response.rows)
  } catch (error) {
    console.error('Error Getting UserChat Messages:', error);
    res.status(500).send('Internal Server Error');
  }
})
app.post('/SendGroupMessage', async (req, res) => {
  try {
    const { message_guid, group_guid, sender_guid, message_text, message_date } = req.body
    if (chat_guid == null) {
      res.status(200).json("Provide Chat Guid");
    }
    const query = `Insert into groupmessages (message_guid ,group_guid, sender_guid, message_text, message_date) VALUES($1, $2,$3,$4,$5)`
    const response = await pool.query(query, [message_guid, group_guid, sender_guid, message_text, message_date])
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

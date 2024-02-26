const express = require('express')

const app = express()
//Imports
require('./Config/db')
const port = process.env.PORT || 8000;
app.use(express.json())
app.use(express.urlencoded({extended:false}));

app.get('/' , (req, res) => {
    res.send("Hello it's Ayan")
})

app.listen(port , () => {
    console.log(`Listening from port ${port}`)
})
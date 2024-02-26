const mongoose = require("mongoose");
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/ChatApplication" ).then(
    () => console.log("Connection succesfully")
).catch((err) => console.log(err)) //Promise
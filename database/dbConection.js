const mongoose = require('mongoose');
require('dotenv').config();

// (process.NODE_ENV === 'test') ?
mongoose.connect(
  process.env.MONGODB_URI,
  { 
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    useFindAndModify: false },
  (err) => {
    if(err) console.log(err) 
    else console.log("mongdb is connected");
   }
);
// :
// mongoose.connect(
// process.env.TEST_MONGODB_URI,
// { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }
// );

module.exports = mongoose;

const mongoose = require("mongoose");

const init = () => {
  mongoose.set("debug", true);

  mongoose
    .connect(process.env.DB_ATLAS_URL, {
      useNewUrlParser: true,
    })
    .catch((err) => {
      console.log(`Error: ${err.stack}`);
      // 1 for unsuccessful error
      process.exit(1);
    });

  mongoose.connection.on("open", () => {
    console.log("Connection on");
  });
};

module.exports = init;

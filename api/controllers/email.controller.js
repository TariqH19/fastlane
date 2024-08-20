const Email = require("../models/email.model.js");

const readData = (req, res) => {
  Email.find({})
    .then((data) => {
      console.log(data);

      if (data.length > 0) {
        res.status(200).json(data);
      } else {
        res.status(404).json("None Found");
      }
    })
    .catch((err) => {
      console.log(`Error getting all Emails ${err}`);
      res.status(500).json(err);
    });
};

const createData = (req, res) => {
  console.log(req.body);

  let inputData = req.body;

  Email.create(inputData)
    .then((data) => {
      console.log(`new Email created`);
      res.status(201).json(data);
    })
    .catch((err) => {
      if (err.name === "ValidationError") {
        res.status(422).json(err);
      } else {
        console.log(err);
        res.status(500).json(err);
      }
    });
};

module.exports = {
  readData,
  createData,
};

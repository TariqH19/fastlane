const Custom = require("../models/custom.model.js");

const readData = (req, res) => {
  Custom.find({})
    .then((data) => {
      console.log(data);

      if (data.length > 0) {
        res.status(200).json(data);
      } else {
        res.status(404).json("None Found");
      }
    })
    .catch((err) => {
      console.log(`Error getting all Customs ${err}`);
      res.status(500).json(err);
    });
};

const createData = (req, res) => {
  console.log(req.body);

  let inputData = req.body;

  Custom.create(inputData)
    .then((data) => {
      console.log(`new Custom created`);
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

const Cart = require("../models/cart.model.js");

const readData = (req, res) => {
  Cart.find({})
    .then((data) => {
      console.log(data);

      if (data.length > 0) {
        res.status(200).json(data);
      } else {
        res.status(404).json("None Found");
      }
    })
    .catch((err) => {
      console.log(`Error getting all Carts ${err}`);
      res.status(500).json(err);
    });
};

const createData = (req, res) => {
  console.log(req.body);

  let inputData = req.body;
  if (req.file) {
    inputData.file_path = req.file.filename;
  }

  Cart.create(inputData)
    .then((data) => {
      console.log(`new Cart created`);
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

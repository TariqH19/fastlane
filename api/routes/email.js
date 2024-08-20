const express = require("express");
const router = express.Router();

const { readData, createData } = require("../controllers/email.controller");

router.get("/", readData).post("/", createData);

module.exports = router;

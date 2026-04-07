const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/", settingsController.get);
router.patch("/", settingsController.update);

module.exports = router;


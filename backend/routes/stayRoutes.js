const express = require("express");
const router = express.Router();
const stayController = require("../controllers/stayController");

router.get("/", stayController.getAll);
router.post("/", stayController.create);
router.patch("/:id", stayController.update);

module.exports = router;

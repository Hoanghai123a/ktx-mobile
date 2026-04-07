const express = require("express");
const router = express.Router();
const floorController = require("../controllers/floorController");

router.get("/", floorController.getAll);
router.post("/", floorController.create);
router.delete("/:id", floorController.delete);

module.exports = router;

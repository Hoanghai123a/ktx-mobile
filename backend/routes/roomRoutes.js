const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");

router.get("/", roomController.getAll);
router.get("/:id", roomController.getById);
router.post("/", roomController.create);
router.patch("/:id", roomController.update);
router.delete("/:id", roomController.delete);

module.exports = router;

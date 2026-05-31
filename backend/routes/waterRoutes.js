const express = require("express");
const router = express.Router();
const waterController = require("../controllers/waterController");

router.get("/", waterController.getAll);
router.get("/room/:roomId", waterController.getByRoom);
router.post("/", waterController.upsert);
router.patch("/:id/pay", waterController.markPaid);
router.delete("/:id", waterController.delete);

module.exports = router;

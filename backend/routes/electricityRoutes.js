const express = require("express");
const router = express.Router();
const electricityController = require("../controllers/electricityController");

router.get("/", electricityController.getAll);
router.get("/room/:roomId", electricityController.getByRoom);
router.post("/", electricityController.upsert);
router.patch("/:id/pay", electricityController.markPaid);
router.delete("/:id", electricityController.delete);

module.exports = router;

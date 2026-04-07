const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");

router.get("/", workerController.getAll);
router.get("/:id", workerController.getById);
router.post("/", workerController.create);
router.patch("/:id", workerController.update);
router.delete("/:id", workerController.delete);

module.exports = router;

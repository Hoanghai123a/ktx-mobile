const express = require("express");
const router = express.Router();
const dataController = require("../controllers/dataController");

router.get("/load-all/", dataController.loadAll);
router.post("/init-ktx/", dataController.initKtx);
router.post("/wipe-database/", dataController.wipeDatabase);

module.exports = router;

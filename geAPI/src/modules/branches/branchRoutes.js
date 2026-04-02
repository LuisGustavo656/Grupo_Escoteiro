const express = require("express");
const router = express.Router();
const controller = require("../branches/branchController");
const auth = require("../../middleware/authMiddleware");

// Criar
router.post("/", auth, controller.createBranch);

// Listar
router.get("/", auth, controller.getBranches);

// Buscar por ID
router.get("/:id", auth, controller.getBranchById);

// Atualizar
router.put("/:id", auth, controller.updateBranch);

// Deletar
router.delete("/:id", auth, controller.deleteBranch);

module.exports = router;
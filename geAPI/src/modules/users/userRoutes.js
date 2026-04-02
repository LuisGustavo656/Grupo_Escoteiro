const express = require('express');
const router = express.Router();
const userController = require('./userController');

// Rota para listar todos os usuários
router.get('/', userController.getUsers);

// Rota para buscar um usuário específico por ID
router.get('/:id', userController.getUserById);

// Rota para criar um novo usuário (Cadastro)
router.post('/', userController.createUser);

// Rota para atualizar os dados de um usuário
router.put('/:id', userController.updateUser);

// Rota para deletar um usuário
router.delete('/:id', userController.deleteUser);

module.exports = router;
// src/middleware/roleMiddleware.js

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // O authMiddleware já colocou os dados do usuário logado no req.user
    const userGlobalRole = req.user.global_role;
    const userBranchRole = req.user.branch_role;

    // Verifica se alguma das roles do usuário está na lista de permissões daquela rota
    if (allowedRoles.includes(userGlobalRole) || allowedRoles.includes(userBranchRole)) {
      return next(); // Tem permissão! Pode passar.
    }

    // Se não tiver a permissão, barra na porta com o erro 403
    return res.status(403).json({ 
      message: "Acesso Negado. Seu cargo não permite realizar esta ação." 
    });
  };
};

module.exports = authorize;
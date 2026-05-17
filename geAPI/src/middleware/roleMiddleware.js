const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado no sistema." });
    }

    const userGlobalRole = req.user.global_role;
    const userBranchRole = req.user.branch_role;

    // Normaliza toda a lista de permissões recebida da rota para letras minúsculas
    const rolesPermitidas = allowedRoles.map(role => role.toLowerCase());

    // Verifica os cargos do usuário convertendo para minúsculo também (evita qualquer erro de digitação)
    const temGlobal = userGlobalRole && rolesPermitidas.includes(userGlobalRole.toLowerCase());
    const temBranch = userBranchRole && rolesPermitidas.includes(userBranchRole.toLowerCase());

    if (temGlobal || temBranch) {
      return next(); 
    }

    return res.status(403).json({ 
      message: "Acesso Negado. Seu cargo não permite realizar esta ação." 
    });
  };
};

module.exports = authorize;
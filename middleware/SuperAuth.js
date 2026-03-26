const check = (...allowedRoles) => {
  return (req, res, next) => {

    // ✅ user from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ role check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

module.exports = check;
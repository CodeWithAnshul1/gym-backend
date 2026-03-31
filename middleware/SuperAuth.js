module.exports = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userRole = req.user.role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      next();

    } catch (err) {
      console.log("ROLE MIDDLEWARE ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};
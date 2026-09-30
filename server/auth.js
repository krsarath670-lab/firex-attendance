import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'firex-attendance-secret-key-2026-secure';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findById('users', decoded.id);
    if (!user || user.status === 'Inactive') {
      req.user = null;
    } else {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id,
      };
    }
  } catch (err) {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in to continue.',
    });
  }
  next();
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`,
      });
    }

    next();
  };
}

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

export function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

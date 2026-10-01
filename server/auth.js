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
  if (!plainPassword) return '';
  return bcrypt.hashSync(plainPassword.trim(), 10);
}

export function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  const p1 = String(plainPassword);
  const p2 = p1.trim();
  // Direct match fallback
  if (p1 === hashedPassword || p2 === hashedPassword) return true;
  try {
    if (bcrypt.compareSync(p1, hashedPassword)) return true;
    if (bcrypt.compareSync(p2, hashedPassword)) return true;
  } catch (err) {
    // If hashedPassword is not a valid bcrypt hash, check direct string match
    return p1 === hashedPassword || p2 === hashedPassword;
  }
  return false;
}

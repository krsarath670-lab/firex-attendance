import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = express.Router();

// GET /api/sites
router.get('/', requireAuth, (req, res) => {
  const sites = db.get('sites');
  res.json(sites);
});

// POST /api/sites (Engineer/Supervisor)
router.post('/', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const { site_code, site_name, address, area, latitude, longitude, allowed_radius, status, remarks } = req.body;

  if (!site_name || !site_name.trim()) {
    return res.status(400).json({ error: 'Site Name is required.' });
  }

  const generatedCode = site_code || `SITE-${Date.now().toString().slice(-4)}`;

  const newSite = db.insert('sites', {
    id: `site-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    site_code: generatedCode.toUpperCase(),
    site_name: site_name.trim(),
    address: address || '',
    area: area || '',
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    allowed_radius: allowed_radius ? parseInt(allowed_radius, 10) : 100,
    status: status || 'Active',
    remarks: remarks || '',
  });

  db.audit({
    employee_id: null,
    action: 'SITE_CREATED',
    new_value: newSite,
    reason: `Site ${newSite.site_name} added`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.status(201).json({
    message: 'Site created successfully.',
    site: newSite,
  });
});

// PUT /api/sites/:id (Engineer/Supervisor)
router.put('/:id', requireAuth, requireRole(['ENGINEER', 'SUPERVISOR']), (req, res) => {
  const site = db.findById('sites', req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Site not found.' });
  }

  const { site_code, site_name, address, area, latitude, longitude, allowed_radius, status, remarks } = req.body;
  const oldSite = { ...site };

  const updatedSite = db.update('sites', site.id, {
    site_code: site_code !== undefined ? site_code.toUpperCase() : site.site_code,
    site_name: site_name !== undefined ? site_name.trim() : site.site_name,
    address: address !== undefined ? address : site.address,
    area: area !== undefined ? area : site.area,
    latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : site.latitude,
    longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : site.longitude,
    allowed_radius: allowed_radius !== undefined ? parseInt(allowed_radius, 10) : site.allowed_radius,
    status: status !== undefined ? status : site.status,
    remarks: remarks !== undefined ? remarks : site.remarks,
  });

  db.audit({
    employee_id: null,
    action: 'SITE_UPDATED',
    old_value: oldSite,
    new_value: updatedSite,
    reason: `Site ${updatedSite.site_name} updated`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: 'Site updated successfully.',
    site: updatedSite,
  });
});

// DELETE /api/sites/:id (Engineer only)
router.delete('/:id', requireAuth, requireRole(['ENGINEER']), (req, res) => {
  const site = db.findById('sites', req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Site not found.' });
  }

  // Soft deactivate instead of hard delete
  const updatedSite = db.update('sites', site.id, { status: 'Inactive' });

  db.audit({
    employee_id: null,
    action: 'SITE_DEACTIVATED',
    old_value: site,
    new_value: updatedSite,
    reason: `Site ${site.site_name} marked inactive`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({ message: 'Site deactivated successfully.', site: updatedSite });
});

export default router;

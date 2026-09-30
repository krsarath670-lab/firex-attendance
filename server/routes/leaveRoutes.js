import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { getBahrainDateString } from '../attendanceEngine.js';

const router = express.Router();

// GET /api/leaves (Management: view all leave requests)
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const { status, employee_id, leave_type } = req.query;
  let leaves = db.get('leaves') || [];

  if (status && status !== 'ALL') {
    leaves = leaves.filter((l) => l.status.toLowerCase() === status.toLowerCase());
  }
  if (employee_id && employee_id !== 'ALL') {
    leaves = leaves.filter((l) => l.employee_id === employee_id);
  }
  if (leave_type && leave_type !== 'ALL') {
    leaves = leaves.filter((l) => l.leave_type === leave_type);
  }

  // Sort by created_at desc
  leaves.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(leaves);
});

// GET /api/leaves/my-leaves (Employee: view own leave requests)
router.get('/my-leaves', requireAuth, (req, res) => {
  const employeeId = req.user.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: 'No employee ID associated with user.' });
  }

  const leaves = db.filter('leaves', (l) => l.employee_id === employeeId);
  leaves.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(leaves);
});

// POST /api/leaves/apply (Apply for leave)
router.post('/apply', requireAuth, (req, res) => {
  const { leave_type, start_date, end_date, reason, employee_id } = req.body;

  let targetEmployeeId = req.user.employee_id;
  let targetEmployeeName = req.user.name;

  // If management is applying on behalf of employee
  if (employee_id && ['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
    const emp = db.findOne('employees', (e) => e.employee_id === employee_id);
    if (emp) {
      targetEmployeeId = emp.employee_id;
      targetEmployeeName = emp.full_name;
    }
  }

  if (!targetEmployeeId) {
    return res.status(400).json({ error: 'Employee ID is required.' });
  }

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'Leave type, start date, end date, and reason are required.' });
  }

  const dStart = new Date(start_date);
  const dEnd = new Date(end_date);
  if (dEnd < dStart) {
    return res.status(400).json({ error: 'End date cannot be earlier than start date.' });
  }

  // Calculate total days inclusive
  const diffTime = Math.abs(dEnd - dStart);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const newLeave = db.insert('leaves', {
    id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    employee_id: targetEmployeeId,
    employee_name: targetEmployeeName,
    user_id: req.user.id,
    leave_type,
    start_date,
    end_date,
    total_days: totalDays,
    reason: reason.trim(),
    status: 'Pending',
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    rejection_reason: null,
  });

  db.audit({
    employee_id: targetEmployeeId,
    action: 'LEAVE_REQUESTED',
    new_value: { leave_id: newLeave.id, leave_type, start_date, end_date, totalDays },
    reason: `Leave request submitted: ${reason}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.status(201).json({
    message: 'Leave application submitted successfully.',
    leave: newLeave,
  });
});

// PUT /api/leaves/:id/status (Approve or Reject Leave)
router.put('/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR']), (req, res) => {
  const { status, rejection_reason } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
  }

  const leave = db.findById('leaves', req.params.id);
  if (!leave) {
    return res.status(404).json({ error: 'Leave request not found.' });
  }

  const oldStatus = leave.status;
  const nowIso = new Date().toISOString();

  const updatedLeave = db.update('leaves', leave.id, {
    status,
    reviewed_by: req.user.id,
    reviewed_by_name: req.user.name,
    reviewed_at: nowIso,
    rejection_reason: status === 'Rejected' ? rejection_reason || 'Not specified' : null,
  });

  db.audit({
    employee_id: leave.employee_id,
    action: status === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    old_value: { status: oldStatus },
    new_value: { status, reviewed_by: req.user.name, reviewed_at: nowIso },
    reason: status === 'Rejected' ? `Leave rejected: ${rejection_reason || 'N/A'}` : 'Leave approved by management',
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({
    message: `Leave request has been ${status.toLowerCase()} successfully.`,
    leave: updatedLeave,
  });
});

// DELETE /api/leaves/:id (Cancel or delete leave)
router.delete('/:id', requireAuth, (req, res) => {
  const leave = db.findById('leaves', req.params.id);
  if (!leave) {
    return res.status(404).json({ error: 'Leave record not found.' });
  }

  const isManagement = ['SUPER_ADMIN', 'ENGINEER', 'ADMIN', 'SUPERVISOR'].includes(req.user.role);
  const isOwner = leave.employee_id === req.user.employee_id;

  if (!isManagement && (!isOwner || leave.status !== 'Pending')) {
    return res.status(403).json({ error: 'You can only cancel your own pending leave requests.' });
  }

  db.delete('leaves', leave.id);

  db.audit({
    employee_id: leave.employee_id,
    action: 'LEAVE_CANCELLED',
    old_value: leave,
    reason: `Leave request cancelled by ${req.user.name}`,
    changed_by: req.user.id,
    changed_by_name: req.user.name,
  });

  res.json({ message: 'Leave request cancelled / deleted successfully.' });
});

export default router;

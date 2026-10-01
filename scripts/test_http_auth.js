async function testAuthCycle() {
  console.log('=== TESTING REAL HTTP AUTH CYCLE ===\n');
  const baseUrl = 'http://localhost:5050';

  // 1. Login as Engineer
  console.log('1. Logging in as Engineer (engineer / admin123)...');
  let res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'engineer', password: 'admin123' }),
  });
  let data = await res.json();
  if (!res.ok) throw new Error('Engineer login failed: ' + JSON.stringify(data));
  const engToken = data.token;
  console.log('✅ Engineer Logged In! Token received. User:', data.user.name);

  // 2. Change Engineer's password to NewPassword123!
  console.log('\n2. Resetting Engineer password to "NewPassword123!"...');
  res = await fetch(`${baseUrl}/api/auth/admin-reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${engToken}`,
    },
    body: JSON.stringify({
      userId: data.user.id,
      newPassword: 'NewPassword123!',
    }),
  });
  data = await res.json();
  if (!res.ok) throw new Error('Password reset failed: ' + JSON.stringify(data));
  console.log('✅ Password reset response:', data.message);

  // 3. Simulate Logout (discard token) & Login again with NEW password
  console.log('\n3. Logging in again with NEW password "NewPassword123!"...');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'engineer', password: 'NewPassword123!' }),
  });
  data = await res.json();
  if (!res.ok) throw new Error('Login with new password failed: ' + JSON.stringify(data));
  console.log('✅ Success! Logged in with new password after logout.');

  // 4. Verify old password no longer works
  console.log('\n4. Verifying old password "admin123" is rejected...');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'engineer', password: 'admin123' }),
  });
  if (res.status === 401) {
    console.log('✅ Old password correctly rejected (401 Unauthorized)');
  } else {
    throw new Error('Old password should have been rejected');
  }

  // 5. Restore engineer password to admin123 so admin doesn't get locked out
  console.log('\n5. Resetting Engineer password back to "admin123" for safety...');
  res = await fetch(`${baseUrl}/api/auth/admin-reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      userId: data.user.id,
      newPassword: 'admin123',
    }),
  });
  data = await res.json();
  if (!res.ok) throw new Error('Reset back failed');
  console.log('✅ Successfully restored engineer password.');

  // 6. Test Supervisor Login and Employee Login
  console.log('\n6. Testing Supervisor Login (supervisor / admin123)...');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'supervisor', password: 'admin123' }),
  });
  data = await res.json();
  if (!res.ok) throw new Error('Supervisor login failed');
  console.log('✅ Supervisor Login OK');

  console.log('\n=== ALL END-TO-END HTTP AUTH TESTS PASSED PERFECTLY! ===');
}

testAuthCycle().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});

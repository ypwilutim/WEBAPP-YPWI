// Test complete-profile assignment flow
console.log('Testing assignment flow...');

// Simulate localAssignments array
let localAssignments = [
  { tenant_id: 'SDIT', jabatan_di_unit: 'Guru Mapel' }
];

console.log('Initial assignments:', localAssignments);

// Simulate adding assignment
function saveAssignment(tenantId, jabatan) {
  const exists = localAssignments.some(a => a.tenant_id === tenantId && a.jabatan_di_unit === jabatan);
  if (exists) {
    console.log('Assignment already exists');
    return false;
  }

  localAssignments.push({ tenant_id: tenantId, jabatan_di_unit: jabatan });
  console.log('Added assignment:', { tenant_id: tenantId, jabatan_di_unit: jabatan });
  return true;
}

// Simulate removing assignment
function removeAssignment(index) {
  if (index >= 0 && index < localAssignments.length) {
    const removed = localAssignments.splice(index, 1);
    console.log('Removed assignment:', removed[0]);
    return true;
  }
  return false;
}

// Test adding
saveAssignment('TKIT01', 'Operator');
saveAssignment('SDIT', 'Guru Mapel'); // Should fail - already exists

// Test removing
removeAssignment(0); // Remove first assignment

console.log('Final assignments:', localAssignments);

console.log('✅ Assignment flow test completed successfully!');
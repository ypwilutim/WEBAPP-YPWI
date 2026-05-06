
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      window.location.href = 'login.html';
    }

    async function setTeacherInfo() {
      try {
        const response = await fetch('/api/teacher/info', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          const teacher = data.teacher;
          const assignments = data.assignments;
          document.getElementById('teacherName').textContent = teacher.nama || user.username || 'Guru';
          const schoolNames = assignments.map(a => a.nama_sekolah || a.tenant_id).join(', ');
          document.getElementById('teacherDetails').textContent = `Unit Sekolah: ${schoolNames || 'Tidak ada'}`;

          // Store assignments for location detection
          window.userAssignments = assignments;
        } else {
          document.getElementById('teacherName').textContent = user.username || 'Guru';
          document.getElementById('teacherDetails').textContent = 'Gagal memuat detail';
        }
      } catch (error) {
        console.error('Error loading teacher info:', error);
        document.getElementById('teacherName').textContent = user.username || 'Guru';
        document.getElementById('teacherDetails').textContent = 'Gagal memuat detail';
      }
    }

    let currentLocation = null;

    function updateLocationDisplay(success, message) {
      const locationInfo = document.getElementById('locationInfo');
      locationInfo.className = success ? 'location-info success' : 'location-info error';
      locationInfo.innerHTML = `<span>${message}</span>`;
    }

    function getLocationErrorMessage(error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          return 'Akses lokasi ditolak. Izinkan akses lokasi untuk melanjutkan.';
        case error.POSITION_UNAVAILABLE:
          return 'Lokasi tidak tersedia. Pastikan GPS aktif.';
        case error.TIMEOUT:
          return 'Timeout mendapatkan lokasi. Coba lagi.';
        default:
          return 'Error mendapatkan lokasi: ' + error.message;
      }
    }

    function enableAttendanceButtons() {
      // Don't enable buttons automatically - wait for radius validation
      updateAttendanceButtonsState();
    }

    function updateAttendanceButtonsState() {
      const checkInBtn = document.getElementById('checkInBtn');
      const checkOutBtn = document.getElementById('checkOutBtn');
      const locationInfo = document.getElementById('locationInfo');

      if (!currentLocation) {
        // No location available
        checkInBtn.disabled = true;
        checkOutBtn.disabled = true;
        locationInfo.className = 'location-info error';
        locationInfo.innerHTML = '<span>❌ Lokasi tidak tersedia. Aktifkan GPS untuk absensi.</span>';
        return;
      }

      // Validate radius with nearest school
      validateLocationRadius(currentLocation.latitude, currentLocation.longitude)
        .then(result => {
          if (result.withinRadius) {
            // Within radius - enable buttons
            checkInBtn.disabled = false;
            checkOutBtn.disabled = false;
            locationInfo.className = 'location-info success';
            locationInfo.innerHTML = `<span>✅ Lokasi valid - Dalam radius ${result.radius}m dari ${result.schoolName}</span>`;
          } else {
            // Outside radius - disable buttons
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
            locationInfo.className = 'location-info error';
            locationInfo.innerHTML = `<span>❌ Di luar radius! Jarak ${result.distance.toFixed(0)}m dari ${result.schoolName} (max ${result.radius}m)</span>`;
          }
        })
        .catch(error => {
          console.error('Radius validation error:', error);
          // On error, enable buttons as fallback (don't block users due to technical issues)
          checkInBtn.disabled = false;
          checkOutBtn.disabled = false;
          locationInfo.className = 'location-info warning';
          locationInfo.innerHTML = '<span>⚠️ Gagal memvalidasi lokasi. Absensi tetap diizinkan.</span>';
        });
    }

    async function validateLocationRadius(userLat, userLng) {
      try {
        const response = await fetch(`/api/units/nearby?lat=${userLat}&lng=${userLng}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch nearby units');
        }

        const data = await response.json();

        if (!data.success || !data.nearestUnit) {
          throw new Error('No nearby units found');
        }

        const nearestUnit = data.nearestUnit;
        const schoolLat = data.units.find(u => u.tenant_id === nearestUnit.tenant_id)?.latitude;
        const schoolLng = data.units.find(u => u.tenant_id === nearestUnit.tenant_id)?.longitude;

        if (!schoolLat || !schoolLng) {
          // No coordinates available for school - allow attendance
          return {
            withinRadius: true,
            distance: nearestUnit.distance,
            radius: 100,
            schoolName: nearestUnit.nama_sekolah
          };
        }

        // Calculate actual distance to school coordinates
        const distance = calculateDistance(userLat, userLng, parseFloat(schoolLat), parseFloat(schoolLng));
        const radius = data.units.find(u => u.tenant_id === nearestUnit.tenant_id)?.location_radius || 100;

        return {
          withinRadius: (distance * 1000) <= radius,
          distance: distance * 1000, // Convert to meters
          radius: radius,
          schoolName: nearestUnit.nama_sekolah
        };
      } catch (error) {
        console.error('Error validating radius:', error);
        // Return safe defaults on error
        return {
          withinRadius: true, // Allow attendance on error
          distance: 0,
          radius: 100,
          schoolName: 'Sekolah'
        };
      }
    }

    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance;
    }

    async function detectNearbyUnits(lat, lng) {
      try {
        const response = await fetch(`/api/units/nearby?lat=${lat}&lng=${lng}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          const nearestUnit = data.nearestUnit;
          if (nearestUnit) {
            console.log('Nearest unit detected:', nearestUnit);
            // Update UI to show nearest unit
            const locationInfo = document.getElementById('locationInfo');
            const existingText = locationInfo.querySelector('span').textContent;
            locationInfo.innerHTML = `<span>${existingText}<br><small>🏫 Unit Terdekat: ${nearestUnit.nama_sekolah} (${nearestUnit.distance.toFixed(1)}km)</small></span>`;
          }
        }
      } catch (error) {
        console.error('Error detecting nearby units:', error);
      }
    }

    let locationWatcher = null;

    function requestLocationPermission() {
      if ('geolocation' in navigator) {
        // Initial location request
        navigator.geolocation.getCurrentPosition(
          async function(position) {
            currentLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            updateLocationDisplay(true, `Lokasi didapatkan (${Math.round(position.coords.accuracy)}m akurasi)`);
            updateAttendanceButtonsState();

            // Detect nearby units
            await detectNearbyUnits(position.coords.latitude, position.coords.longitude);

            // Start watching for location changes
            startLocationWatcher();
          },
          function(error) {
            console.error('Location error:', error);
            updateLocationDisplay(false, getLocationErrorMessage(error));
            updateAttendanceButtonsState();
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 300000
          }
        );
      } else {
        updateLocationDisplay(false, 'Geolokasi tidak didukung oleh browser ini.');
        updateAttendanceButtonsState();
      }
    }

    function startLocationWatcher() {
      if (locationWatcher) {
        navigator.geolocation.clearWatch(locationWatcher);
      }

      locationWatcher = navigator.geolocation.watchPosition(
        function(position) {
          // Update location if it changed significantly (>10 meters)
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          const distanceChanged = currentLocation ?
            calculateDistance(
              currentLocation.latitude, currentLocation.longitude,
              newLocation.latitude, newLocation.longitude
            ) * 1000 > 10 : true; // Always update if no previous location

          if (distanceChanged) {
            console.log('Location changed, updating status...');
            currentLocation = newLocation;
            updateLocationDisplay(true, `Lokasi diperbarui (${Math.round(position.coords.accuracy)}m akurasi)`);
            updateAttendanceButtonsState();
          }
        },
        function(error) {
          console.warn('Location watch error:', error);
          // Don't update display for watch errors, keep current status
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    }

    async function recordAttendance(jenis) {
      if (!currentLocation) {
        alert('Lokasi belum didapatkan. Silakan coba lagi.');
        return;
      }

      const metode = 'dashboard';
      const checkInBtn = document.getElementById('checkInBtn');
      const checkOutBtn = document.getElementById('checkOutBtn');

      checkInBtn.disabled = true;
      checkOutBtn.disabled = true;

      const originalText = jenis === 'masuk' ? checkInBtn.innerHTML : checkOutBtn.innerHTML;
      const processingBtn = jenis === 'masuk' ? checkInBtn : checkOutBtn;
      processingBtn.innerHTML = '<i class="fas fa-spinner spinner" style="margin-right: 0.5rem;"></i>Menyimpan...';

      try {
        if (!navigator.onLine) {
          const offlineData = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
          const attendanceRecord = {
            id: Date.now(),
            jenis: jenis,
            metode: metode,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            token: token,
            timestamp: new Date().toISOString()
          };
          offlineData.push(attendanceRecord);
          localStorage.setItem('offlineAttendance', JSON.stringify(offlineData));
          showAttendanceResult(true, 'Absensi disimpan offline. Akan dikirim saat online.', { offline: true });
          loadTodaySummary();
          return;
        }

        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            jenis: jenis,
            metode: metode,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          })
        });

        const result = await response.json();

        if (result.success) {
          showAttendanceResult(true, result.message, result.data);
          loadTodaySummary();
        } else {
          showAttendanceResult(false, result.message);
        }
      } catch (error) {
        console.error('Attendance error:', error);
        showAttendanceResult(false, 'Terjadi kesalahan saat mengirim absensi');
      } finally {
        checkInBtn.disabled = false;
        checkOutBtn.disabled = false;
        processingBtn.innerHTML = originalText;
      }
    }

    function showAttendanceResult(success, message, data = null) {
      const icon = success ? 'check-circle' : 'exclamation-triangle';
      const color = success ? 'green' : 'red';
      const title = success ? 'Berhasil' : 'Gagal';

      Swal.fire({
        title: title,
        text: message,
        icon: success ? 'success' : 'error',
        confirmButtonColor: '#066e3a'
      });
    }

    function updateConnectionStatus() {
      const statusEl = document.getElementById('connectionStatus');
      if (navigator.onLine) {
        statusEl.innerHTML = '<i class="fas fa-circle text-green-500 mr-1"></i>Sistem Online';
        statusEl.className = 'badge badge-success';
      } else {
        statusEl.innerHTML = '<i class="fas fa-wifi-slash text-red-500 mr-1"></i>Koneksi Offline';
        statusEl.className = 'badge badge-error';
      }
    }

    function showOfflineMessage() {
      updateConnectionStatus();
    }

    async function syncOfflineAttendance() {
      updateConnectionStatus();

      try {
        const offlineData = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
        if (offlineData.length === 0) return;

        let syncedCount = 0;
        for (const data of offlineData) {
          try {
            const response = await fetch('/api/attendance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`
              },
              body: JSON.stringify({
                jenis: data.jenis,
                metode: data.metode,
                latitude: data.latitude,
                longitude: data.longitude
              })
            });

            if (response.ok) {
              syncedCount++;
              const index = offlineData.indexOf(data);
              offlineData.splice(index, 1);
            }
          } catch (error) {
            console.error('Failed to sync:', data.id, error);
          }
        }

        localStorage.setItem('offlineAttendance', JSON.stringify(offlineData));

        if (syncedCount > 0) {
          showAttendanceResult(true, `${syncedCount} absensi offline berhasil dikirim`);
          loadTodaySummary();
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }

    function updateAttendanceButtons(hasMasuk, hasPulang) {
      const checkInBtn = document.getElementById('checkInBtn');
      const checkOutBtn = document.getElementById('checkOutBtn');

      if (!hasMasuk) {
        checkInBtn.style.display = 'inline-block';
        checkOutBtn.style.display = 'none';
        checkInBtn.disabled = false;
        checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 0.5rem;"></i>Absen Masuk';
      } else if (!hasPulang) {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'inline-block';
        checkOutBtn.disabled = false;
        checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt" style="margin-right: 0.5rem;"></i>Absen Pulang';
      } else {
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'none';
        updateLocationDisplay(true, 'Absensi hari ini telah lengkap ✅');
      }
    }

    async function loadTodaySummary() {
      console.log('loadTodaySummary called');
      try {
        const response = await fetch('/api/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('response status:', response.status);

        let data = null;
        if (response.ok) {
          data = await response.json();
          if (data.success) {
            document.getElementById('totalAttendance').textContent = data.data.totalAbsensi;
            document.getElementById('lastStatus').textContent = data.data.absensiToday;
            document.getElementById('lastStatus').className = data.data.absensiToday === 'Belum absen' ? 'badge badge-warning' : 'badge badge-success';

            // Update attendance buttons based on today's status
            updateAttendanceButtons(data.data.hasMasuk, data.data.hasPulang);
          }
        }

            if (data && data.user && data.user.is_default_password) {
              console.log('Showing password change modal now');
              const modal = document.getElementById('changePasswordModal');
              console.log('Modal element:', modal);
              if (modal) {
                modal.classList.add('show');
                console.log('Modal classes after:', modal.className);
              } else {
                console.error('Modal not found');
              }
            } else {
              console.log('Not showing modal - conditions not met');
            }

      } catch (error) {
        console.error('Summary load error:', error);
      }
    }





    async function loadRecentAttendance() {
      console.log('Loading recent attendance');
      try {
        const response = await fetch('/api/attendance-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Attendance history response status:', response.status);

        const recentDiv = document.getElementById('recentAttendance');

        if (response.ok) {
          const data = await response.json();
          console.log('Attendance history data:', data);
          if (data.success && data.data.length > 0) {
            recentDiv.innerHTML = data.data.map(attendance => `
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
                <div>
                  <p class="font-medium text-gray-900">${attendance.jenis === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'}</p>
                  <p class="text-sm text-gray-600">${new Date(attendance.waktu_scan).toLocaleString('id-ID')}</p>
                </div>
                <span class="badge ${attendance.status === 'tepat_waktu' ? 'badge-success' : 'badge-warning'}">
                  ${attendance.status === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}
                </span>
              </div>
            `).join('');
          } else {
            recentDiv.innerHTML = '<p class="text-center text-gray-500">Belum ada riwayat absensi</p>';
          }
        } else {
          console.log('Response not ok');
          recentDiv.innerHTML = '<p class="text-center text-red-500">Gagal memuat riwayat</p>';
        }
      } catch (error) {
        console.error('Recent attendance load error:', error);
        document.getElementById('recentAttendance').innerHTML = '<p class="text-center text-red-500">Error loading data</p>';
      }
    }

    function logout() {
      console.log('Logout called');
      if (confirm('Apakah Anda yakin ingin logout?')) {
        localStorage.clear();
        window.location.replace('login.html');
      }
    }

    function closeChangePasswordModal() {
      document.getElementById('changePasswordModal').classList.remove('show');
      // Clear fields
      document.getElementById('oldPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    }

    async function changePassword() {
      const oldPassword = document.getElementById('oldPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!oldPassword || !newPassword || !confirmPassword) {
        Swal.fire('Error', 'Semua field harus diisi', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        Swal.fire('Error', 'Password baru dan konfirmasi tidak cocok', 'error');
        return;
      }

      if (newPassword.length < 8) {
        Swal.fire('Error', 'Password baru minimal 8 karakter', 'error');
        return;
      }

      // Check password strength
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        Swal.fire('Error', 'Password harus mengandung huruf besar, huruf kecil, dan angka', 'error');
        return;
      }

      try {
        const response = await fetch('/api/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            oldPassword: oldPassword,
            newPassword: newPassword,
            confirmPassword: confirmPassword
          })
        });

        const result = await response.json();
        if (result.success) {
          Swal.fire('Berhasil', 'Password berhasil diubah', 'success');
          closeChangePasswordModal();
        } else {
          Swal.fire('Error', result.message, 'error');
        }
      } catch (error) {
        console.error('Change password error:', error);
        Swal.fire('Error', 'Terjadi kesalahan', 'error');
      }
    }

    // Initialize on load
    initializeDashboard();

    function initializeDashboard() {
      console.log('Initializing dashboard');
      setTeacherInfo();
      requestLocationPermission();
      loadTodaySummary();
      loadRecentAttendance();
      updateConnectionStatus();

      window.addEventListener('online', syncOfflineAttendance);
      window.addEventListener('offline', showOfflineMessage);
    }
  
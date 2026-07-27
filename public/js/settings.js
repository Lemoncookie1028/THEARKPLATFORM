// Settings panel: account info + password reset.

function openSettingsPanel() {
  if (!currentUser) { showToast('Please sign in first'); return; }

  document.getElementById('settingsEmail').textContent = currentUser.email || '—';

  const fbUser = firebase.auth().currentUser;
  const verified = fbUser ? fbUser.emailVerified : false;
  document.getElementById('settingsVerified').textContent = verified ? 'Yes' : 'No';

  document.getElementById('settingsPanel').classList.add('open');
}

function closeSettingsPanel() {
  document.getElementById('settingsPanel').classList.remove('open');
}

function setupSettingsUI() {
  const closeBtn = document.getElementById('closeSettingsPanel');
  if (closeBtn) closeBtn.addEventListener('click', closeSettingsPanel);

  const resetBtn = document.getElementById('settingsResetPasswordBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!currentUser || !currentUser.email) {
        showToast('No email on file');
        return;
      }
      await resetPassword(currentUser.email);
    });
  }
}

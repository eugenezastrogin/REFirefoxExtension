import type { StoredSettings } from './types';

const storageDefaults: StoredSettings = {
  weight: 70,
  cp: 0,
  strideLengthToggle: true,
  cpToggle: true,
  fprToggle: true,
  wpkgToggle: true,
};

function save_options() {
  // @ts-ignore
  const weight = document.getElementById('weight').value;
  // @ts-ignore
  const cp = document.getElementById('cp').value;
  // @ts-ignore
  const strideLengthToggle = document.getElementById('strideLengthToggle').checked;
  // @ts-ignore
  const cpToggle = document.getElementById('cpToggle').checked;
  // @ts-ignore
  const fprToggle = document.getElementById('fprToggle').checked;
  // @ts-ignore
  const wpkgToggle = document.getElementById('wpkgToggle').checked;
  browser.storage.sync.set(
    {
      weight: weight,
      cp: cp,
      strideLengthToggle: strideLengthToggle,
      cpToggle: cpToggle,
      fprToggle: fprToggle,
      wpkgToggle: wpkgToggle,
    },
    // @ts-ignore
    function () {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      // @ts-ignore
      status.textContent = 'Options saved.';
      setTimeout(function () {
        // @ts-ignore
        status.textContent = '';
      }, 750);
    },
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // @ts-ignore
  browser.storage.sync.get(storageDefaults).then((items: StoredSettings) => {
    // @ts-ignore
    document.getElementById('weight').value = items.weight;
    // @ts-ignore
    document.getElementById('cp').value = items.cp;
    // @ts-ignore
    document.getElementById('strideLengthToggle').checked =
      items.strideLengthToggle;
    // @ts-ignore
    document.getElementById('cpToggle').checked = items.cpToggle;
    // @ts-ignore
    document.getElementById('fprToggle').checked = items.fprToggle;
    // @ts-ignore
    document.getElementById('wpkgToggle').checked = items.wpkgToggle;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
(document.getElementById('save') as HTMLButtonElement).addEventListener(
  'click',
  save_options,
);

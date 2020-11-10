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
  const weight = +(document.getElementById('weight') as HTMLInputElement).value;
  const cp = +(document.getElementById('cp') as HTMLInputElement).value;
  const strideLengthToggle = (document.getElementById(
    'strideLengthToggle',
  ) as HTMLInputElement).checked;
  const cpToggle = (document.getElementById('cpToggle') as HTMLInputElement)
    .checked;
  const fprToggle = (document.getElementById('fprToggle') as HTMLInputElement)
    .checked;
  const wpkgToggle = (document.getElementById('wpkgToggle') as HTMLInputElement)
    .checked;
  browser.storage.sync
    .set({
      weight,
      cp,
      strideLengthToggle,
      cpToggle,
      fprToggle,
      wpkgToggle,
    })
    .then(() => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status') as HTMLDivElement;
      status.textContent = 'Options saved.';
      setTimeout(function () {
        status.textContent = '';
      }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in browser.storage.
function restore_options() {
  // @ts-ignore
  browser.storage.sync.get(storageDefaults).then((items: StoredSettings) => {
    (document.getElementById('weight') as HTMLInputElement).value = String(
      items.weight,
    );
    (document.getElementById('cp') as HTMLInputElement).value = String(
      items.cp,
    );
    (document.getElementById(
      'strideLengthToggle',
    ) as HTMLInputElement).checked = items.strideLengthToggle;
    (document.getElementById('cpToggle') as HTMLInputElement).checked =
      items.cpToggle;
    (document.getElementById('fprToggle') as HTMLInputElement).checked =
      items.fprToggle;
    (document.getElementById('wpkgToggle') as HTMLInputElement).checked =
      items.wpkgToggle;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
(document.getElementById('save') as HTMLButtonElement).addEventListener(
  'click',
  save_options,
);

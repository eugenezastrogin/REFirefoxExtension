function save_options() {
  var weight = document.getElementById('weight').value;
  var cp = document.getElementById('cp').value;
  var strideLengthToggle = document.getElementById('strideLengthToggle')
    .checked;
  var cpToggle = document.getElementById('cpToggle').checked;
  var fprToggle = document.getElementById('fprToggle').checked;
  var wpkgToggle = document.getElementById('wpkgToggle').checked;
  chrome.storage.sync.set(
    {
      weight: weight,
      cp: cp,
      strideLengthToggle: strideLengthToggle,
      cpToggle: cpToggle,
      fprToggle: fprToggle,
      wpkgToggle: wpkgToggle,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function () {
        status.textContent = '';
      }, 750);
    },
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get(
    {
      weight: '70',
      cp: '0',
      strideLengthToggle: true,
      cpToggle: true,
      fprToggle: true,
      wpkgToggle: true,
    },
    function (items) {
      document.getElementById('weight').value = items.weight;
      document.getElementById('cp').value = items.cp;
      document.getElementById('strideLengthToggle').checked =
        items.strideLengthToggle;
      document.getElementById('cpToggle').checked = items.cpToggle;
      document.getElementById('fprToggle').checked = items.fprToggle;
      document.getElementById('wpkgToggle').checked = items.wpkgToggle;
    },
  );
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);

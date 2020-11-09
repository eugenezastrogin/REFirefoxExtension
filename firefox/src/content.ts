import type {
  REData,
  LapData,
  CriticalPower,
  FormPower,
  StoredSettings,
} from './types';
type Stat = [boolean, string, string, string, string];

const storageDefaults: StoredSettings = {
  weight: 70,
  cp: 0,
  strideLengthToggle: true,
  cpToggle: true,
  fprToggle: true,
  wpkgToggle: true,
};

function calcREData(
  criticalPower: CriticalPower,
  formPower: FormPower,
  weight: number,
  [time, meters, watts, cadence]: LapData,
): REData {
  const cpp = Math.floor((watts / criticalPower) * 100);
  const strideLength = ((meters / time) * 60) / cadence;
  const re = meters / time / (watts / weight);
  const wkg = watts / weight;
  const fpr = formPower / watts;

  return [re, cpp, strideLength, wkg, fpr];
}

function addOrCreateMainStatsNode(
  selector: string,
  label: string,
  value: string,
  valueClass = '',
) {
  const mainStatsContainerSelector =
    '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div';
  const mainStatsContainerEntrySelector = mainStatsContainerSelector + ' > div';

  function addMainStatsNode(label: string, value: string, valueClass = '') {
    const templateNode = document
      .querySelector<HTMLDivElement>(mainStatsContainerEntrySelector)!
      .cloneNode(true) as HTMLDivElement;
    const [valueP, labelP] = templateNode.querySelectorAll('p');
    valueP.innerText = value;
    valueP.classList.add(valueClass);
    labelP.innerText = label;
    document
      .querySelector(mainStatsContainerSelector)!
      .appendChild(templateNode);
  }

  const el = document.querySelector<HTMLDivElement>(selector);

  if (el) {
    el.innerText = value;
  } else {
    addMainStatsNode(label, value, valueClass);
  }
}

let weight = 0.0;
let cpRE = 0;
let cp = 0;
let strideLengthToggle = true;
let cpToggle = true;
let fprToggle = true;
let wpkgToggle = true;

const lapSelector = '.sc-fzXfQW.ldoxsf';
const lapCellSelector = '.common__TableCell-sc-548q8v-0.jQjFcA';

//get weight/cp from browser settings
browser.storage.sync
  .get(storageDefaults)
  // @ts-ignore
  .then((items: StoredSettings) => {
    console.log('STORED SETTINGS', items);
    weight = items.weight;
    cpRE = items.cp;
    strideLengthToggle = items.strideLengthToggle;
    cpToggle = items.cpToggle;
    fprToggle = items.fprToggle;
    wpkgToggle = items.wpkgToggle;
    //if user value for CP is not an integer or is not between 1 and 15000 then set to 0
    if (Math.floor(cpRE) == cpRE) {
      if (cpRE < 0 || cpRE > 1500) {
        cpRE = 0;
      }
    } else {
      cpRE = 0;
    }
  });

//setups up listening for changes to moving time, distance, power at the top
function detection() {
  //whenever Moving Time changes update selection RE
  $('body').on('DOMSubtreeModified', '.movingTimeRE', function () {
    setupSelectionRE();
  });

  //whenever Distance changes update selection RE
  $('body').on('DOMSubtreeModified', '.distanceRE', function () {
    setupSelectionRE();
  });

  //whenever Power changes update selection RE
  $('body').on('DOMSubtreeModified', '#powerRE', function () {
    setupSelectionRE();
  });

  //wait for fullscreenmodal to exist before running all RE extension setup
  waitForElement('.FullScreenModal__ModalContainer-sc-1x1pf1f-0', function () {
    setTimeout(function () {
      doEverything();
      //after setup now wait for the modal container to not exist and when it doesn't setup detection again
      waitForElementNotExist(
        '.FullScreenModal__ModalContainer-sc-1x1pf1f-0',
        function () {
          setTimeout(function () {
            detection();
          }, 1000);
        },
      );
    }, 1000);
  });

  //wait for analysispage container to exist before running all RE extension setup
  waitForElement('.AnalysisPage__AnalysisContainer-sc-3lhrby-0', function () {
    setTimeout(function () {
      doEverything();
    }, 1000);
  });
}

//adds classes to specific elements so that we can find and update elements easier
function addClasses() {
  setTimeout(function () {
    //add a class to the Moving Time and Distance values at top of page to track changes easier
    $(
      '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div > div',
    ).each(function () {
      if ($(this).is(':contains("Moving Time")')) {
        $(this).addClass('movingTimeRE');
      }
      if ($(this).is(':contains("Distance")')) {
        $(this).addClass('distanceRE');
      }
    });
    //add a id to the Power values at top of page to track changes easier
    $('.MetricDisplayChartToggle__MetricContainer-sc-1ht865t-0').each(
      function () {
        if (
          $(this).is(':contains("Power")') &&
          $(this).is(':not(:contains("Form"))') &&
          $(this).is(':not(:contains("Air"))')
        ) {
          $(this).attr('id', 'powerRE');
        }
      },
    );
    $('.MetricDisplayChartToggle__MetricContainer-sc-1ht865t-0').each(
      function () {
        if ($(this).is(':contains("Cadence")')) {
          $(this).attr('id', 'cadenceRE');
        }
      },
    );
    $('.MetricDisplayChartToggle__MetricContainer-sc-1ht865t-0').each(
      function () {
        if ($(this).is(':contains("Form Power")')) {
          $(this).attr('id', 'formPowerRE');
        }
      },
    );
  }, 1000);
}

//do all work to display extension data in at the top of run
function setupSelectionRE() {
  setTimeout(function () {
    let time = 0;
    let meters = 0;
    const timeText = $('.movingTimeRE').text().replace('Moving Time', '');
    const split = timeText.split(':');
    if (split.length == 3) {
      time = +split[0] * 60 * 60 + +split[1] * 60 + +split[2];
    } else if (split.length == 2) {
      time = +split[0] * 60 + +split[1];
    } else {
      time = +split[0];
    }
    const metersText = $('.distanceRE').text().replace('Distance', '');
    if (metersText.indexOf('km') !== -1) {
      meters = parseFloat(metersText.replace(' km', '')) * 1000;
    } else if (metersText.indexOf('mi') !== -1) {
      meters = parseFloat(metersText.replace(' mi', '')) * 1609.34;
    } else if (metersText.indexOf(' m') !== -1) {
      meters = parseFloat(metersText.replace(' m', ''));
    }
    const powerText = $('#powerRE').text().replace('Power', '');
    const cadenceText = $('#cadenceRE').text().replace('Cadence', '');
    const formPowerText = $('#formPowerRE').text().replace('Form Power', '');
    const watts = parseFloat(powerText.replace(' W', ''));
    const cadence = parseFloat(cadenceText.replace(' spm', ''));
    const formPower = parseFloat(formPowerText.replace(' W', ''));

    const [RE, cpp, strideLength, WPkg, fpr] = calcREData(
      cp,
      formPower,
      weight,
      [time, meters, watts, cadence],
    );
    const reStat: Stat = [
      !!RE,
      '.reValueSelectionRE',
      'RE',
      RE.toFixed(3),
      'reValueSelectionRE',
    ];
    const cppStat: Stat = [
      !!cpp && cpToggle,
      '.cpValueSelectionRE',
      'CP',
      `${cpp} %`,
      'cpValueSelectionRE',
    ];
    const strideStat: Stat = [
      !!strideLength && strideLengthToggle,
      '.lenValueSelectionRE',
      'Str Len',
      `${strideLength.toFixed(2)} m`,
      'lenValueSelectionRE',
    ];
    const wpkgStat: Stat = [
      !!WPkg && wpkgToggle,
      '.wpkgValueSelectionRE',
      'W/kg',
      WPkg.toFixed(2),
      'wpkgValueSelectionRE',
    ];
    const fprStat: Stat = [
      !!fpr && fprToggle,
      '.fprValueSelectionRE',
      'FPR',
      fpr.toFixed(2),
      'fprValueSelectionRE',
    ];
    const stats: Stat[] = [reStat, cppStat, strideStat, wpkgStat, fprStat];

    stats.forEach(([on, ...rest]) => on && addOrCreateMainStatsNode(...rest));
  }, 1000);
}

function getCPForRun() {
  if (cpRE == 0) {
    const rawBrowserValue = $('.label-line-text').text();
    const browserValue = parseInt(
      rawBrowserValue.toString().replace('CP ', '').replace(' W', ''),
    );
    cp = browserValue;
  }
  //if extension setting for RE is not 0 then use that value
  else {
    cp = cpRE;
  }
}

//function used to wait for an element to exist
function waitForElement(
  elementPath: string,
  callBack: (s: string, f: any) => any,
) {
  window.setTimeout(function () {
    if ($(elementPath).length) {
      callBack(elementPath, $(elementPath));
    } else {
      waitForElement(elementPath, callBack);
    }
  }, 500);
}

//function used to wait for an element to not exist
function waitForElementNotExist(
  elementPath: string,
  callBack: (s: string, f: any) => any,
) {
  window.setTimeout(function () {
    if (!$(elementPath).length) {
      callBack(elementPath, $(elementPath));
    } else {
      waitForElementNotExist(elementPath, callBack);
    }
  }, 500);
}

//function that just does all the things
function doEverything() {
  getCPForRun();
  addClasses();
  setupSelectionRE();
}

//wait for page ready and setup detection and then do everything
$(document).ready(function () {
  detection();
  doEverything();
});

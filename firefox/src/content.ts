import type {
  REData,
  LapData,
  CriticalPower,
  FormPower,
  StoredSettings,
} from './types';
type Stat = [boolean, string, string, string, string];

let weight = 0.0;
let cpRE = 0;
let cp = 0;
let strideLengthToggle = true;
let cpToggle = true;
let fprToggle = true;
let wpkgToggle = true;

let observers: (() => void)[] = [];

// const lapSelector = '.sc-fzXfQW.ldoxsf';
// const lapCellSelector = '.common__TableCell-sc-548q8v-0.jQjFcA';
const storageDefaults: StoredSettings = {
  weight: 70,
  cp: 0,
  strideLengthToggle: true,
  cpToggle: true,
  fprToggle: true,
  wpkgToggle: true,
};
const debounceEvent = (
  callback: () => void,
  delay = 100,
) => () => {
  let interval: NodeJS.Timeout;
  clearTimeout(interval!);
  interval = setTimeout(() => {
    callback();
  }, delay);
};
const setupSelectionRE = debounceEvent(_setupSelectionRE);

// Functions

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

//get weight/cp from browser settings
browser.storage.sync
  .get(storageDefaults)
  // @ts-ignore
  .then((items: StoredSettings) => {
    weight = items.weight;
    cpRE = items.cp;
    strideLengthToggle = items.strideLengthToggle;
    cpToggle = items.cpToggle;
    fprToggle = items.fprToggle;
    wpkgToggle = items.wpkgToggle;
    // if user value for CP is not between 1 and 15000 then set to 0
    if (cpRE < 0 || cpRE > 1500) {
      cpRE = 0;
    }
  });

function getSelectionMetrics() {
  const selectionDataSelector =
    '.MetricDisplayChartToggle__DataValue-sc-1ht865t-2.huoJmS';
  const runContainerEntrySelector =
    '.ActivitySelectionInfo__StatText-sc-3hapn2-3.jAjnpu';
  const coloredStats = document.querySelectorAll(selectionDataSelector);
  const topStats = document.querySelectorAll(runContainerEntrySelector);
  const [powerNode, , , cadenceNode, , formPowerNode] = [...coloredStats];
  // Sample output:
  // [ "251 W", "5:26 /km", "142 m", "183 spm", "138 bpm", "71 W", "255 ms", "12.5 kN/m", "5.87 cm", "2 %" ]

  const [movingTimeNode, distanceNode] = [...topStats];
  const trackedNodes = [
    powerNode,
    cadenceNode,
    formPowerNode,
    movingTimeNode,
    distanceNode,
  ];
  const [
    rawPower,
    rawCadence,
    rawFormPower,
    rawMovingTime,
    rawDistance,
  ] = trackedNodes.map(n => n.innerHTML);
  const watts = parseFloat(rawPower.replace('Power', '').replace(' W', ''));
  const cadence = parseFloat(
    rawCadence.replace('Cadence', '').replace(' spm', ''),
  );
  const formPower = parseFloat(
    rawFormPower.replace('Form Power', '').replace(' W', ''),
  );

  let meters = 0;
  const metersText = rawDistance.replace('Distance', '');
  if (metersText.indexOf('km') !== -1) {
    meters = parseFloat(metersText.replace(' km', '')) * 1000;
  } else if (metersText.indexOf('mi') !== -1) {
    meters = parseFloat(metersText.replace(' mi', '')) * 1609.34;
  } else if (metersText.indexOf(' m') !== -1) {
    meters = parseFloat(metersText.replace(' m', ''));
  }

  let movingTime;
  const timeText = rawMovingTime.replace('Moving Time', '');
  const split = timeText.split(':');
  if (split.length == 3) {
    movingTime = +split[0] * 60 * 60 + +split[1] * 60 + +split[2];
  } else if (split.length == 2) {
    movingTime = +split[0] * 60 + +split[1];
  } else {
    movingTime = +split[0];
  }

  return [
    [movingTime, meters, watts, cadence, formPower],
    trackedNodes,
  ] as const;
}

function detection() {
  // wait for fullscreenmodal to exist before running all RE extension setup
  const runContainerSelector = '.AnalysisPage__AnalysisContainer-sc-3lhrby-0';
  waitForElement(runContainerSelector, () => {
    setupSelectionRE();
    waitForElementNotExist(runContainerSelector, detection);
  });
}

// do all work to display extension data in at the top of run
function _setupSelectionRE() {
  observers.forEach(o => o());
  getCPForRun();
  const [
    [movingTime, meters, watts, cadence, formPower],
    trackedNodes,
  ] = getSelectionMetrics();

  const [RE, cpp, strideLength, WPkg, fpr] = calcREData(cp, formPower, weight, [
    movingTime,
    meters,
    watts,
    cadence,
  ]);
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
  console.log(stats);

  stats.forEach(([on, ...rest]) => on && addOrCreateMainStatsNode(...rest));
  observers = trackedNodes.map(n => onElementChange(n, setupSelectionRE));
}

function getCPForRun() {
  const cpSelector = '.label-line-text';
  if (cpRE === 0) {
    const rawBrowserValue = document
      .querySelector<SVGTextElement>(cpSelector)!
      .innerHTML.replace('CP ', '')
      .replace(' W', '');
    cp = parseInt(rawBrowserValue);
  } else {
    // if extension setting for RE is not 0 then use that value
    cp = cpRE;
  }
}

function waitForElement(selector: string, callBack: () => void) {
  const observer = new MutationObserver(function (_, me) {
    const el = document.querySelector(selector);
    if (el) {
      callBack();
      me.disconnect(); // stop observing
      return;
    }
  });

  // start observing
  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

function waitForElementNotExist(selector: string, callBack: () => void) {
  const observer = new MutationObserver(function (_, me) {
    const el = document.querySelector(selector);
    if (!el) {
      callBack();
      me.disconnect(); // stop observing
      return;
    }
  });

  // start observing
  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

function onElementChange(targetNode: Node, callBack: () => void) {
  console.log('watching', targetNode);
  const observer = new MutationObserver(() => {
    console.log('Change!', targetNode);
    callBack();
  });

  // start observing
  const config = {
    characterData: true,
    attributes: false,
    childList: false,
    subtree: true,
  };
  observer.observe(targetNode, config);
  return () => observer.disconnect();
}

detection();

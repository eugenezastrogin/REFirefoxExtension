import type {
  REData,
  CriticalPower,
  FormPower,
  StoredSettings,
  Seconds,
  Meters,
  Watts,
  Cadence,
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

const storageDefaults: StoredSettings = {
  weight: 70,
  cp: 0,
  strideLengthToggle: true,
  cpToggle: true,
  fprToggle: true,
  wpkgToggle: true,
};
const debounceEvent = (callback: () => void, delay = 100) => () => {
  let interval: NodeJS.Timeout;
  clearTimeout(interval!);
  interval = setTimeout(() => {
    callback();
  }, delay);
};
const setupSelectionRE = debounceEvent(_setupSelectionRE);
const formatRE = (n: number) => n.toFixed(3);
const formatStrLen = (n: number) => n.toFixed(2);

// Functions

type CalcInput = {
  criticalPower: CriticalPower;
  formPower: FormPower;
  weight: number;
  lapTime: Seconds;
  meters: Meters;
  lapWatts: Watts;
  cadence: Cadence;
};
function calcREData({
  lapWatts,
  criticalPower,
  formPower,
  meters,
  cadence,
  lapTime,
}: CalcInput): REData {
  const cpp = Math.floor((lapWatts / criticalPower) * 100);
  const strideLength = ((meters / lapTime) * 60) / cadence;
  const re = meters / lapTime / (lapWatts / weight);
  const wkg = lapWatts / weight;
  const fpr = formPower / lapWatts;

  return [re, cpp, strideLength, wkg, fpr];
}

function addOrCreateMainStatsNode(
  selector: string,
  label: string,
  value: string,
  valueClass = '',
) {
  // upper stats wrapper
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
function createLapHeadersNode(label: string) {
  // Lap data header row selector
  const headerRowSelector = '.sc-bsatbK.ePCIZd';
  const headerTemplateRow = headerRowSelector + ' > div:last-child';

  const templateNode = document
    .querySelector<HTMLDivElement>(headerTemplateRow)!
    .cloneNode(true) as HTMLDivElement;
  const labelDiv = templateNode.querySelector('div')!;
  labelDiv.innerText = label;
  document.querySelector(headerRowSelector)!.appendChild(templateNode);
}
function incrementGrid(n: number) {
  // Lap data wrapper with grid properties
  const selector = '.bCJCDh';
  document
    .querySelector(selector)!
    .setAttribute(
      'style',
      'padding-bottom: 1rem;' +
        'background: transparent none repeat scroll 0% 0%;' +
        `grid-template-columns: repeat(${n}, auto);`,
    );
}
function createValueNodes() {
  incrementGrid(14 + Number(cpToggle) + Number(strideLengthToggle));
  // Lap data row selector (sans header row)
  const headerRowSelector = '.sc-gIvpCV.cPTLmX';
  // Inner value of lap data cell
  const valueSelector = '.common__TableCell-sc-1ijhfg1-0';

  document.querySelectorAll<HTMLDivElement>(headerRowSelector).forEach(n => {
    const template = n.querySelector<HTMLDivElement>(
      ':scope > div:last-child',
    )!;
    const valueCells = n.querySelectorAll(':scope ' + valueSelector)!;

    const [
      ,
      rawMovingTime,
      rawDistance,
      rawPower,
      ,
      rawCadence,
      rawFormPower,
    ] = [...valueCells].map(n => n.innerHTML);
    // [ "1", "29:57", "5.64 km", "254 W", "5:18 /km", "185 spm", "138 bpm", "71 W", … ]
    const [
      lapTime,
      meters,
      lapWatts,
      cadence,
      formPower,
    ] = extractMetricsFromText([
      rawPower,
      rawCadence,
      rawFormPower,
      rawMovingTime,
      rawDistance,
    ]);
    const [RE, cpp, strideLength] = calcREData({
      lapTime,
      meters,
      lapWatts,
      cadence,
      formPower,
      weight,
      criticalPower: cp,
    });

    const makeCell = (value: number, formatter: (s: number) => string) => {
      const templateNode = template.cloneNode(true) as HTMLDivElement;
      const labelDiv = templateNode.querySelector('div')!;
      labelDiv.innerText = formatter(value);
      // Preserve click behavior in new cell
      templateNode.addEventListener('click', () => template.click());
      n.appendChild(templateNode);
    };

    makeCell(RE, formatRE);
    cpToggle && makeCell(cpp, n => String(n));
    strideLengthToggle && makeCell(strideLength, formatStrLen);
  });
}

//get weight/cp from browser settings
browser.storage.sync
  .get(storageDefaults)
  // @ts-ignore
  .then((items: StoredSettings) => {
    weight = +items.weight;
    cpRE = +items.cp;
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
  // Inner selector of all ribboned selection values above lap data
  const selectionDataSelector =
    '.MetricDisplayChartToggle__DataValue-sc-1ht865t-2.cuTfBy';
  // Inner selector of all upper selection values
  const runContainerEntrySelector =
    '.ActivitySelectionInfo__StatText-sc-3hapn2-3.klfEpA';
  const coloredStats = document.querySelectorAll(selectionDataSelector);
  const topStats = document.querySelectorAll(runContainerEntrySelector);
  const [powerNode, , , cadenceNode, , formPowerNode] = [...coloredStats];
  // Sample output:
  // [ "251 W", "5:26 /km", "142 m", "183 spm", "138 bpm", "71 W", ... ]

  const [movingTimeNode, distanceNode] = [...topStats];
  const trackedNodes = [
    powerNode,
    cadenceNode,
    formPowerNode,
    movingTimeNode,
    distanceNode,
  ] as const;
  const rawValues = trackedNodes.map(n => n.innerHTML);

  return [extractMetricsFromText(rawValues), trackedNodes] as const;
}
function extractMetricsFromText([
  rawPower,
  rawCadence,
  rawFormPower,
  rawMovingTime,
  rawDistance,
]: string[]) {
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
  return [movingTime, meters, watts, cadence, formPower] as const;
}

function detection() {
  // wait for fullscreenmodal to exist before running all RE extension setup
  const runContainerSelector = '.AnalysisPage__AnalysisContainer-sc-3lhrby-0';
  waitForElement(runContainerSelector, () => {
    getCPForRun();
    setupLapData();
    setupSelectionRE();
    waitForElementNotExist(runContainerSelector, detection);
  });
}

function setupLapData() {
  createLapHeadersNode('RE');
  cpToggle && createLapHeadersNode('CP%');
  strideLengthToggle && createLapHeadersNode('Str Len');
  createValueNodes();
}

// do all work to display extension data in at the top of run
function _setupSelectionRE() {
  observers.forEach(o => o());
  const [
    [lapTime, meters, lapWatts, cadence, formPower],
    trackedNodes,
  ] = getSelectionMetrics();

  const [RE, cpp, strideLength, WPkg, fpr] = calcREData({
    criticalPower: cp,
    formPower,
    weight,
    lapTime,
    meters,
    lapWatts,
    cadence,
  });
  const reStat: Stat = [
    !!RE,
    '.reValueSelectionRE',
    'RE',
    formatRE(RE),
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
    `${formatStrLen(strideLength)} m`,
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
  observers = trackedNodes.map(n => onElementChange(n, setupSelectionRE));
}

function getCPForRun() {
  // Critical power node
  const cpSelector = '.ProfileCardProfile__PowerText-sc-1k5x48q-6.iqIGjr';
  if (cpRE === 0) {
    const rawBrowserValue = document
      .querySelector<SVGTextElement>(cpSelector)!
      .innerText
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
  const observer = new MutationObserver(callBack);

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

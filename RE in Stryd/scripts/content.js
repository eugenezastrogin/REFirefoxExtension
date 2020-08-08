var weight = 0.0;
var cpRE = '0';
var cp = '0';
var strideLengthToggle = true;
var cpToggle = true;
var fprToggle = true;
var wpkgToggle = true;

//get weight/cp from chrome settings
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
    weight = items.weight;
    cpRE = items.cp;
    strideLengthToggle = items.strideLengthToggle;
    cpToggle = items.cpToggle;
    fprToggle = items.fprToggle;
    wpkgToggle = items.wpkgToggle;
    //if user value for CP is not an integer or is not between 1 and 15000 then set to 0
    if (Math.floor(cpRE) == cpRE && $.isNumeric(cpRE)) {
      if (cpRE < 0 || cpRE > 1500) {
        cpRE = 0;
      }
    } else {
      cpRE = 0;
    }
  },
);

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

  //when id menu-container exists for manual or distance splits changes the lap data
  waitForElement('#menu-container', function () {
    setupLapRE();
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

//do all work to display extension data in laps
function setupLapRE() {
  setTimeout(function () {
    //check for class for added RE header, if doesn't exist add the header for both RE and CP
    if (!$('.reLapHeaderRE')[0]) {
      $('.LapDisplayTable__Table-t3tg80-1.dVeZVW > tr').each(function () {
        if (!$('.reLapHeaderRE')[0]) {
          $(this).append(
            $('<th />', {
              class:
                'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt reLapHeaderRE',
              text: 'RE',
            }),
          );
          if (cpToggle == true) {
            $(this).append(
              $('<th />', {
                class:
                  'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt cpLapHeaderRE',
                text: 'CP%',
              }),
            );
          }
          if (strideLengthToggle == true) {
            $(this).append(
              $('<th />', {
                class:
                  'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt lenLapHeaderRE',
                text: 'Str Len',
              }),
            );
          }
        }
      });
      $('.LapDisplayTable__Table-t3tg80-1.dVeZVW > thead > tr').each(
        function () {
          if (!$('.reLapHeaderRE')[0]) {
            $(this).append(
              $('<th />', {
                class:
                  'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt reLapHeaderRE',
                text: 'RE',
              }),
            );
            if (cpToggle == true) {
              $(this).append(
                $('<th />', {
                  class:
                    'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt cpLapHeaderRE',
                  text: 'CP%',
                }),
              );
            }
            if (strideLengthToggle == true) {
              $(this).append(
                $('<th />', {
                  class:
                    'LapDisplayTable__HeaderCell-t3tg80-3 iGCydt lenLapHeaderRE',
                  text: 'Str Len',
                }),
              );
            }
          }
        },
      );
    }
    var lapCnt = 0;
    //check for class added for RE and CP values added to laps
    $('.LapDisplayTable__Table-t3tg80-1.dVeZVW > tbody > tr').each(function () {
      lapCnt = lapCnt + 1;
      //if RE lap column doesn't exist for lap add it
      if (!$('.lap' + lapCnt.toString() + 'REValueRE')[0]) {
        $(this).append(
          $('<td>', {
            class:
              'LapDisplayTable__Cell-t3tg80-4 lpcVYV lap' +
              lapCnt.toString() +
              'REValueRE',
            text: '',
          }),
        );
      }
      //if CP lap column doesn't exist for lap add it
      if (!$('.lap' + lapCnt.toString() + 'CPValueRE')[0] && cpToggle == true) {
        $(this).append(
          $('<td>', {
            class:
              'LapDisplayTable__Cell-t3tg80-4 lpcVYV lap' +
              lapCnt.toString() +
              'CPValueRE',
            text: '',
          }),
        );
      }
      //if Str Len lap column doesn't exist for lap add it
      if (
        !$('.lap' + lapCnt.toString() + 'LenValueRE')[0] &&
        strideLengthToggle == true
      ) {
        $(this).append(
          $('<td>', {
            class:
              'LapDisplayTable__Cell-t3tg80-4 lpcVYV lap' +
              lapCnt.toString() +
              'LenValueRE',
            text: '',
          }),
        );
      }
    });
    lapCnt = 0;
    //loop through all laps to find power, distance, and time and update RE/CP values
    $('.LapDisplayTable__Table-t3tg80-1.dVeZVW > tbody > tr').each(function () {
      lapCnt = lapCnt + 1;
      var distance = 0.0;
      var time = 0.0;
      var watts = 0.0;
      var cadence = 0.0;
      var $tds = $(this).find('td');
      (timeText = $tds.eq(1).text()),
        (distanceText = $tds.eq(2).text()),
        (powerText = $tds.eq(3).text());
      cadenceText = $tds.eq(6).text();
      if (distanceText.indexOf('km') !== -1) {
        distance = parseFloat(distanceText.replace(' km', '')) * 1000;
      } else if (distanceText.indexOf('mi') !== -1) {
        distance = parseFloat(distanceText.replace(' mi', '')) * 1609.34;
      } else if (distanceText.indexOf(' m') !== -1) {
        distance = parseFloat(distanceText.replace(' m', ''));
      }
      watts = parseFloat(powerText.replace(' W', ''));
      cpp = Math.floor((watts / cp) * 100);
      var split = timeText.split(':');
      if (split.length == 3) {
        time = +split[0] * 60 * 60 + +split[1] * 60 + +split[2];
      } else if (split.length == 2) {
        time = +split[0] * 60 + +split[1];
      } else {
        time = +split[0];
      }
      cadence = parseFloat(cadenceText.replace(' spm', ''));
      var strideLength = ((distance / time) * 60) / cadence;
      var RE = distance / time / (watts / weight);
      if (RE > 0) {
        if ($('.lap' + lapCnt.toString() + 'REValueRE')[0]) {
          $('.lap' + lapCnt.toString() + 'REValueRE').text(RE.toFixed(3));
        } else {
          $('.lap' + lapCnt.toString() + 'REValueRE').text('N/A');
        }
        if (
          $('.lap' + lapCnt.toString() + 'CPValueRE')[0] &&
          cpToggle == true
        ) {
          $('.lap' + lapCnt.toString() + 'CPValueRE').text(cpp.toString());
        } else if (cpToggle == true) {
          $('.lap' + lapCnt.toString() + 'CPValueRE').text('N/A');
        }
        if (
          $('.lap' + lapCnt.toString() + 'LenValueRE')[0] &&
          strideLengthToggle == true
        ) {
          $('.lap' + lapCnt.toString() + 'LenValueRE').text(
            strideLength.toFixed(2) + ' m',
          );
        } else if (strideLengthToggle == true) {
          $('.lap' + lapCnt.toString() + 'LenValueRE').text('N/A');
        }
      }
    });
    //required to setup wait again for menu-container id
    waitForElement('#menu-container', function () {
      setupLapRE();
    });
  }, 1000);
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
    var time = 0;
    var distance = 0;
    var watts = 0;
    var cadence = 0;
    var formPower = 0;
    var distanceText;
    var timeText;
    var powerText;
    var cadenceText;
    var formPowerText;
    cpp = 0;
    timeText = $('.movingTimeRE').text().replace('Moving Time', '');
    var split = timeText.split(':');
    if (split.length == 3) {
      time = +split[0] * 60 * 60 + +split[1] * 60 + +split[2];
    } else if (split.length == 2) {
      time = +split[0] * 60 + +split[1];
    } else {
      time = +split[0];
    }
    distanceText = $('.distanceRE').text().replace('Distance', '');
    if (distanceText.indexOf('km') !== -1) {
      distance = parseFloat(distanceText.replace(' km', '')) * 1000;
    } else if (distanceText.indexOf('mi') !== -1) {
      distance = parseFloat(distanceText.replace(' mi', '')) * 1609.34;
    } else if (distanceText.indexOf(' m') !== -1) {
      distance = parseFloat(distanceText.replace(' m', ''));
    }
    powerText = $('#powerRE').text().replace('Power', '');
    cadenceText = $('#cadenceRE').text().replace('Cadence', '');
    formPowerText = $('#formPowerRE').text().replace('Form Power', '');
    watts = parseFloat(powerText.replace(' W', ''));
    cpp = Math.floor((watts / cp) * 100);
    cadence = parseFloat(cadenceText.replace(' spm', ''));
    formPower = parseFloat(formPowerText.replace(' W', ''));
    var strideLength = ((distance / time) * 60) / cadence;
    var RE = distance / time / (watts / weight);
    var WPkg = watts / weight;
    var fpr = formPower / watts;
    if (RE > 0) {
      if ($('.reSelectionRE')[0]) {
        $('.reValueSelectionRE').text(RE.toFixed(3));
      } else {
        $(
          '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div',
        ).each(function () {
          var newdiv = $('<div>', {
            class:
              'ActivitySelectionInfo__StatContainer-sc-3hapn2-1 hNZcro reSelectionRE',
          });
          $(
            "<p class='ActivitySelectionInfo__StatText-sc-3hapn2-3 jAjnpu reValueSelectionRE'>" +
              RE.toFixed(3) +
              '</p>',
          ).appendTo(newdiv);
          $(
            "<p class='ActivitySelectionInfo__StatTitle-sc-3hapn2-2 ergGRW'>RE</p>",
          ).appendTo(newdiv);
          $(this).append(newdiv);
        });
      }
    }
    if (cpp > 0 && cpToggle == true) {
      if ($('.cpSelectionRE')[0]) {
        $('.cpValueSelectionRE').text(cpp.toString() + ' %');
      } else {
        $(
          '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div',
        ).each(function () {
          var newdiv = $('<div>', {
            class:
              'ActivitySelectionInfo__StatContainer-sc-3hapn2-1 hNZcro cpSelectionRE',
          });
          $(
            "<p class='ActivitySelectionInfo__StatText-sc-3hapn2-3 jAjnpu cpValueSelectionRE'>" +
              cpp.toString() +
              ' %</p>',
          ).appendTo(newdiv);
          $(
            "<p class='ActivitySelectionInfo__StatTitle-sc-3hapn2-2 ergGRW'>CP</p>",
          ).appendTo(newdiv);
          $(this).append(newdiv);
        });
      }
    }
    if (strideLength > 0 && strideLengthToggle == true) {
      if ($('.lenSelectionRE')[0]) {
        $('.lenValueSelectionRE').text(strideLength.toFixed(2) + ' m');
      } else {
        $(
          '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div',
        ).each(function () {
          var newdiv = $('<div>', {
            class:
              'ActivitySelectionInfo__StatContainer-sc-3hapn2-1 hNZcro lenSelectionRE',
          });
          $(
            "<p class='ActivitySelectionInfo__StatText-sc-3hapn2-3 jAjnpu lenValueSelectionRE'>" +
              strideLength.toFixed(2) +
              ' m</p>',
          ).appendTo(newdiv);
          $(
            "<p class='ActivitySelectionInfo__StatTitle-sc-3hapn2-2 ergGRW'>Str Len</p>",
          ).appendTo(newdiv);
          $(this).append(newdiv);
        });
      }
    }
    if (WPkg > 0 && wpkgToggle == true) {
      if ($('.wpkgSelectionRE')[0]) {
        $('.wpkgValueSelectionRE').text(WPkg.toFixed(2));
      } else {
        $(
          '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div',
        ).each(function () {
          var newdiv = $('<div>', {
            class:
              'ActivitySelectionInfo__StatContainer-sc-3hapn2-1 hNZcro wpkgSelectionRE',
          });
          $(
            "<p class='ActivitySelectionInfo__StatText-sc-3hapn2-3 jAjnpu wpkgValueSelectionRE'>" +
              WPkg.toFixed(2) +
              '</p>',
          ).appendTo(newdiv);
          $(
            "<p class='ActivitySelectionInfo__StatTitle-sc-3hapn2-2 ergGRW'>W/kg</p>",
          ).appendTo(newdiv);
          $(this).append(newdiv);
        });
      }
    }
    if (fpr > 0 && fprToggle == true) {
      if ($('.fprSelectionRE')[0]) {
        $('.fprValueSelectionRE').text(fpr.toFixed(2));
      } else {
        $(
          '.ActivitySelectionInfo__SelectionInfoContainer-sc-3hapn2-0 > div',
        ).each(function () {
          var newdiv = $('<div>', {
            class:
              'ActivitySelectionInfo__StatContainer-sc-3hapn2-1 hNZcro fprSelectionRE',
          });
          $(
            "<p class='ActivitySelectionInfo__StatText-sc-3hapn2-3 jAjnpu fprValueSelectionRE'>" +
              fpr.toFixed(2) +
              '</p>',
          ).appendTo(newdiv);
          $(
            "<p class='ActivitySelectionInfo__StatTitle-sc-3hapn2-2 ergGRW'>FPR</p>",
          ).appendTo(newdiv);
          $(this).append(newdiv);
        });
      }
    }
    //required to setup wait again for menu-container id, was losing after manual selection
    waitForElement('#menu-container', function () {
      setupLapRE();
    });
  }, 1000);
}

function getCPForRun() {
  if (cpRE == 0) {
    cp = $('.label-line-text').text();
  }
  //if extension setting for RE is not 0 then use that value
  else {
    cp = cpRE;
  }
  cp = parseInt(cp.toString().replace('CP ', '').replace(' W', ''));
}

//function used to wait for an element to exist
function waitForElement(elementPath, callBack) {
  window.setTimeout(function () {
    if ($(elementPath).length) {
      callBack(elementPath, $(elementPath));
    } else {
      waitForElement(elementPath, callBack);
    }
  }, 500);
}

//function used to wait for an element to not exist
function waitForElementNotExist(elementPath, callBack) {
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
  setupLapRE();
  setupSelectionRE();
}

//wait for page ready and setup detection and then do everything
$(document).ready(function () {
  detection();
  doEverything();
});

'use strict';
function InfoBar(elemName) {
  let $elem = $('#' + elemName);
  let self = this;

  let health = 1;
  let healthMax = 100;
  let mana = 1;
  let manaMax = 100;
  let gotEq = true;
  let gotLeftBalance = true;
  let gotRightBalance = true;

  let paperWidth = $elem.width();
  let paperHeight = $elem.height();

  var paper = Raphael(elemName, paperWidth, paperHeight);

  var paperMidX = paperWidth / 2;
  var paperMidY = paperHeight/2;

  let healthColour = 'green';
  let manaColour = 'royalBlue';
  let posDeltaColour = 'white';
  let negDeltaColour = 'red';

  let u;                  // measurement unit, 1/16 of paper height
  let eqRadius;           // radius of eq circle
  let barHalfHeight;      // half height of mana/health bars
  let barHeight;          // half height of mana/health bars
  let barArcRadius;       // radius of health/mana endcaps
  let barVertMargin;      // height of space between bar and paper edge

  let crescentWidth;      // horz width of the balance crescents
  let balanceHalfHeight;  // half height of balance crescents
  let balanceHeight;      // height of balance crescents
  let balanceIntRadius;   // internal radius of balance crescent
  let balanceExtRadius;   // external radius of balance crescent

  let eqCircle;           // equilibrium circle
  let eqCircleUnder;      // equilibrium circle underlay

  let healthBorder;       // border of the health bar
  let healthDelta;        // white/red section of the health bar showing changes
  let healthBar;          // core of the health bar

  let manaBorder;         // border of the mana bar
  let manaDelta;          // white/red section of the mana bar showing changes
  let manaBar;            // core of the mana bar
  let balanceLeft;        // left balance crescent
  let balanceLeftUnder;   // left balance crescent underlay
  let balanceRight;       // right balance crescent
  let balanceRightUnder;  // right balance crescent underlay

  let healthFraction = 0;
  let manaFraction = 0;

  function arcTo(x,y,radius,sweepFlag) {
    //endcaps are elliptical, so specify the same radius for both
    //axes to make them a circular arc.
    var radii = "" + radius + "," + radius + " ";
    var xAxisRot = "0 ";
    var flags = "0," + sweepFlag + " ";
    var endCoords = x + "," + y;
    return "A" + radii + xAxisRot + flags + endCoords;
  }

  function barPathStr(params) {
    var top = (paperHeight-barHeight) / 2;
    var bottom = paperHeight - top;
    var pos = params.pos || 'left';
    var isLeft = (pos === 'left');
    //alert(pos);
    var midIndent = crescentWidth + 4*u;
    var xStart = isLeft ? paperMidX - midIndent : paperMidX + midIndent;
    var xMax = isLeft ? 3*u : (paperWidth - (3*u));
    var maxWidth = xMax-xStart;

    //alert(maxwidth);
    var fraction = params.fraction || 1.0;
    var xEnd = xMax - (maxWidth*(1-fraction));
    //alert(startx +  " " + endx + " " + maxx);

    var startPath = "M" + xStart + "," + bottom;
    var startCap = arcTo(xStart, top, balanceExtRadius, isLeft ? 1 : 0);
    var topLine = "L" + xEnd + "," + top;
    var midCap = arcTo(xEnd, bottom, balanceExtRadius, isLeft ? 0 : 1);
    var bottomLine = "L" + xStart + "," + bottom;
    var endPath = "Z";
    var str = startPath + startCap + topLine + midCap + bottomLine + endPath;
    //alert(str);
    return str;
  }

  function balancePathStr(params) {
    let top = (paperHeight-balanceHeight) / 2;
    let bottom = paperHeight - top;
    let pos = params.pos || 'left';
    let isLeft = (pos === 'left');
    //alert(pos);
    let xInner = paperMidX;
    //var xInner = paperMidX + (isLeft ? -balanceIntRadius : balanceIntRadius);

    let cw = (params.empty) ? 0.5 : crescentWidth;
    let xOuter = xInner + (isLeft ? -cw : cw);

    let startPath = "M" + xInner + "," + bottom;
    let innerCap = arcTo(xInner, top, balanceIntRadius, isLeft ? 1 : 0);
    let topLine = "L" + xOuter + "," + top;
    let outerCap = arcTo(xOuter, bottom, balanceExtRadius, isLeft ? 0 : 1);
    let bottomLine = "L" + xInner + "," + bottom;
    let endPath = "Z";

    let str = startPath + innerCap + topLine + outerCap + bottomLine + endPath;
    //alert(str);
    return str;
  }

  function calcDimensions() {
    paperWidth = $elem.width();
    paperHeight = $elem.height();
    paper.setSize(paperWidth, paperHeight);

    paperMidX = paperWidth / 2;
    paperMidY = paperHeight/2;

    u = paperHeight / 16;
    eqRadius = 6 * u;
    barHalfHeight = 5 * u;
    barHeight = barHalfHeight * 2; //10u
    barArcRadius = barHalfHeight;
    barVertMargin = (paperHeight - barHeight) / 2; //3u

    //crescentWidth = 11*u;
    crescentWidth = 16*u;
    balanceHalfHeight = 7*u;
    balanceHeight = balanceHalfHeight * 2;
    balanceIntRadius = barHalfHeight;
    balanceExtRadius = balanceIntRadius + (4*u);
  }

  function generateElems() {
    paper.clear();
    eqCircleUnder = paper.circle(paperMidX, paperMidY, eqRadius);
    eqCircle = paper.circle(paperMidX, paperMidY, eqRadius);

    healthDelta = paper.path(barPathStr({pos:'left', fraction: 0.01}));
    healthBar = paper.path(barPathStr({pos:'left', fraction: healthFraction}));
    healthBorder = paper.path(barPathStr({pos:'left'}));

    manaDelta = paper.path(barPathStr({pos:'right', fraction: 0.01}));
    manaBar = paper.path(barPathStr({pos:'right', fraction: manaFraction}));
    manaBorder = paper.path(barPathStr({pos:'right'}));

    balanceLeftUnder = paper.path(balancePathStr({pos:'left'}));
    balanceRightUnder = paper.path(balancePathStr({pos:'right'}));

    balanceLeft = paper.path(balancePathStr({pos:'left'}));
    balanceRight = paper.path(balancePathStr({pos:'right'}));

    eqCircle.attr({fill:'white', stroke:'none'});
    eqCircleUnder.attr({fill:'white', stroke:'none'});

    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    healthBar.attr({fill:healthColour, stroke:'none'});
    healthBorder.attr({stroke:healthColour, 'stroke-width': 1});

    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    manaBar.attr({fill:manaColour});
    manaBorder.attr({stroke:manaColour, 'stroke-width': 1});

    balanceLeftUnder.attr({fill:'white', stroke:'none'});
    balanceRightUnder.attr({fill:'white', stroke:'none'});

    balanceLeft.attr({fill:'white', stroke:'none'});
    balanceRight.attr({fill:'white', stroke:'none'});
  }

  function bindAllEvents() {
    bindEventsFor('health', [healthDelta,healthBar,healthBorder]);
    bindEventsFor('mana', [manaDelta,manaBar,manaBorder]);
  }

  function resizeElems() {
    eqCircle.attr({cx:paperMidX, cy:paperMidY, r:eqRadius});
    eqCircleUnder.attr({cx:paperMidX, cy:paperMidY, r:eqRadius});

    healthDelta.attr({path:barPathStr({pos:'left', fraction: 0.01})});
    healthBar.attr({path:barPathStr({pos:'left', fraction: healthFraction})});
    healthBorder.attr({path:barPathStr({pos:'left'})});

    manaDelta.attr({path:barPathStr({pos:'right', fraction: 0.01})});
    manaBar.attr({path:barPathStr({pos:'right', fraction: manaFraction})});
    manaBorder.attr({path:barPathStr({pos:'right'})});

    balanceLeftUnder.attr({path:balancePathStr({pos:'left'})});
    balanceRightUnder.attr({path:balancePathStr({pos:'right'})});
    balanceLeft.attr({path:balancePathStr({pos:'left'})});
    balanceRight.attr({path:balancePathStr({pos:'right'})});
  }

  function setup() {
    calcDimensions();
    healthFraction = health/healthMax;
    manaFraction = mana/manaMax;
    generateElems();
    bindAllEvents();
  }

  function cleanRender() {
    calcDimensions();
    healthFraction = health/healthMax;
    manaFraction = mana/manaMax;
    resizeElems();
  }

  $(window).resize(function(e) {
    console.log('infobar sizing from ' + paperWidth + ' to ' + $elem.width());
    if ($elem.width() !== paperWidth) {
      paperWidth = $elem.width();
      cleanRender();
    }
  });

  self.setMaxima = function (newHealthMax, newManaMax) {
    if(newHealthMax !== healthMax || newManaMax !== manaMax) {
      healthMax = newHealthMax;
      manaMax = newManaMax;
      cleanRender();
    }
  };

  self.setMaxHealth = function(x) { self.setMaxima(x, manaMax); };

  self.setMaxMana = function(x) { self.setMaxima(healthMax, x); };

  function fillColourForFraction(baseColour, fraction) {
    return (fraction < 0.333) ? 'red' :
      (fraction < 0.666) ? 'orange' :
        baseColour;
  }

  function animateBar(bar, delta, border, pos, oldFraction, fraction, colour) {
    if(fraction >= 1.0) {
      border.attr({stroke:'white'});
    } else {
      border.attr({stroke:colour});
    }
    if(fraction > oldFraction) {
      delta.attr({
        fill: 'white',
        path: barPathStr({pos:pos, fraction:fraction})
      });
      bar.attr({
        path: barPathStr({pos:pos, fraction: oldFraction})
      });
      bar.animate(
        {
          fill: fillColourForFraction(colour, fraction),
          path: barPathStr({pos:pos, fraction: fraction})
        },
        250,
        'linear'
      );
    } else {
      bar.attr({
        path: barPathStr({pos:pos, fraction:fraction})
      });
      delta.attr({
        fill: 'red',
        path: barPathStr({pos:pos, fraction: oldFraction})
      });
      bar.animate(
        {
          fill: fillColourForFraction(colour, fraction)
        },
        250,
        'linear'
      );
      delta.animate(
        { path: barPathStr({pos:pos, fraction:fraction}) },
        250,
        'linear'
      );
    }
  }

  self.setHealth = function(x) {
    if(x !== health) {
      let oldHealth = health;
      let oldHealthFraction = healthFraction;
      health = x;
      healthFraction = health / healthMax;
      animateBar(healthBar, healthDelta, healthBorder, 'left', oldHealthFraction, healthFraction, healthColour);
    }
  };

  self.setMana = function(x) {
    if(x !== mana) {
      let oldMana = mana;
      let oldManaFraction = manaFraction;
      mana = x;
      manaFraction = mana / manaMax;
      animateBar(manaBar, manaDelta, manaBorder, 'right', oldManaFraction, manaFraction, manaColour);
    }
  };

  self.loseEq = function(hardOrSoft, restoreTime) {
    if(gotEq) {
      let isHard = hardOrSoft || true;
      gotEq = false;
      if(restoreTime) {
        console.log('eq returns in ' + restoreTime + 'ms');
        eqCircle.attr({r:0});
        eqCircleUnder.attr({fill: isHard ? 'red' : 'green'});
        eqCircle.animate( {r:eqRadius}, restoreTime, 'linear' );
      } else {
        eqCircle.attr({fill: 'red'});
      }
    }
  };

  self.regainEq = function() {
    if(!gotEq) {
      gotEq = true;
      eqCircle.attr({fill: 'white'});
      eqCircleUnder.attr({fill: 'white'});
    }
  };

  self.loseLeftBalance = function(restoreTime) {
    if(gotLeftBalance) {
      gotLeftBalance = false;
      balanceLeftUnder.attr({fill: 'red'});
      balanceLeft.attr(
        { path:balancePathStr({pos:'left', empty:true}) }
      );
      if(restoreTime && restoreTime > 0) {
        balanceLeft.animate(
          { path:balancePathStr({pos:'left', empty:false}) },
          restoreTime,
          'linear'
        );
      }
    }
  };

  self.regainLeftBalance = function() {
    if(!gotLeftBalance) {
      gotLeftBalance = true;
      balanceLeft.attr(
        { path:balancePathStr({pos:'left', empty:false}) }
      );
      balanceLeftUnder.attr({fill: 'white'});
    }
  };

  self.loseRightBalance = function(restoreTime) {
    if(gotRightBalance) {
      gotRightBalance = false;
      balanceRightUnder.attr({fill: 'red'});
      balanceRight.attr(
        { path:balancePathStr({pos:'right', empty:true}) }
      );
      if(restoreTime && restoreTime > 0) {
        balanceRight.animate(
          { path:balancePathStr({pos:'right', empty:false}) },
          restoreTime,
          'linear'
        );
      }
    }
  };

  self.regainRightBalance = function() {
    if(!gotRightBalance) {
      gotRightBalance = true;
      balanceRight.attr(
        { path:balancePathStr({pos:'right', empty:false}) }
      );
      balanceRightUnder.attr({fill: 'white'});
    }
  };

  self.vars = function() {
    return {
      health: health,
      healthMax: healthMax,
      mana: mana,
      manaMax: manaMax
    };
  };

  function bindEventsFor(name, elems) {
    bindClick(name, elems);
    bindDblClick(name, elems);
    bindTouchStart(name, elems);
    bindTouchMove(name, elems);
    bindTouchEnd(name, elems);
    bindTouchCancel(name, elems);
  }


  function bindClick(name, elems) {
    let handler = function(e) {
      console.log(name + ' clicked, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.click(handler);});
  }

  function bindDblClick(name, elems) {
    let handler = function (e) {
      console.log(name + ' double-clicked, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.dblclick(handler);});
  }

  function bindTouchStart(name, elems) {
    let handler = function (e) {
      console.log(name + ' touch start, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.touchstart(handler);});
  }

  function bindTouchMove(name, elems) {
    let handler = function(e) {
      console.log(name + ' touch move, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.touchmove(handler);});
  }

  function bindTouchEnd(name, elems) {
    let handler = function(e) {
      console.log(name + ' touch end, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.touchend(handler);});
  }

  function bindTouchCancel(name, elems) {
    let handler = function(e) {
      console.log(name + ' touch cancel, e=' + JSON.stringify(e));
    };
    elems.forEach(function (elem) {elem.touchcancel(handler);});
  }

  setup();
}


'use strict';
function InfoBar(elemName) {
  let $elem = $('#' + elemName);
  let self = this;
  let $self = $(self);

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
  let midCutoutWidth;     // width of the central cutout area
  let balanceIntRadius;   // internal radius of balance crescent
  let balanceExtRadius;   // external radius of balance crescent

  let eqCircle;           // equilibrium circle
  let eqCircleUnder;      // equilibrium circle underlay

  let healthBorder;       // border of the health bar
  let healthDelta;        // white/red section of the health bar showing changes
  let healthBar;          // core of the health bar
  let healthText;

  let manaBorder;         // border of the mana bar
  let manaDelta;          // white/red section of the mana bar showing changes
  let manaBar;            // core of the mana bar
  let manaText;

  let balanceOffset;      //offset from the mid line to start drawing balance segments
  let balanceLeft;        // left balance crescent
  let balanceLeftBorder;  // left balance crescent underlay
  let balanceRight;       // right balance crescent
  let balanceRightBorder; // right balance crescent underlay

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
    var midIndent = crescentWidth + (balanceOffset) + 4*u;
    var xStart = isLeft ? paperMidX - midIndent : paperMidX + midIndent;
    var xMax = isLeft ? 3*u : (paperWidth - (3*u));
    var maxWidth = xMax-xStart;

    //alert(maxwidth);
    var fraction = params.hasOwnProperty('fraction') ? params.fraction : 1.0;
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
    var xInner = paperMidX + (isLeft ? -(balanceOffset) : (balanceOffset));

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

    crescentWidth = paperWidth/6;
    balanceHalfHeight = 7*u;
    balanceHeight = balanceHalfHeight * 2;
    //midCutoutWidth = 8*u;
    midCutoutWidth = 0;
    balanceOffset = midCutoutWidth / 2;
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
    let hbb = healthBorder.getBBox();
    let hCtr = hbb.x + ( (hbb.x2 - hbb.x)/2 );
    healthText = paper.text(hCtr, paperMidY, 'health');

    manaDelta = paper.path(barPathStr({pos:'right', fraction: 0.01}));
    manaBar = paper.path(barPathStr({pos:'right', fraction: manaFraction}));
    manaBorder = paper.path(barPathStr({pos:'right'}));
    let mbb = manaBorder.getBBox();
    let mCtr = mbb.x + ( (mbb.x2 - mbb.x)/2 );
    manaText = paper.text(mCtr, paperMidY, 'mana');

    balanceLeft = paper.path(balancePathStr({pos:'left'}));
    balanceRight = paper.path(balancePathStr({pos:'right'}));

    balanceLeftBorder = paper.path(balancePathStr({pos:'left'}));
    balanceRightBorder = paper.path(balancePathStr({pos:'right'}));

    eqCircle.attr({fill:'white', stroke:'none'});
    eqCircleUnder.attr({fill:'white', stroke:'none'});

    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    healthBar.attr({fill:healthColour, stroke:'none'});
    healthBorder.attr({stroke:healthColour, 'stroke-width': 1});
    healthText.attr({fill:'white'});

    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    manaBar.attr({fill:manaColour});
    manaBorder.attr({stroke:manaColour, 'stroke-width': 1});
    manaText.attr({fill:'white'});

    balanceLeftBorder.attr({stroke:'white', 'stroke-width': 1});
    balanceRightBorder.attr({stroke:'white', 'stroke-width': 1});

    balanceLeft.attr({fill:'black', stroke:'none'});
    balanceRight.attr({fill:'black', stroke:'none'});
  }

  function bindAllEvents() {
    bindClick([healthDelta,healthBar,healthBorder], function fn() {
      $self.trigger("healthClicked", {
        health: health,
        healthMax: healthMax,
        ratio: health/healthMax
      });
    });
    bindClick([manaDelta,manaBar,manaBorder], function fn() {
      $self.trigger("manaClicked", {
        mana: mana,
        manaMax: manaMax,
        ratio: mana/manaMax
      });
    });

    //these don't bind click
    bindEventsFor('health', [healthDelta,healthBar,healthBorder]);
    bindEventsFor('mana', [manaDelta,manaBar,manaBorder]);
  }

  function resizeElems() {
    eqCircle.attr({cx:paperMidX, cy:paperMidY, r:eqRadius});
    eqCircleUnder.attr({cx:paperMidX, cy:paperMidY, r:eqRadius});

    healthDelta.attr({path:barPathStr({pos:'left', fraction: 0.01})});
    healthBar.attr({path:barPathStr({pos:'left', fraction: healthFraction})});
    healthBorder.attr({path:barPathStr({pos:'left'})});
    let hbb = healthBorder.getBBox();
    let hCtr = hbb.x + ( (hbb.x2 - hbb.x)/2 );
    healthText.attr('x', hCtr);


    manaDelta.attr({path:barPathStr({pos:'right', fraction: 0.01})});
    manaBar.attr({path:barPathStr({pos:'right', fraction: manaFraction})});
    manaBorder.attr({path:barPathStr({pos:'right'})});
    let mbb = manaBorder.getBBox();
    let mCtr = mbb.x + ( (mbb.x2 - mbb.x)/2 );
    manaText.attr('x', mCtr);

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



  self.setMaxima = function (newHealthMax, newManaMax) {
    let dirty = false;
    if(newHealthMax !== healthMax) {
      healthMax = newHealthMax;
      healthText.attr('text', health + ' / ' + healthMax);
      dirty = true;
    }
    if(newManaMax !== manaMax) {
      manaMax = newManaMax;
      manaText.attr('text', mana + ' / ' + manaMax);
      dirty = true;
    }
    if(dirty) {
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
    } else if (fraction <= 0.0) {
      border.attr({stroke:'red'});
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
      healthText.attr('text', health + ' / ' + healthMax);
      healthFraction = health / healthMax;
      animateBar(healthBar, healthDelta, healthBorder, 'left', oldHealthFraction, healthFraction, healthColour);
    }
  };

  self.setMana = function(x) {
    if(x !== mana) {
      let oldMana = mana;
      let oldManaFraction = manaFraction;
      mana = x;
      manaText.attr('text', mana + ' / ' + manaMax);
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
      //balanceLeftUnder.attr({fill: 'red'});
      balanceLeft.attr(
        {
          path: balancePathStr({pos:'left', empty:true}),
          fill: 'red'
        }
      );
      if(restoreTime && restoreTime > 0) {
        balanceLeft.animate(
          {
            path:balancePathStr({pos:'left', empty:false})
          },
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
        {
          path:balancePathStr({pos:'left', empty:false}),
          fill: 'none'
        }
      );
      //balanceLeftUnder.attr({fill: 'white'});
    }
  };

  self.loseRightBalance = function(restoreTime) {
    if(gotRightBalance) {
      gotRightBalance = false;
      //balanceRightUnder.attr({fill: 'red'});
      balanceRight.attr(
        {
          path: balancePathStr({pos:'right', empty:true}),
          fill: 'red'
        }
      );
      if(restoreTime && restoreTime > 0) {
        balanceRight.animate(
          {
            path: balancePathStr({pos:'right', empty:false})
          },
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
        {
          path: balancePathStr({pos:'right', empty:false}),
          fill: 'none'
        }
      );
      //balanceRightUnder.attr({fill: 'white'});
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
    bindTouchStart(elems, function (e) { console.log(name + ' touch start, e=' + JSON.stringify(e)); });
    bindTouchMove(elems, function(e) { console.log(name + ' touch move, e=' + JSON.stringify(e)); });
    bindTouchEnd(elems, function(e) { console.log(name + ' touch end, e=' + JSON.stringify(e)); });
    bindTouchCancel(elems, function(e) { console.log(name + ' touch cancel, e=' + JSON.stringify(e)); });
  }

  function bindClick(elems, handler) { elems.forEach(function (elem) {elem.click(handler);}); }
  function bindTouchStart(elems, handler) { elems.forEach(function (elem) {elem.touchstart(handler);}); }
  function bindTouchMove(elems, handler) { elems.forEach(function (elem) {elem.touchmove(handler);}); }
  function bindTouchEnd(elems, handler) { elems.forEach(function (elem) {elem.touchend(handler);}); }
  function bindTouchCancel(elems, handler) { elems.forEach(function (elem) {elem.touchcancel(handler);}); }

  setup();

  $(window).resize(function(e) {
    console.log('infobar sizing from ' + paperWidth + ' to ' + $elem.width());
    if ($elem.width() !== paperWidth) {
      paperWidth = $elem.width();
      cleanRender();
    }
  });
}


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
  let barVertMargin;      // height of space between bar and paper edge

  let eqWidth;            // horz width of the eq segments
  let crescentWidth;      // horz width of the balance crescents
  let balanceHalfHeight;  // half height of balance crescents
  let balanceHeight;      // height of balance crescents
  let midCutoutWidth;     // width of the central cutout area

  let endcapRadius;       // radius of segment endcap curves

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

  let midOffset;          // offset from the mid line to start drawing balance segments
  let balanceLeft;        // left balance crescent
  let balanceLeftBorder;  // left balance crescent underlay
  let balanceRight;       // right balance crescent
  let balanceRightBorder; // right balance crescent underlay

  let wieldedLeftText;
  let wieldedRightText;

  let healthFraction = 0;
  let manaFraction = 0;

  /*
    Params:
      height      : of the bar
      pos         : 'left' or 'right'
      innerMargin : offset from centre where the segment begins
      outermargin : offset from the edge where the segment ends
      valueMax    : maximum value of the bar
      value       : initial value of the bar
      text        : text to displar in the centre of the segment
      lowColour   : colour when value is under 1/3
      medColour   : colour when value is over 1/3 and under 2/3
      highColour  : colour when bar is over 2/3
      fullColour  : colour when value is 100%
      useDeltas   : if the segment should use a delta to illustrate value changes
   */
  function segment(params) {
    let height      = params.height;
    let pos         = params.pos || 'left';
    let innerMargin = params.innerMargin || 0;
    let outermargin = params.outerMargin || 0;
    let valueMax    = params.valueMax || 1.0;
    let value       = params.value || 0.0;
    let text        = params.text || '';
    let lowColour   = params.lowColour || 'red';
    let medColour   = params.medColour || 'yellow';
    let highColour  = params.highColour || 'green';
    let fullColour  = params.fullColour || highColour;
    let useDeltas   = params.useDeltas || false;

    //fixed dimensions (because the height never changes)
    let halfHeight = height / 2;
    let top = paperMidY - halfHeight;
    let bottom = paperMidY + halfHeight;
    let isLeft = pos === 'left';

    //width-dependent dimensions
    let xStart;
    let xEnd;

    //elements
    let $border;
    let $bar;
    let $delta;
    let $text;

    function pathStr(innerPadding, outerPadding) {
      let paddedStart = isLeft ? xStart-innerPadding : xStart+innerPadding;
      let paddedEnd = isLeft ? xEnd+outerPadding : xStart+innerPadding;

      var midIndent = crescentWidth + (midOffset) + 4*u;
      var xStart = isLeft ? paperMidX - midIndent : paperMidX + midIndent;
      var xMax = isLeft ? 3*u : (paperWidth - (3*u));
      var maxWidth = xMax-xStart;

      //alert(maxwidth);
      var fraction = params.hasOwnProperty('fraction') ? params.fraction : 1.0;
      var xEnd = xMax - (maxWidth*(1-fraction));
      //alert(startx +  " " + endx + " " + maxx);

      var startPath = "M" + xStart + "," + bottom;
      var startCap = arcTo(xStart, top, endcapRadius, isLeft ? 1 : 0);
      var topLine = "L" + xEnd + "," + top;
      var midCap = arcTo(xEnd, bottom, endcapRadius, isLeft ? 0 : 1);
      var bottomLine = "L" + xStart + "," + bottom;
      var endPath = "Z";
      var str = startPath + startCap + topLine + midCap + bottomLine + endPath;
      //alert(str);
      return str;
    }
    function initElements() {

    }

    self.calcDimensions = function() {
      if(isLeft) {
        xStart = paperMidX - params.innerMargin;
        xEnd = params.outerMargin;
      } else {
        xStart = paperMidX + params.innerMargin;
        xEnd = paperWidth - params.outerMargin;
      }
    };


  }

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
    var midIndent = crescentWidth + (midOffset) + 4*u;
    var xStart = isLeft ? paperMidX - midIndent : paperMidX + midIndent;
    var xMax = isLeft ? 3*u : (paperWidth - (3*u));
    var maxWidth = xMax-xStart;

    //alert(maxwidth);
    var fraction = params.hasOwnProperty('fraction') ? params.fraction : 1.0;
    var xEnd = xMax - (maxWidth*(1-fraction));
    //alert(startx +  " " + endx + " " + maxx);

    var startPath = "M" + xStart + "," + bottom;
    var startCap = arcTo(xStart, top, endcapRadius, isLeft ? 1 : 0);
    var topLine = "L" + xEnd + "," + top;
    var midCap = arcTo(xEnd, bottom, endcapRadius, isLeft ? 0 : 1);
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
    var xInner = paperMidX + (isLeft ? -(midOffset) : (midOffset));

    //let cw = (params.empty) ? 0.5 : crescentWidth;
    let xOuter = xInner + (isLeft ? -crescentWidth : crescentWidth);

    if(params.endState) {
      xInner = xOuter;
    }

    let startPath = "M" + xInner + "," + bottom;
    let innerCap = arcTo(xInner, top, endcapRadius, isLeft ? 1 : 0);
    let topLine = "L" + xOuter + "," + top;
    let outerCap = arcTo(xOuter, bottom, endcapRadius, isLeft ? 0 : 1);
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
    barVertMargin = (paperHeight - barHeight) / 2; //3u

    eqWidth = paperWidth/3;
    crescentWidth = paperWidth/4;
    balanceHalfHeight = 7*u;
    balanceHeight = balanceHalfHeight * 2;
    midCutoutWidth = 8*u;
    //midCutoutWidth = 0;
    midOffset = midCutoutWidth / 2;
    endcapRadius = barHalfHeight + (4*u);
  }

  function horzCentreOf(shape) {
    let bb = shape.getBBox();
    let ctr = bb.x + ( (bb.x2 - bb.x)/2 );
    return ctr;
  }

  function generateElems() {
    paper.clear();
    eqCircleUnder = paper.circle(paperMidX, paperMidY, eqRadius);
    eqCircle = paper.circle(paperMidX, paperMidY, eqRadius);

    healthDelta = paper.path(barPathStr({pos:'left', fraction: 0.01}));
    healthBar = paper.path(barPathStr({pos:'left', fraction: healthFraction}));
    healthBorder = paper.path(barPathStr({pos:'left'}));
    healthText = paper.text(horzCentreOf(healthBorder), paperMidY, 'health');

    manaDelta = paper.path(barPathStr({pos:'right', fraction: 0.01}));
    manaBar = paper.path(barPathStr({pos:'right', fraction: manaFraction}));
    manaBorder = paper.path(barPathStr({pos:'right'}));
    manaText = paper.text(horzCentreOf(manaBorder), paperMidY, 'mana');

    balanceLeft = paper.path(balancePathStr({pos:'left'}));
    balanceRight = paper.path(balancePathStr({pos:'right'}));

    balanceLeftBorder = paper.path(balancePathStr({pos:'left'}));
    balanceRightBorder = paper.path(balancePathStr({pos:'right'}));

    wieldedLeftText = paper.text(horzCentreOf(balanceLeftBorder), paperMidY, 'left');
    wieldedRightText = paper.text(horzCentreOf(balanceRightBorder), paperMidY, 'right');

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

    wieldedLeftText.attr({fill:'white'});
    wieldedRightText.attr({fill:'white'});
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
    healthText.attr('x', horzCentreOf(healthBorder));


    manaDelta.attr({path:barPathStr({pos:'right', fraction: 0.01})});
    manaBar.attr({path:barPathStr({pos:'right', fraction: manaFraction})});
    manaBorder.attr({path:barPathStr({pos:'right'})});
    manaText.attr('x', horzCentreOf(manaBorder));

    balanceLeftBorder.attr({path:balancePathStr({pos:'left'})});
    balanceRightBorder.attr({path:balancePathStr({pos:'right'})});
    balanceLeft.attr({path:balancePathStr({pos:'left'})});
    balanceRight.attr({path:balancePathStr({pos:'right'})});

    wieldedLeftText.attr('x', horzCentreOf(balanceLeftBorder));
    wieldedRightText.attr('x',horzCentreOf(balanceRightBorder));
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

  self.loseLeftBalance = function(restoreTime, item) {
    wieldedLeftText.attr('text', item);
    if(gotLeftBalance) {
      gotLeftBalance = false;
      balanceLeft.attr(
        {
          path: balancePathStr({pos:'left', endState:false}),
          fill: 'red'
        }
      );
      if(restoreTime && restoreTime > 0) {
        balanceLeft.animate(
          {
            path:balancePathStr({pos:'left', endState:true})
          },
          restoreTime,
          'linear'
        );
      }
    }
  };

  self.regainLeftBalance = function(item) {
    wieldedLeftText.attr('text', item);
    if(!gotLeftBalance) {
      gotLeftBalance = true;
      balanceLeft.attr(
        {
          path:balancePathStr({pos:'left', endState:false}),
          fill: 'none'
        }
      );
    }
  };

  self.loseRightBalance = function(restoreTime, item) {
    wieldedRightText.attr('text', item);
    if(gotRightBalance) {
      gotRightBalance = false;
      balanceRight.attr(
        {
          path: balancePathStr({pos:'right', endState:false}),
          fill: 'red'
        }
      );
      if(restoreTime && restoreTime > 0) {
        balanceRight.animate(
          {
            path: balancePathStr({pos:'right', endState:true})
          },
          restoreTime,
          'linear'
        );
      }
    }
  };

  self.regainRightBalance = function(item) {
    wieldedRightText.attr('text', item);
    if(!gotRightBalance) {
      gotRightBalance = true;
      balanceRight.attr(
        {
          path: balancePathStr({pos:'right', endState:false}),
          fill: 'none'
        }
      );
    }
  };

  self.loseBalance = function(side, restoreTime, item) {
    if(side === 'left') {self.loseLeftBalance(restoreTime, item); }
    else {self.loseRightBalance(restoreTime, item); }
  };

  self.regainBalance = function(side, item) {
    if(side === 'left') {self.regainLeftBalance(item); }
    else {self.regainRightBalance(item); }
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


'use strict';
function InfoBar(elemName) {
  let $elem = $('#' + elemName);
  let self = this;

  let health = 80;
  let healthMax = 100;
  let mana = 80;
  let manaMax = 100;

  let paperWidth = $elem.width();
  let paperHeight = $elem.height();

  var paper = Raphael(elemName, paperWidth, paperHeight);

  var paperMidX = paperWidth / 2;
  var paperMidY = paperHeight/2;

  let healthColour = 'green';
  let manaColour = 'cadetBlue';
  let posDeltaColour = 'white';
  let negDeltaColour = 'red';

  let u;             // measurement unit, 1/16 of paper height
  let eqRadius;      // radius of eq circle
  let barHalfHeight; // half height of mana/health bars
  let barHeight;     // half height of mana/health bars
  let barArcRadius;  // radius of health/mana endcaps
  let barVertMargin; // height of space between bar and paper edge

  let balanceHalfHeight; // half height of balance crescents
  let balanceHeight;     // height of balance crescents
  let balanceIntRadius;  // internal radius of balance crescent
  let balanceExtRadius;  // external radius of balance crescent

  let eqCircle;     // equilibrium circle
  let healthBorder; // border of the health bar
  let healthDelta;  // white/red section of the health bar showing changes
  let healthBar;    // core of the health bar
  let manaBorder;   // border of the mana bar
  let manaDelta;    // white/red section of the mana bar showing changes
  let manaBar;      // core of the mana bar
  let balanceLeft;  // left balance crescent
  let balanceRight; // right balance crescent

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
    var midIndent = balanceExtRadius + 4*u;
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
    var top = (paperHeight-balanceHeight) / 2;
    var bottom = paperHeight - top;
    var pos = params.pos || 'left';
    var isLeft = (pos === 'left');
    //alert(pos);
    var xInner = paperMidX;
    //var xInner = paperMidX + (isLeft ? -balanceIntRadius : balanceIntRadius);
    var xOuter = xInner + (isLeft ? -8*u : 8*u);

    var startPath = "M" + xInner + "," + bottom;
    var innerCap = arcTo(xInner, top, balanceIntRadius, isLeft ? 1 : 0);
    var topLine = "L" + xOuter + "," + top;
    var outerCap = arcTo(xOuter, bottom, balanceExtRadius, isLeft ? 0 : 1);
    var endPath = "Z";
    var str = startPath + innerCap + topLine + outerCap + endPath;
    //alert(str);
    return str;
  }

  function cleanRender() {
    paperWidth = $elem.width();
    paperHeight = $elem.height();
    paper.setSize(paperWidth, paperHeight);
    paper.clear();

    paperMidX = paperWidth / 2;
    paperMidY = paperHeight/2;

    u = paperHeight / 16;
    eqRadius = 6 * u;
    barHalfHeight = 5 * u;
    barHeight = barHalfHeight * 2; //10u
    barArcRadius = barHalfHeight;
    barVertMargin = (paperHeight - barHeight) / 2; //3u

    balanceHalfHeight = 7*u;
    balanceHeight = balanceHalfHeight * 2;
    balanceIntRadius = barHalfHeight;
    balanceExtRadius = balanceIntRadius + barVertMargin;

    healthFraction = health/healthMax;
    manaFraction = mana/manaMax;

    eqCircle = paper.circle(paperMidX, paperMidY, eqRadius);
    healthBorder = paper.path(barPathStr({pos:'left'}));
    healthDelta = paper.path(barPathStr({pos:'left', fraction: 0.01}));
    healthBar = paper.path(barPathStr({pos:'left', fraction: healthFraction}));
    manaBorder = paper.path(barPathStr({pos:'right'}));
    manaDelta = paper.path(barPathStr({pos:'right', fraction: 0.01}));
    manaBar = paper.path(barPathStr({pos:'right', fraction: manaFraction}));
    balanceLeft = paper.path(balancePathStr({pos:'left'}));
    balanceRight = paper.path(balancePathStr({pos:'right'}));

    eqCircle.attr({fill:'white'});
    healthBorder.attr({stroke:healthColour, 'stroke-width': 1});
    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    healthBar.attr({fill:healthColour, stroke:'none'});
    manaBorder.attr({stroke:manaColour, 'stroke-width': 1});
    healthDelta.attr({fill:negDeltaColour, stroke:'none'});
    manaBar.attr({fill:manaColour});
    balanceLeft.attr({fill:'red'});
    balanceRight.attr({fill:'white'});
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
      healthMax = healthMax;
      manaMax = newManaMax;
      cleanRender();
    }
  };

  self.setMaxHealth = function(x) { self.setMaxima(x, manaMax); };

  self.setMaxMana = function(x) { self.setMaxima(healthMax, x); };

  self.setHealth = function(x) {
    if(x !== health) {
      let oldHealth = health;
      let oldHealthFraction = healthFraction;
      health = x;
      healthFraction = health / healthMax;
      if(health > oldHealth) {
        healthDelta.attr({
          fill: 'white',
          path: barPathStr({pos:'left', fraction: healthFraction})
        });
        healthBar.attr({
          path: barPathStr({pos:'left', fraction: oldHealthFraction})
        });
        healthBar.animate(
          {path: barPathStr({pos: 'left', fraction: healthFraction})},
          250,
          'linear'
        );
      } else {
        healthBar.attr({
          path: barPathStr({pos:'left', fraction: healthFraction})
        });
        healthDelta.attr({
          fill: 'red',
          path: barPathStr({pos:'left', fraction: oldHealthFraction})
        });
        healthDelta.animate(
          { path: barPathStr({pos:'left', fraction: healthFraction}) },
          250,
          'linear'
        );
      }
    }
  };

  self.setMana = function(x) {
    if(x !== mana) {
      let oldMana = mana;
      let oldManaFraction = manaFraction;
      mana = x;
      manaFraction = mana / manaMax;
      console.log('resizing mana bar from ' + oldMana + ' to ' + mana);
      if(mana > oldMana) {
        manaDelta.attr({
          fill: 'white',
          path: barPathStr({pos:'right', fraction: manaFraction})
        });
        manaBar.attr({
          path: barPathStr({pos:'right', fraction: oldManaFraction})
        });
        manaBar.animate(
          {path: barPathStr({pos: 'right', fraction: manaFraction})},
          250,
          'linear'
        );
      } else {
        manaBar.attr({
          path: barPathStr({pos:'right', fraction: manaFraction})
        });
        manaDelta.attr({
          fill: 'red',
          path: barPathStr({pos:'right', fraction: oldManaFraction})
        });
        manaDelta.animate(
          { path: barPathStr({pos:'right', fraction: manaFraction}) },
          250,
          'linear'
        );
      }
    }
  };

  self.loseLeftBalance = function(restoreTime) {
  };

  self.loseRightBalance = function(restoreTime) {
  };

  self.vars = function() {
    return {
      health: health,
      healthMax: healthMax,
      mana: mana,
      manaMax: manaMax
    };
  };

  cleanRender();
}


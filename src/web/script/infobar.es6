'use strict';
function InfoBar(elemName) {
  const $elem = $('#' + elemName);
  const self = this;
  const $self = $(self);

  let gotEq = true;

  //static dimensions (height never changes)
  const paperHeight = $elem.height();
  const u = paperHeight / 16;

  const eqHeight = 14 * u;
  const barHeight = 10 * u;
  const balanceHeight = 14*u;

  const endcapRadius = 12 * u;

  //dynamic dimensions
  let paperWidth = $elem.width();
  var paperMidX = paperWidth / 2;
  var paperMidY = paperHeight/2;

  //colours
  const healthColour   = 'green';
  const manaColour     = 'royalBlue';
  const posDeltaColour = 'white';
  const negDeltaColour = 'red';


  //paper and segments
  const paper = Raphael(elemName, paperWidth, paperHeight);

  let health;
  let mana;
  let balanceLeft;
  let balanceRight;
  let eqLeft;
  let eqRight;

  let $topFlagText;
  let $bottomFlagText;



  function arcTo(x,y,radius,sweepFlag) {
    //endcaps are elliptical, so specify the same radius for both
    //axes to make them a circular arc.
    var radii = "" + radius + "," + radius + " ";
    var xAxisRot = "0 ";
    var flags = "0," + sweepFlag + " ";
    var endCoords = x + "," + y;
    return "A" + radii + xAxisRot + flags + endCoords;
  }

  function horzCentreOf(shape) {
    let bb = shape.getBBox();
    let ctr = bb.x + ( (bb.x2 - bb.x)/2 );
    return ctr;
  }

  /*
    Params:
      height            : of the bar
      pos               : 'left' or 'right'
      startOffset       : offset (in pixels) from centre where the segment begins (function)
      endOffset         : offset (in pixels) from centre where the segment ends (function)
      valueMax          : maximum value of the bar
      value             : initial value of the bar
      text              : text to displar in the centre of the segment
      lowColour         : colour when value is under 1/3
      medColour         : colour when value is over 1/3 and under 2/3
      highColour        : colour when bar is over 2/3
      fullColour        : colour when value is 100%
      borderColour      : border colour when value < 100%
      fullBorderColour  : border colour when value is 100%
      capRadius         : radius of the endcap curve (defaults to endcapRadius)
   */
  function Segment(params) {
    let self = this;

    let height           = params.height;
    let pos              = params.pos || 'left';
    let offset           = params.offset || function() { return 0; };
    let endOffset        = params.endOffset || function() { return (paperWidth / 2) - 4*u; };
    let valueMax         = params.valueMax || 1.0;
    let value            = params.value || 0.0;
    let lowColour        = params.lowColour || 'red';
    let medColour        = params.medColour || 'yellow';
    let highColour       = params.highColour || 'green';
    let fullColour       = params.fullColour || highColour;
    let borderColour     = params.borderColour || fullColour;
    let fullBorderColour = params.fullBorderColour || 'white';
    let capRadius        = params.capRadius || endcapRadius;

    //fixed dimensions (because the height never changes)
    let halfHeight = height / 2;
    let top = paperMidY - halfHeight;
    let bottom = paperMidY + halfHeight;
    let isLeft = pos === 'left';

    //width-dependent dimensions
    let segStart; //pixel coords of the start point
    let segEnd;   //pixel coords of the end point
    let widthMax; //width (in pixels) of a bar at valueMax

    //elements
    let $bar;
    let $delta;
    let $border;
    let $text;

    self.valueStr = function() { return `${value} / ${valueMax}`; };

    // min, max scaled relative to valueMax
    function pathStr(min, max) {
      const scale = widthMax / valueMax;
      const scaledMin = (min * scale);
      const scaledMax = (max * scale);
      let barStart = segStart + (isLeft ? -scaledMin : scaledMin);
      let barEnd = segStart + (isLeft ? -scaledMax : scaledMax);

      //console.log(`seg = ${segStart}->${segEnd}, scale = ${scale}, bar = ${min}->${max} (/ ${valueMax}) = ${barStart} -> ${barEnd}`);
      var startPath = "M" + barStart + "," + bottom;
      var startCap = arcTo(barStart, top, capRadius, isLeft ? 1 : 0);
      var topLine = "L" + barEnd + "," + top;
      var midCap = arcTo(barEnd, bottom, capRadius, isLeft ? 0 : 1);
      var bottomLine = "L" + barStart + "," + bottom;
      var endPath = "Z";
      return startPath + startCap + topLine + midCap + bottomLine + endPath;
    }

    function initElements() {
      self.calcDimensions();

      $delta = paper.path(pathStr(valueMax,valueMax));
      $bar = paper.path(pathStr(0,value));
      $border = paper.path(pathStr(0,valueMax));
      $text = paper.text(horzCentreOf($border), paperMidY, params.text || '');

      $delta.attr({fill: negDeltaColour, stroke: 'none'});
      $bar.attr({fill: fillColourForValue(value)});
      $border.attr({stroke: borderColour, 'stroke-width': 1});
      $text.attr({fill: 'white'});
    }

    self.calcDimensions = function() {
      let off = offset();
      let endOff = endOffset();

      if(isLeft) {
        segStart = paperMidX - off;
        segEnd = paperMidX - endOff;
        widthMax = segStart - segEnd;
      } else {
        segStart = paperMidX + off;
        segEnd = paperMidX + endOff;
        widthMax = segEnd - segStart;
      }
      //console.log(`segment ${params.text} u=${u} paperWidth=${paperWidth} midX=${paperMidX}`);
      //console.log(`off=${off} => start=${segStart}, endOff=${endOff} => end=${segEnd}`);
    };

    self.resizeElems = function() {
      self.calcDimensions();

      $delta.attr('path', pathStr(valueMax, valueMax));
      $bar.attr('path', pathStr(0, value));
      $border.attr('path', pathStr(0, valueMax));
      $text.attr('x', horzCentreOf($border));
    };

    self.setMax = function(newMax) {
      if(newMax !== valueMax) {
        valueMax = newMax;
        self.resizeElems();
      }
    };

    function fillColourForValue(v) {
      let fraction = v / valueMax;
      if     (fraction < 1/3) { return lowColour; }
      else if(fraction < 2/3) { return medColour; }
      else if(fraction < 1)   { return highColour; }
      else                    { return fullColour;}
    }

    self.deltaToValue = function(newVal) {
      let oldVal = value;
      value = newVal;
      if(newVal > oldVal) {
        $delta.attr({
          path: pathStr(oldVal, newVal),
          fill: posDeltaColour
        });
        $bar.animate(
          {
            fill: fillColourForValue(newVal),
            path: pathStr(0, newVal)
          },
          250,
          'linear'
        );
      } else if(newVal < oldVal) {
        $delta.attr({
          path: pathStr(newVal, oldVal),
          fill: negDeltaColour
        });
        $bar.attr({
          path: pathStr(0, newVal),
          fill: fillColourForValue(newVal)
        });
        $delta.animate(
          {
            path: pathStr(newVal, newVal)
          },
          250,
          'linear'
        );
      }

      $border.attr('stroke', value < valueMax ? borderColour : fullBorderColour);

    };

    self.timedRestore = function(duration, altColour) {
      const colour = altColour || 'white';
      $bar.attr({
        path: pathStr(0, valueMax),
        fill: colour
      });
      $bar.animate(
        { path: pathStr(valueMax, valueMax) },
        duration,
        'linear'
      );
    };

    self.completeRestore = function() {
      $bar.attr('fill', 'black');
    };

    self.text = function(newText) {
      $text.attr('text', newText);
    };

    initElements();
  }

  function calcDimensions() {
    paperWidth = $elem.width();
    paper.setSize(paperWidth, paperHeight);

    paperMidX = paperWidth / 2;
  }

  function generateElems() {
    paper.clear();

    function eqWidth() { return Math.max(paperWidth/24, 14*u); }
    function balanceWidth() { return paperWidth/10; }

    eqLeft = new Segment({
      height           : eqHeight,
      pos              : 'left',
      offset           : function() { return 8*u; },
      endOffset        : function() { return (8*u) + eqWidth(); },
      text             : 'eq',
      borderColour     : 'white',
      fullBorderColour : 'white'
    });

    eqRight = new Segment({
      height           : eqHeight,
      pos              : 'right',
      offset           : function() { return 8*u; },
      endOffset        : function() { return (8*u) + eqWidth(); },
      text             : 'eq',
      borderColour     : 'white',
      fullBorderColour : 'white'
    });

    balanceLeft = new Segment({
      height           : balanceHeight,
      pos              : 'left',
      offset           : function() { return (11*u) + eqWidth(); },
      endOffset        : function() { return (11*u) + eqWidth() + balanceWidth(); },
      text             : 'left',
      borderColour     : 'white',
      fullBorderColour : 'white'
    });

    balanceRight = new Segment({
      height           : balanceHeight,
      pos              : 'right',
      offset           : function() { return (11*u) + eqWidth(); },
      endOffset        : function() { return (11*u) + eqWidth() + balanceWidth(); },
      text             : 'right',
      borderColour     : 'white',
      fullBorderColour : 'white'
    });

    health = new Segment({
      height           : barHeight,
      pos              : 'left',
      offset           : function() { return (14*u) + eqWidth() + balanceWidth(); },
      endOffset        : function() { return (paperWidth/2) - (3*u); },
      valueMax         : 1.0,
      value            : 0.0,
      text             : 'health',
      highColour       : healthColour,
      fullColour       : healthColour,
      borderColour     : healthColour,
      fullBorderColour : 'white'
    });

    mana = new Segment({
      height           : barHeight,
      pos              : 'right',
      offset           : function() { return (14*u) + eqWidth() + balanceWidth(); },
      endOffset        : function() { return (paperWidth/2) - (3*u); },
      valueMax         : 1.0,
      value            : 0.0,
      text             : 'mana',
      highColour       : manaColour,
      fullColour       : manaColour,
      borderColour     : manaColour,
      fullBorderColour : 'white'
    });



    $topFlagText = paper.text(paperMidX, paperHeight*0.33, '^');
    $topFlagText.attr({fill: 'white'});

    $bottomFlagText = paper.text(paperMidX, paperHeight*0.67, 'v');
    $bottomFlagText.attr({fill: 'white'});

  }

  function bindAllEvents() {
    //bindClick([healthDelta,healthBar,healthBorder], function fn() {
    //  $self.trigger("healthClicked", {
    //    health: health,
    //    healthMax: healthMax,
    //    ratio: health/healthMax
    //  });
    //});

    //bindClick([manaDelta,manaBar,manaBorder], function fn() {
    //  $self.trigger("manaClicked", {
    //    mana: mana,
    //    manaMax: manaMax,
    //    ratio: mana/manaMax
    //  });
    //});

    //these don't bind click
    //bindEventsFor('health', [healthDelta,healthBar,healthBorder]);
    //bindEventsFor('mana', [manaDelta,manaBar,manaBorder]);
  }

  function resizeElems() {
    health.resizeElems();
    mana.resizeElems();
    balanceLeft.resizeElems();
    balanceRight.resizeElems();
    eqLeft.resizeElems();
    eqRight.resizeElems();
    $topFlagText.attr('x', paperMidX);
    $bottomFlagText.attr('x', paperMidX);
  }

  function setup() {
    calcDimensions();
    generateElems();
    bindAllEvents();
  }

  function cleanRender() {
    calcDimensions();
    resizeElems();
  }

  self.setMaxima = function (newHealthMax, newManaMax) {
    health.setMax(newHealthMax);
    mana.setMax(newManaMax);
  };

  self.setMaxHealth = function(x) {
    health.setMax(x);
    health.text(health.valueStr());
  };

  self.setMaxMana = function(x) {
    mana.setMax(x);
    mana.text(mana.valueStr());
  };

  self.setHealth = function(newVal) {
    health.deltaToValue(newVal);
    health.text(health.valueStr());
  };

  self.setMana = function(newVal) {
    mana.deltaToValue(newVal);
    mana.text(mana.valueStr());
  };

  self.setTopFlagText = function(newVal) {
    $topFlagText.attr('text', newVal);
  };

  self.setBottomFlagText = function(newVal) {
    $bottomFlagText.attr('text', newVal);
  };

  self.loseEq = function(hardOrSoft, duration) {
    const isSoft = (hardOrSoft === 'soft') || false;
    const colour = isSoft ? 'green': 'purple';
    eqLeft.timedRestore(duration, colour);
    eqRight.timedRestore(duration, colour);
  };

  self.regainEq = function() {
    eqLeft.completeRestore();
    eqRight.completeRestore();
  };

  self.loseLeftBalance = function(duration, item) {
    balanceLeft.text(item);
    balanceLeft.timedRestore(duration, 'red');
  };

  self.regainLeftBalance = function(item) {
    balanceLeft.text(item);
    balanceLeft.completeRestore();
  };

  self.loseRightBalance = function(duration, item) {
    balanceRight.text(item);
    balanceRight.timedRestore(duration, 'red');
  };

  self.regainRightBalance = function(item) {
    balanceRight.text(item);
    balanceRight.completeRestore();
  };

  self.wieldLeft = function (item) {
    balanceLeft.text(item);
  };

  self.wieldRight = function (item) {
    balanceRight.text(item);
  };

  self.loseBalance = function(side, restoreTime, item) {
    if(side === 'left') {self.loseLeftBalance(restoreTime, item); }
    else {self.loseRightBalance(restoreTime, item); }
  };

  self.regainBalance = function(side, item) {
    if(side === 'left') {self.regainLeftBalance(item); }
    else {self.regainRightBalance(item); }
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
    //console.log('infobar sizing from ' + paperWidth + ' to ' + $elem.width());
    if ($elem.width() !== paperWidth) {
      paperWidth = $elem.width();
      cleanRender();
    }
  });
}


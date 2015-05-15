'use strict';
let blocks = require('./blocks');
var ansiStripper = require('strip-ansi');

if (typeof Array.prototype.flatMap !== 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
  const self = this;

  let ParseState = {
    PRE: 'pre',
    TRIGGERED: 'triggered',
    SEP: 'separator',
    ROWS: 'row',
    COMPLETE: 'complete'
  };

  function defaultPostProcess(row) {
    return row.splice(1);
  }

  function TableSpec(params) {
    let self = this;
    let headerRegex = params.headerRegex;
    let separatorRegex = params.separatorRegex;
    let triggerRegex = params.triggerRegex;
    let rowRegex = params.rowRegex;
    let skipRegex = params.skipRegex;
    let headerPostProcess = params.headerPostProcess || defaultPostProcess;
    let rowPostProcess = params.rowPostProcess || defaultPostProcess;
    let stripAnsi = params.stripAnsi || false;

    self.attemptStart = function(rawLine, prevCtx) {
      let line = stripAnsi ? ansiStripper(rawLine) : rawLine;

      let ctx = prevCtx || {
        state: ParseState.PRE,
        rows: []
      };

      let match;
      if(triggerRegex && ctx.state === ParseState.PRE) {
        match = triggerRegex.exec(line);
        if(match) {
          ctx.state = ParseState.TRIGGERED;
        }
      } else if(headerRegex) {
        match = headerRegex.exec(line);
        if(match) {
          ctx.header = (params.hasOwnProperty('fixedHeader')) ? params.fixedHeader : headerPostProcess(match);
          if (separatorRegex) {
            ctx.state = ParseState.SEP;
          } else {
            ctx.state = ParseState.ROWS;
          }
        }
      } else {
        match = rowRegex.exec(line);
        if(match) {
          if(params.hasOwnProperty('fixedHeader')) {ctx.header = params.fixedHeader;}
          ctx.rows = [rowPostProcess(match)];
          ctx.state = ParseState.ROWS;
        }
      }

      if(ctx.state !== ParseState.PRE) {
        //console.log(`match for ${params.tag}`);
        ctx.processor = self;
        return ctx;
      }
    };

    self.progress = function(rawLine, ctx) {
      let line = stripAnsi ? ansiStripper(rawLine) : rawLine;

      //console.log(params.tag + ' ' + ctx.state + ' - ' + line);
      let match;
      switch (ctx.state) {
        case ParseState.PRE:
          console.error("can't progress a table match in the PRE state");
          return ctx;

        case ParseState.SEP:
          ctx.state = ParseState.ROWS;
          return ctx;

        case ParseState.TRIGGERED:
        case ParseState.ROWS:
          match = rowRegex.exec(line);
          var bailout = false;
          if (match) {
            ctx.rows.push(rowPostProcess(match));
          } else {
            if(skipRegex) {
              bailout = !skipRegex.exec(line);
            } else {
              bailout = true;
            }
          }

          if(bailout) {
            ctx.partingShot = line;
            ctx.state = ParseState.COMPLETE;
          }
          return ctx;

        case ParseState.COMPLETE:
          console.error("can't progress a table match in the COMPLETE state");
          return ctx;
      }
    };
  }

  function collapseBlanks(match) { return match.slice(1).filter(function(x){ return typeof x !== 'undefined'; }); }

  const who = new TableSpec({
    tag: 'who',
    headerRegex: /You can see the following people in the land:/,
    fixedHeader: ['Standing', 'Who', 'Idle', 'Where'],
    rowRegex: /^(\u001b\[\d+m)?(?:(?:\[)(.*?)(?:\])|(\{.*?\}))?\s*(.*?)\s*(?:<< idle (\d+H \d+m) >>)? ?(?:\[At: (.*) \])?\.?$/,
    rowPostProcess: function(match) {
      if(!match[1]) { match[1] = ''; } //ensure unmatched ANSI start is '' and not undefined
      if(!match[2] && !match[3]) {
        //named CCC entourage, fake an empty stature and prefix
        match[2] = '';
        match[4] = ' - ' + match[4];
      }
      if(!match[5]) { match[5] = ''; } //ensure unmatched idle time is '' and not undefined
      if(!match[6]) { match[6] = ''; } //ensure unmatched location is '' and not undefined
      let row = collapseBlanks(match); //strips match] [0] and coalesces undefined columns
      let head = row.shift(); //detach the first col (opening ANSI seq)
      row[0] = head + row[0];
      return row;
    }
  });

  const spheresense = new TableSpec({
    tag: 'spheresense',
    headerRegex: /You engage in a moment's deep thought, gathering a sense of the domain/,
    fixedHeader: ['Who', 'Where', 'Health', 'Mana'],
    rowRegex: /(\S+) \[([^\]]+)\](?:\s*)H: ((?:\d+)\/(?:\d+))(?:\s*)M: ((?:\d+)\/(?:\d+))/
  });

  const guilds = new TableSpec({
    tag: 'guilds',
    headerRegex: /^Guild Name *\| Guildhead *\| Patron Deity *\| Where *$/,
    fixedHeader: ['Guild', 'Head', 'Term', 'Patron', 'Location'],
    separatorRegex: /^-+ +-+ +-+ +-+$/,
    rowRegex: /^(.*?) Guild *\| (\S*) (?:\((\d+yr)\))? *\| (.*?) *\| (.*?) *$/
  });

  const bb = new TableSpec({
    tag: 'bbstatus',
    fixedHeader: ['Board', 'Read', 'Latest'],
    rowRegex: /^(?:(\S+) BB:|(Guildmasters):) +(?:(?:Read (\d+) out of (\d+))|(.*))$/,
    skipRegex: /^$/,
    rowPostProcess: collapseBlanks
  });

  const herblist = new TableSpec(({
    tag: 'herblist',
    headerRegex: /^(Herb|Poison) *(Method) *(Effect)$/,
    rowRegex: /^(\S*) *(\S*) *(.*)$/,
  }));

  function collapseLines(block) {
    block.text = block.lines.join('\n');
    delete block.lines;
    return block;
  }

  function processBlock(block) {
    if(block.hasOwnProperty('qual') && block.qual === 'text') {
      let lines = block.lines;
      //console.log('tabulating block: ' + block.lines);
      let pre = [];
      let post = [];
      let ctx;
      lines.forEach(function(line){
        if(ctx) {
          if(ctx.state === ParseState.COMPLETE) {
            post.push(line);
          } else if(ctx.state === ParseState.TRIGGERED) {
            ctx = ctx.processor.attemptStart(line,ctx);
          } else {
            ctx = ctx.processor.progress(line, ctx);
            if(ctx && ctx.partingShot) { post.push(ctx.partingShot); }
          }
        } else {
          ctx =
            who.attemptStart(line) ||
            bb.attemptStart(line) ||
            guilds.attemptStart(line) ||
            spheresense.attemptStart(line) ||
            herblist.attemptStart(line);
          if(!ctx || ctx.state === ParseState.TRIGGERED) {
            pre.push(line);
          }
        }
      });

      if(ctx) {
        let table = {
          qual: 'table',
          pre: pre.join('\n'),
          header: {
            rows: [ ctx.header ]
          },
          body: {
            rows: ctx.rows
          },
          post: post.join('\n')
        };

        //console.log(table);
        return table;
      } else {
        return collapseLines(block);
      }
    } else {
      return block;
    }
  }

  self.tabulate = function(block) {
    return (block instanceof blocks.Block) ? block.deepMap(processBlock) : block;
  };

}

module.exports = Tabulator;
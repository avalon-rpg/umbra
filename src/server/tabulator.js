'use strict';
let blocks = require('./blocks');

if (typeof Array.prototype.flatMap !== 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
  const self = this;

  let ParseState = {
    PRE: 'pre',
    SEP: 'separator',
    ROWS: 'row',
    COMPLETE: 'complete'
  };

  function defaultPostProcess(row) {
    return row.splice(1);
  }

  function TableSpec(params) {
    let self = this;
    let headerRegex = params.hasOwnProperty('headerRegex') ? params.headerRegex : null;
    let separatorRegex = params.hasOwnProperty('separatorRegex') ? params.separatorRegex : null;
    let rowRegex = params.rowRegex;
    let headerPostProcess = params.headerPostProcess || defaultPostProcess;
    let rowPostProcess = params.rowPostProcess || defaultPostProcess;

    self.attemptStart = function(line) {
      let ctx = {
        state: ParseState.PRE,
        rows: []
      };

      let match;
      if(headerRegex) {
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

    self.progress = function(line, ctx) {
      //console.log(params.tag + ' ' + ctx.state + ' - ' + line);
      let match;
      switch (ctx.state) {
        case ParseState.PRE:
          console.error("can't progress a table match in the PRE state");
          return ctx;

        case ParseState.SEP:
          ctx.state = ParseState.ROWS;
          return ctx;

        case ParseState.ROWS:
          match = rowRegex.exec(line);
          if (match) {
            ctx.rows.push(rowPostProcess(match));
          } else {
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
    rowPostProcess: function(match) {
      return match.slice(1).filter(function(x){ return typeof x !== 'undefined'; });
    }
  });

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
          } else {
            ctx = ctx.processor.progress(line, ctx);
            if(ctx && ctx.partingShot) { post.push(ctx.partingShot); }
          }
        } else {
          ctx =
            bb.attemptStart(line) ||
            guilds.attemptStart(line) ||
            spheresense.attemptStart(line);
          if(!ctx) {
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
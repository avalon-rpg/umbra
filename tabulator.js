

if (typeof Array.prototype.flatMap != 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
}

var sphereSenseRegex = /(\S+) \[([^\]]+)\](?:\s+)H: ((?:\d+)\/(?:\d+))(?:\s*)M: ((?:\d+)\/(?:\d+))/;


Tabulator.prototype.process = function (block) {
  var self = this;
  if(!block.entries || block.entries.size == 0) { return block; }

  var outEntries = [];
  var rows;
  var sphereSense = false;

  function pushRows() {
    if(rows) {
      outEntries.push({
        qual: 'table',
        rows: rows
      });
      rows = null;
    }
  }

  if(block.tags.indexOf('sphere sense') >= 0) { sphereSense = true; }

  if(sphereSense) { rows = [{header: true, cells: ['who', 'where', 'health', 'mana']}]; }

  var len = block.entries.length;
  for(i=1; i < len; ++i) {
    var entry = block.entries[i];

    if(sphereSense) {
      var match = sphereSenseRegex.exec(entry.line);
      if(match) {
        rows.push({
          header: false,
          cells: [match[1],match[2],match[3],match[4]]
        });
      } else {
        pushRows();
        outEntries.push(self.process(entry));
      }
    } else {
      outEntries.push(self.process(entry));
    }
  }
  pushRows();

  block.entries = outEntries;
  return block;
};

module.exports = Tabulator;
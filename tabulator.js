

if (typeof Array.prototype.flatMap != 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
}

var sphereSenseRegex = /(\S+) at ([^\.]+)\.(?:\s+)H: ((?:\d+)\/(?:\d+))(?:\s*)M: ((?:\d+)\/(?:\d+))/;


Tabulator.prototype.process = function (block) {
  if(!block.entries || !block.monospaced) { return block; }

  var outEntries = [];
  var rows = null;

  var len = block.entries.length;
  for(i=1; i < len; ++i) {
    var entry = block.entries[i];

    if(entry.qual == 'unparsed'
    && entry.line == 'You engage in a moment\'s deep thought, gathering a sense of the domain.') {
      rows = [{header: true, cells: ['who', 'where', 'health', 'mana']}];
    } else {
      var match = sphereSenseRegex.exec(entry.line);
      if(match) {
        rows.push({
          header: false,
          cells: [match[1],match[2],match[3],match[4]]
        });
      } else {
        if(rows) {
          outEntries.push({
            qual: 'table',
            rows: rows
          });
          rows = null;
        }
        outEntries.push(entry);
      }
    }
  }

  var newBlock = {
    monospaced: false,
    entries: outEntries,
    prompt: block.prompt
  };
  outEntries = [];
  return newBlock;
};

module.exports = Tabulator;
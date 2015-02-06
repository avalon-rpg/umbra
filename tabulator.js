

if (typeof Array.prototype.flatMap != 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
}

var sphereSenseRegex = /(\S+) at ([^\.]+)\.(?:\s+)H: ((?:\d+)\/(?:\d+))(?:\s*)M: ((?:\d+)\/(?:\d+))/;

function parseSphereSense(block) {
  var rows = [{header: true, cells: ['who', 'where', 'health', 'mana']}];
  var len = block.entries.length();
  for(i=1; i < len; ++i) {
    var entry = block.entries[i];
    var match = sphereSenseRegex.exec(entry.line);
    if(match) {
      rows.push({
        header: false,
        cells: [match[1],match[2],match[3],match[4]]
      });
    } else {
      console.log('mismatch: ' + entry.line);
    }
  }

  return {
    monospaced: false,
    entries: [{
      qual: 'table',
      rows: rows
    }],
    prompt: block.prompt
  };
}

Tabulator.prototype.process = function (block) {
  if(!block.entries || !block.monospaced) { return block; }

  var outEntries = [];
  var rows = null;

  console.log(JSON.stringify(block));

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
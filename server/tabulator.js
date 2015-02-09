

if (typeof Array.prototype.flatMap != 'function') {
  Array.prototype.flatMap = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

function Tabulator() {
}

var sphereSenseRegex = /(\S+) \[([^\]]+)\](?:\s*)H: ((?:\d+)\/(?:\d+))(?:\s*)M: ((?:\d+)\/(?:\d+))/;

Tabulator.prototype.tabulate = function (data) {
  return process(data);

  function process(block) {
    if (!block.entries || block.entries.length == 0) {
      return block;
    }

    var outEntries;
    var table;
    var sphereSense = false;

    function flushTable() {
      if (table) {
        //console.log('tabulator flushing: ' + rows.length + " rows");
        addEntry(table);
        table = null;
      }
    }

    function addEntry(entry) {
      //console.log('tabulator adding entry: ' + JSON.stringify(entry, null, 2));

      if(!outEntries || outEntries.length == 0) {
        outEntries = [process(entry)];
      } else {
        outEntries.push(process(entry));
      }
    }

    function addRow(row) {
      if(!table) {
        table = {
          qual: 'table',
          body: {
            rows: [row]
          }
        };
      } else if(!table.body) {
        table.body = {
          rows: [row]
        };
      } else if(!table.body.rows || table.body.rows.length <= 0) {
        table.body.rows = [row];
      } else {
        table.body.rows.push(row);
      }

    }

    if (block.tags.indexOf('spheresense') >= 0) {
      sphereSense = true;
      var idx = block.tags.indexOf('monospaced')
      if (idx > -1) {
        block.tags.splice(idx, 1);
      }
    }

    var len = block.entries.length;
    for (var i = 0; i < len; ++i) {
      var entry = block.entries[i];
      //console.log('tabulator scanning: ' + JSON.stringify(entry, null, 2));

      if (sphereSense) {
        var match = sphereSenseRegex.exec(entry.line);
        if (match) {
          addRow([match[1], match[2], match[3], match[4]]);
        } else if(entry.qual == 'marker' && entry.markerFor == 'spheresense') {
          table = {
            qual: 'table',
            header: {
              rows: [
                ['who', 'where', 'health', 'mana']
              ]
            }
          };
        } else {
          addEntry(entry);
        }
      } else {
        addEntry(entry);
      }
    }
    flushTable();

    block.entries = outEntries;
    return block;
  }
};

module.exports = Tabulator;
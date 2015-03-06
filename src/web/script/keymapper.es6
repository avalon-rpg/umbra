

const macroCodes = {
  112: {char: 'F1',  cmd: "1",  shiftCmd: "13", ctrlCmd: "25", altCmd: "37", metaCmd: "49"},
  113: {char: 'F2',  cmd: "2",  shiftCmd: "14", ctrlCmd: "26", altCmd: "38", metaCmd: "50"},
  114: {char: 'F3',  cmd: "3",  shiftCmd: "15", ctrlCmd: "27", altCmd: "39", metaCmd: "51"},
  115: {char: 'F4',  cmd: "4",  shiftCmd: "16", ctrlCmd: "28", altCmd: "40", metaCmd: "52"},
  116: {char: 'F5',  cmd: "5",  shiftCmd: "17", ctrlCmd: "29", altCmd: "41", metaCmd: "53"},
  117: {char: 'F6',  cmd: "6",  shiftCmd: "18", ctrlCmd: "30", altCmd: "42", metaCmd: "54"},
  118: {char: 'F7',  cmd: "7",  shiftCmd: "19", ctrlCmd: "31", altCmd: "43", metaCmd: "55"},
  119: {char: 'F8',  cmd: "8",  shiftCmd: "20", ctrlCmd: "32", altCmd: "44", metaCmd: "56"},
  120: {char: 'F9',  cmd: "9",  shiftCmd: "21", ctrlCmd: "33", altCmd: "45", metaCmd: "57"},
  121: {char: 'F10', cmd: "10", shiftCmd: "22", ctrlCmd: "34", altCmd: "46", metaCmd: "58"},
  122: {char: 'F11', cmd: "11", shiftCmd: "23", ctrlCmd: "35", altCmd: "47", metaCmd: "59"},
  123: {char: 'F12', cmd: "12", shiftCmd: "24", ctrlCmd: "36", altCmd: "48", metaCmd: "60"},

  49:  {char: '1', ctrlCmd: "61", altCmd: "71", metaCmd: "81", ctrlAltCmd: "91",  metaAltCmd: "181"},
  50:  {char: '2', ctrlCmd: "62", altCmd: "72", metaCmd: "82", ctrlAltCmd: "92",  metaAltCmd: "182"},
  51:  {char: '3', ctrlCmd: "63", altCmd: "73", metaCmd: "83", ctrlAltCmd: "93",  metaAltCmd: "183"},
  52:  {char: '4', ctrlCmd: "64", altCmd: "74", metaCmd: "84", ctrlAltCmd: "94",  metaAltCmd: "184"},
  53:  {char: '5', ctrlCmd: "65", altCmd: "75", metaCmd: "85", ctrlAltCmd: "95",  metaAltCmd: "185"},
  54:  {char: '6', ctrlCmd: "66", altCmd: "76", metaCmd: "86", ctrlAltCmd: "96",  metaAltCmd: "186"},
  55:  {char: '7', ctrlCmd: "67", altCmd: "77", metaCmd: "87", ctrlAltCmd: "97",  metaAltCmd: "187"},
  56:  {char: '8', ctrlCmd: "68", altCmd: "78", metaCmd: "88", ctrlAltCmd: "98",  metaAltCmd: "188"},
  57:  {char: '9', ctrlCmd: "69", altCmd: "79", metaCmd: "89", ctrlAltCmd: "99",  metaAltCmd: "189"},
  48:  {char: '0', ctrlCmd: "70", altCmd: "80", metaCmd: "90", ctrlAltCmd: "100", metaAltCmd: "190"},

  65:  {char: 'A', ctrlCmd: "101", altCmd: "127", metaCmd: "153"},
  66:  {char: 'B', ctrlCmd: "102", altCmd: "128", metaCmd: "154"},
  67:  {char: 'C', ctrlCmd: "103", altCmd: "129", metaCmd: "155"},
  68:  {char: 'D', ctrlCmd: "104", altCmd: "130", metaCmd: "156"},
  69:  {char: 'E', ctrlCmd: "105", altCmd: "131", metaCmd: "157"},
  70:  {char: 'F', ctrlCmd: "106", altCmd: "132", metaCmd: "158"},
  71:  {char: 'G', ctrlCmd: "107", altCmd: "133", metaCmd: "159"},
  72:  {char: 'H', ctrlCmd: "108", altCmd: "134", metaCmd: "160"},
  73:  {char: 'I', ctrlCmd: "109", altCmd: "135", metaCmd: "161"},
  74:  {char: 'J', ctrlCmd: "110", altCmd: "136", metaCmd: "162"},
  75:  {char: 'K', ctrlCmd: "111", altCmd: "137", metaCmd: "163"},
  76:  {char: 'L', ctrlCmd: "112", altCmd: "138", metaCmd: "164"},
  77:  {char: 'M', ctrlCmd: "113", altCmd: "139", metaCmd: "165"},
  78:  {char: 'N', ctrlCmd: "114", altCmd: "140", metaCmd: "166"},
  79:  {char: 'O', ctrlCmd: "115", altCmd: "141", metaCmd: "167"},
  80:  {char: 'P', ctrlCmd: "116", altCmd: "142", metaCmd: "168"},
  81:  {char: 'Q', ctrlCmd: "117", altCmd: "143", metaCmd: "169"},
  82:  {char: 'R', ctrlCmd: "118", altCmd: "144", metaCmd: "170"},
  83:  {char: 'S', ctrlCmd: "119", altCmd: "145", metaCmd: "171"},
  84:  {char: 'T', ctrlCmd: "120", altCmd: "146", metaCmd: "172"},
  85:  {char: 'U', ctrlCmd: "121", altCmd: "147", metaCmd: "173"},
  86:  {char: 'V', ctrlCmd: "122", altCmd: "148", metaCmd: "174"},
  87:  {char: 'W', ctrlCmd: "123", altCmd: "149", metaCmd: "175"},
  88:  {char: 'X', ctrlCmd: "124", altCmd: "150", metaCmd: "176"},
  89:  {char: 'Y', ctrlCmd: "125", altCmd: "151", metaCmd: "177"},
  90:  {char: 'Z', ctrlCmd: "126", altCmd: "152", metaCmd: "178"}
};

function lookupMacroCmd(e) {
  let row = macroCodes[e.which];
  if(!row) { return null; }

  let naked = !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
  if (naked && row.cmd) { return row.cmd; }

  let shift = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
  if (shift && row.shiftCmd) { return row.shiftCmd; }

  let ctrl = !e.shiftKey &&  e.ctrlKey && !e.altKey && !e.metaKey;
  if (ctrl && row.ctrlCmd) { return row.ctrlCmd; }

  let alt = !e.shiftKey && !e.ctrlKey &&  e.altKey && !e.metaKey;
  if (alt && row.altCmd) { return row.altCmd; }

  let meta = !e.shiftKey && !e.ctrlKey && !e.altKey &&  e.metaKey;
  if (meta && row.metaCmd) { return row.metaCmd; }

  let ctrlAlt  = !e.shiftKey &&  e.ctrlKey && e.altKey && !e.metaKey;
  if (ctrlAlt && row.ctrlAltCmd) { return row.ctrlAltCmd; }

  let metaAlt  = !e.shiftKey && !e.ctrlKey && e.altKey &&  e.metaKey;
  if (metaAlt && row.metaAltCmd) { return row.metaAltCmd; }

  return null;
}

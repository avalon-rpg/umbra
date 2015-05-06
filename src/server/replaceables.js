'use strict';

function Replaceables() {
  function escape(text) {
    return text.toLowerCase()
      .replace(/\(/g,'')
      .replace(/\)/g,'')
      .replace(/\s+/g, '-')
      .replace(/'/g, '')
      .replace(/"/g, '');
  }

  const entries = [
    {
      regex: /^(\S+) has just departed beyond the confines of your sphere of control\.$/,
      func: function(match) { return 'oracle-sphere-movement-' + escape(match[1]); }
    },{
      regex: /^(\S+) has just stepped within your sphere of control\.$/,
      func: function(match) { return 'oracle-sphere-movement-' + escape(match[1]); }
    },{
      regex: /^The ethereal flow continues to be absorbed into your seedpod: (\d+) seeds absorbed into (\d+) potency within the pod\.$/,
      func: function() { return 'oracle-pod-absorb-self'; }
    },{
      regex: /^(You note marks of your own ethereal seed below\. )?Ethereal marking at "(.*)" now at: (\d+)\.$/,
      func: function(match) { return 'oracle-marking-' + escape(match[2]); }
    },{
      regex: /^(You note marks of your own ethereal seed below\. )?You allow an ethereal seed of ether to fall through the oracle-eye. The seed markings at "(.+)" now number (.+)\.$/,
      func: function(match) { return 'oracle-marking-' + escape(match[2]); }
    },{
      regex: /^Below at "(.+)" the ether continue to twine and thicken about the (.+), the wall (.*) percent towards completion\.$/,
      func: function(match) { return 'oracle-wall-building-' + match[2]; }
    },{
      regex: /^The oracle-eye focus is unusually sharp as it draws up a sparkling flow of ether from the (.+) of "(.+)", directing it (.*) to gather density; (.*) percent complete\.$/,
      func: function(match) { return 'oracle-raising-' + match[3]; }
    },{
      regex: /^(.+) is fully manifested at the (.+) reaches of the wind; the last of the sparkling flow having passed up through the oracle-eye.$/,
      func: function(match) { return 'oracle-raising-' + match[2]; }
    },{
      regex: /^Ether continues to flow through the eye, from the (.+) region to "(.+)" below. The supercharged particles gather at the (.+), enlarging (\d+)% of the ethereal creation\.$/,
      func: function(match) { return 'oracle-lowering-' + match[1] + '-' + match[3]; }
    },{
      regex: /^(.+) has dropped seed markings below\.$/,
      func: function(match) { return 'oracle-othermarks-' + match[1]; }
    },{
      regex: /^The battle for supremacy with (.*) over "(.*)" continues: (.*) further focus bouts and the attack (.*) will be completed, permanently expanding the (.*) sphere of control\.$/,
      func: function(match) { return 'far-attack-' + match[4]; }
    }
  ];

  this.attempt = function(text) {
    console.log(`testing replaceable: ${text}`);

    let tag;
    entries.some(function(entry) {
      let match = entry.regex.exec(text);
      if(match) {
        tag = entry.func(match);
        return true;
      }
    });

    if(tag) { return tag; }
  };
}

module.exports = new Replaceables();
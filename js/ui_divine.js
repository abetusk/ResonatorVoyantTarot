/*
 *
 * To the extent possible under law, the person who associated CC0 with
 * this source code has waived all copyright and related or neighboring rights
 * to this source code.
 *
 * You should have received a copy of the CC0 legalcode along with this
 * work.  If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
 *
 */

// The function `tarot_reading_celtic_cross` is the one that takes in the
// text data of the tarot reading, produces the tarot reading and "draw"
// from the deck.
//

// SVG animations are too slow, especially for the complexity of SVG I'm
// using, apparently (on firefox). To get smooth animation, each
// divination (celtic cross reading) card is rendered as 3-4 layers
// of stacked PNGs, rendered in PIXI.
// Each PNG is rendered from SVG via `canvg`, than added as a spriate
// a scene, one for each of the 10 cards.
//
// `finit` is what gets called after`init` has finished.
// Once `finit` is called, the text for the tarot reading is ready so
// the reading can be done and the cards can be rendered.
// `finit` calls `init_pix_layered_card` to render the PNGs from the SVGs
// and then sets up `start_card_canvas`, with a mutex
// on when all the PNGs have finished rendering so it can start drawing
// the canvas.
//
// From `finit`, when setting up the `init_pixi_layered_card`, there's
// another countdown mutex called `card_queue` that, when 0, calls
// `display_tarot` to fade in all the 10 cards when theny're ready.
//

// The `realize_tarot_sched` creates the 'schedule' of creatures
// and backgrounds for each of the cards which is later used to 
// generate the SVG.
//

// `populate_deck_image` poulates the whole deck with SVG images.
//

var SIBYL_DIVING_VERSION = "0.1.2";

var CARD_HEIGHT= 317;
var CARD_WIDTH = 190;

var _RESCALE = CARD_HEIGHT / 720.0;

function rndstr(m) {
  m = ((typeof m === "undefined") ? 32 : m);
  var seed = "";
  var x = "abcdefghijklmnopqrstuvwxyzABDCEFGHIJKLMNOPQRSTUVWXYZ01234567890";
  var n = x.length;
  for (var ii=0; ii<m; ii++) {
    seed += x[ Math.floor(Math.random()*n) ];
  }
  return seed;
}



// global data structure to hold tarot interpretations (loaded from
// `tarot_interpretations.json`)
//
var g_tarot = {
  "ready": false,
  "reading" : [
   //{ "sentence":"<b><u>King of Coins</u> <small>(light)</small></b></u><br>Becoming so conservative you resist all change on principle alone"},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."},
   { "sentence":"..."}
  ]
};

var g_ui = {
  "mobile_width":800,
  "mobile_view" : false,
  "modal_info_state": "off",
  "button_state" : {
    "ui_button_reading" : { "state": "off" },
    "ui_button_deck" : { "state": "off" },
    "ui_button_download": { "state": "off" }
  },
  "card_state" : [
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false },
    { "ready": false }
  ],
  "caption_dxy" : {
    //"ui_card0" : [200,-150],
    "ui_card0" : [200,-180],
    "ui_card1" : [-180,250],
    "ui_card2" : [0,-180],
    "ui_card3" : [0,330],
    "ui_card4" : [0,-180],
    "ui_card5" : [0,330],
    //"ui_card6" : [-220,120],
    "ui_card6" : [-220,150],
    //"ui_card7" : [-220,300],
    "ui_card7" : [-220,320],
    //"ui_card8" : [-220,-120],
    "ui_card8" : [-220,-150],
    "ui_card9" : [-220,-20]
  }
};

var g_data = {
  "seed": "x",
  "is_seed_random" : true,
  "card_queue": 10,

  "deck_queue_count":78,
  "deck_ready": false,
  "deck_download_in_progress" : false,


  "numeral" : {
    "0": "0", "1": "I", "2": "II", "3": "III", "4": "IV",
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII", "13": "XIII", "14": "XIV", "15": "XV",
    "16": "XVI", "17": "XVII", "18": "XVIII", "19": "XIX", "20": "XX",
    "21": "XXI", "22": "XXII", "23": "XXIII", "24": "XXIV"
  },

  "minor_arcana" : [ "ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "page", "knight", "queen", "king" ],
  //"minor_arcana_suit" : ["pentacle", "key", "sword", "cup"],
  "minor_arcana_suit" : ["key", "cup", "sword", "pentacle"],

  "major_arcana" : [
    { "name": "THE FOOL",       "symbol":"fool" ,       "exclude":true,   "scale": 0.95, "d":[0,-40]},
    { "name": "THE MAGICIAN",   "symbol":"magician",    "exclude":true,   "scale": 0.95},
    { "name": "THE PRIESTESS",  "symbol":"priestess",   "exclude":true,   "scale": 0.85},
    { "name":"THE EMPRESS",     "symbol":"empress",     "exclude":true,   "scale": 0.95},
    { "name":"THE EMPEROR",     "symbol":"emperor" ,    "exclude":true,   "scale": 0.85},
    { "name":"THE HIEROPHANT",  "symbol":"hierophant",  "exclude":true,   "scale": 0.85},
    { "name":"THE LOVERS",      "symbol":"lovers_nestbox" ,           "exclude":false,  "scale": 0.9},
    { "name":"THE CHARIOT",     "symbol":"chariot",     "exclude":true,   "scale": 0.75},
    { "name":"STRENGTH",        "symbol":"strength",    "exclude":true,   "scale": 0.9},
    { "name":"THE HERMIT",      "symbol":"hermit",      "exclude":true,   "scale": 0.9},
    { "name":"WHEEL of FORTUNE","symbol":"wheel_of_fortune",  "exclude":true, "scale": 0.75, "d":[0,-20]},
    { "name":"JUSTICE",         "symbol":"scales" ,     "exclude":false,  "scale":0.85, "d":[0,-40]},
    { "name":"THE HANGED MAN",  "symbol":"sycophant",   "exclude":true,   "scale": 0.9},
    { "name":"DEATH",           "symbol":"death",       "exclude":true,   "scale": 0.9, "d":[0,-20]},
    { "name":"TEMPERANCE",      "symbol":"waterworks",  "exclude":true,   "scale": 0.75, "d":[0,-40]},
    //{ "name":"THE DEVIL",       "symbol":"devil",       "exclude":true,   "scale": 0.75},
    { "name":"THE DEVIL",       "symbol":"goat_head",       "exclude":true,   "scale": 0.95, "d":[0,-40]},
    { "name":"THE TOWER",       "symbol":"castle_tower","exclude":true,   "scale": 0.9, "d":[0,-20]},
    { "name":"THE STAR",        "symbol":"starburst",   "exclude":true,   "scale": 0.75},
    { "name":"THE MOON",        "symbol":"moon",        "exclude":true,   "scale": 0.75},
    { "name":"THE SUN",         "symbol":"sun",         "exclude":true,   "scale": 0.75},
    { "name":"JUDGEMENT",       "symbol":"trumpet",     "exclude":true,   "scale": 0.9, "d" : [-50, -50] },
    { "name":"THE WORLD",       "symbol":"globe",       "exlcude":false,  "scale": 0.75, "d":[0,-40]}
  ],

  "ace_choice" : [
    "window", "door", "wings_pair", "ring", "lotus",
    "hands_giving", "hands_pair", "hand_side", "hand_open_3_4",
    "hand_claddagh", "flower_8petal", "cloud", "circle",
    "scroll_double", "table", "chair", "box", "book_open", "arms_strong"
  ],

  "royalty_crown_choice" : [ "crown", "crown_5pt", "crown_5pt2", "crown_hierophant", "crown_ornate" ],
  "royalty_sceptor_choice" : [ "ankh_emperor", "cross_hierophant" ],

  "royalty_choice" : [
    "bird", "bitey_half", "cat", "cow_head",
    "dog", "eagle_shield", "egg",
    "fish", "goat",
    //"goat_head",
    "horse",
    "lamb_head", "oroboros", "pear",
    "skeleton", "virus"
  ],


  "back_creature_choice" : [
    "branch", "branch_curly", "bubbles", "cloud", "clouds", "eye",
    "eye_eyelashes", "eye_starburst", "eye_up", "eye_up_starburst", "eye_up_starburst_2", "eye_vertical",
    "eyeball", "flower_jacobean_smaller", "hourglass", "infinity", "lotus", "pills",
    "rain", "tree_rooted", "wave", "teardrop"
  ],

  "exclude_all" : [ ],
  "exclude_all_and_wing" : [],

  "svg_text" : { },
  "svg_text_inner" : { },
  "png_text" : {},

  "png_card" : {
    "ui_canvas_card0" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card1" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card2" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card3" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card4" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card5" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card6" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card7" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card8" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    "ui_canvas_card9" : { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
  },


  "_png_card" : [
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined },
    { "n":-1, "fg":undefined, "bg":undefined, "text":undefined, "suit":undefined }
  ],

  "rnd" : []


};

function postprocess_g_data() {
  for (var ii=0; ii<10; ii++) {
    g_data.rnd.push( Math.random()*3/4 + 0.25 );
    g_data.rnd.push( Math.random()/2 + 0.5 );
    g_data.rnd.push( Math.random()/2 + 0.5 );
  }

  for (var ii=0; ii<g_data.minor_arcana_suit.length; ii++) {
    g_data.exclude_all.push(g_data.minor_arcana_suit[ii]);
  }

  for (var ii=0; ii<g_data.major_arcana.length; ii++) {
    if (g_data.major_arcana[ii].exclude) {
      g_data.exclude_all.push(g_data.major_arcana[ii].symbol);
    }
  }

  for (var ii=0; ii<sibyl.tarot_template.length; ii++) {
    g_data.exclude_all.push(sibyl.tarot_template[ii].name);
  }


  g_data.exclude_all.push("knight");
  g_data.exclude_all.push("bob");
  g_data.exclude_all.push("rainbow_half");
  g_data.exclude_all.push("angel");
  g_data.exclude_all.push("lovers_nestbox");
  g_data.exclude_all.push("empty");

  // single wings look bad when they're the base
  // creature, so exclude them for the minor
  // arcana base creature choice.
  //
  for (var ii=0; ii<g_data.exclude_all.length; ii++) {
    g_data.exclude_all_and_wing.push(g_data.exclude_all[ii]);
  }
  g_data.exclude_all_and_wing.push("wing");
  g_data.exclude_all_and_wing.push("wing_angel");
  g_data.exclude_all_and_wing.push("wing_angel2");
  g_data.exclude_all_and_wing.push("wing_bat");
  g_data.exclude_all_and_wing.push("wing_butterfly");
  g_data.exclude_all_and_wing.push("wing_eagle");
  g_data.exclude_all_and_wing.push("wing_egypt");
  g_data.exclude_all_and_wing.push("empty");

}

postprocess_g_data();


// index in tarot_interpretations maps to a local SVG file
//
var card_mapping = [
  "00-THE_FOOL.svg",   "01-THE_MAGICIAN.svg",   "02-THE_PRIESTESS.svg",   "03-THE_EMPRESS.svg",   "04-THE_EMPEROR.svg",
  "05-THE_HIEROPHANT.svg",   "06-THE_LOVERS.svg",   "07-THE_CHARIOT.svg",   "08-STRENGTH.svg",   "09-THE_HERMIT.svg",
  "10-WHEEL_of_FORTUNE.svg",   "11-JUSTICE.svg",   "12-THE_HANGED_MAN.svg",   "13-DEATH.svg",   "14-TEMPERANCE.svg",
  "15-THE_DEVIL.svg",   "16-THE_TOWER.svg",   "17-THE_STAR.svg",   "18-THE_MOON.svg",   "19-THE_SUN.svg",
  "20-JUDGEMENT.svg",   "21-THE_WORLD.svg",

  "36-key_ace.svg",   "37-key_2.svg",   "38-key_3.svg",   "39-key_4.svg",
  "40-key_5.svg",   "41-key_6.svg",   "42-key_7.svg",   "43-key_8.svg",   "44-key_9.svg",
  "45-key_10.svg",   "46-key_page.svg",   "47-key_knight.svg",   "48-key_queen.svg",   "49-key_king.svg",

  "64-cup_ace.svg", "65-cup_2.svg",   "66-cup_3.svg",   "67-cup_4.svg",   "68-cup_5.svg",
  "69-cup_6.svg", "70-cup_7.svg",   "71-cup_8.svg",   "72-cup_9.svg",   "73-cup_10.svg",   "74-cup_page.svg",
  "75-cup_knight.svg",   "76-cup_queen.svg",   "77-cup_king.svg",

  "50-sword_ace.svg",   "51-sword_2.svg",   "52-sword_3.svg",   "53-sword_4.svg",   "54-sword_5.svg",
  "55-sword_6.svg",   "56-sword_7.svg",   "57-sword_8.svg",   "58-sword_9.svg",   "59-sword_10.svg",
  "60-sword_page.svg",   "61-sword_knight.svg",   "62-sword_queen.svg",   "63-sword_king.svg",

  "22-pentacle_ace.svg",   "23-pentacle_2.svg",   "24-pentacle_3.svg",
  "25-pentacle_4.svg",   "26-pentacle_5.svg",   "27-pentacle_6.svg",   "28-pentacle_7.svg",   "29-pentacle_8.svg",
  "30-pentacle_9.svg",   "31-pentacle_10.svg",   "32-pentacle_page.svg",   "33-pentacle_knight.svg",   "34-pentacle_queen.svg",
  "35-pentacle_king.svg",

  "78-back.svg"
];


var g_rng = Math.random;

function rseed() {
  var seed = "";
  var x = "abcdefghijklmnopqrstuvwxyzABDCEFGHIJKLMNOPQRSTUVWXYZ01234567890";
  var n = x.length;
  for (var ii=0; ii<32; ii++) {
    seed += x[ Math.floor(Math.random()*n) ];
  }
  return seed;
}

function rstr(_rng, n) {
  var _s = "";

  for (var ii=0; ii<(n/2); ii++) {
    var t = Math.floor(_rng()*256).toString(16);
    t = ((t.length == 1) ? ('0' + t) : t);
    _s += t;
  }
  return _s;
}

function remove_from_array(orig, filt) {
  var r = [];
  for (var ii=0; ii<orig.length; ii++) {
    var found = false;
    for (var jj=0; jj<filt.length; jj++) {
      if (filt[jj] == orig[ii]) {
        found = true;
        break;
      }
    }

    if (!found) { r.push( orig[ii] ); }
  }
  return r;
}

// Integer random number in range of n
//
function _irnd(n) {
  if (typeof n === "undefined") { n=2; }
  //return Math.floor(g_rng.double()*n);
  return Math.floor(g_rng()*n);
}


// Choose random element from array
//
function _crnd(a) {
  if (typeof a === "undefined") { return undefined; }
  var idx = _irnd(a.length);
  var copy = undefined;
  if (typeof a[idx] === "object") {
    _copy = Object.assign({}, a[idx]);
  }
  else { _copy = a[idx]; }
  return _copy;
}


// callback for loading the JSON `tarot_interpretations.json`
//
function _tarot_json_cb(x) {
  if (x.type == "loadend") {
    if (x.target.readyState == 4) {
      g_tarot["data"] = JSON.parse(x.target.response);
      g_tarot.ready = true;
    }
  }
}

// generic load funciton to fetch a server file
//
function _load(url, _cb) {
  var xhr = new XMLHttpRequest();
  xhr.addEventListener("loadend", _cb);
  xhr.open("GET", url);
  xhr.send();
  return xhr;
} 

// n undefined or 0 -  capitalize every word except for 'of'
// n > 0            -  capitalize n non 'of' words
// n < 0            -  un capitalize |n| non 'of' words
//
// return string
//
function _capitalize(txt,n) {
  n = ((typeof n === "undefined") ? 0 : n);
  var uc = true;

  if (n<0) {
    uc = false;
    n = -n;
  }

  var tok = txt.split(" ");
  var n_cap = 0;

  for (var ii=0; ii<tok.length; ii++) {
    if ((n!=0) && (n_cap >= n)) { break; }

    if (tok[ii].toLowerCase() != "of") {
      if (uc) {
        tok[ii] = tok[ii][0].toUpperCase() + tok[ii].slice(1);
      }
      else {
        tok[ii] = tok[ii][0].toLowerCase() + tok[ii].slice(1);
      }
      n_cap++;
    }
    else {
      tok[ii] = tok[ii][0].toLowerCase() + tok[ii].slice(1);
    }

  }

  return tok.join(" ");

}

// Do a 'celtic cross' tarot reading.
// randomely permute the order, take the first 10 cards
// for the interpretations
//
function tarot_reading_celtic_cross(tarot_data) {
  var d = tarot_data.tarot_interpretations;
  var n = d.length;
  var a_idx = [];

  var card_spread = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j' ];
  var n_card = card_spread.length;

  //var light_phrases = [ "consider", "aim for", "try", "explore", "look into" ];
  var light_phrases = [ "consider", "aim for", "try", "explore", "look into", "contemplate", "deliberate on", "ruminate over", "reflect on" ];
  var shadow_phrases = [ "be wary of", "avoid", "steer clear of", "forgo", "refain from", "resist", "stop", "be suspicious of" ];

  // sentence narratives
  //
  var narrative_fatalistic = [
    "To resolve your situation",
    "To help clear the obstacle",
    "To help achieve your hope or goal",
    "To get at the root of your question",

    "To help see an influence that will soon have an impact",

    "To help see how you've gotten to this point",
    "To help interpret your feelings about the situation",
    "To help you understand the moods of those closest to you",
    "To help understand your fear",
    "To help see the outcome"
  ];

  var narrative_optimistic = [
    "Your situation",
    "An influence now coming into play",
    "Your hope or goal",
    "The issue at the root of your question",
    "An influence that will soon have an impact",
    "Your history",
    "The obstacle",
    "The possible course of action",
    "The current future if you do nothing",
    "The possible future"
  ];

  var _narrative = [
    "The heart of the issue or influence affecting the matter of inquiry",
    "The obstacle that stands in the way",
    "Either the goal or the best potential result in the current situation",
    "The foundation of the issue which has passed into reality",

    "The past or influence that is departing",

    "The future or influence that is approaching",
    "You, either as you are, could be or are presenting yourself to be",
    "Your house or environment",
    "Your hopes and fears",
    "The ultimate result or cumulation about the influences from the other cards in the divination"
  ];

  var narrative_descriptive = [
    "The influence that is affecting you or the matter of inquiry generally",
    "The nature of the obstacle in front of you",
    "The aim or ideal of the matter", // "The best that can be acheived under the circumstances ],
    "The foundation or basis of the subject that has already happened",
    "The influence that has just passed or has passed away",
    "The influence that is coming into action and will operatin in the near future",
    "The position or attitude you have in the circumstances",
    "The environment or situation that have an effect on the matter",
    "The hopes or fears of the matter",
    "The culmination which is brought about by the influence shown by the other cards"
  ];


  var descriptive_join= [
    "is about",
    "pertains to",
    "refers to",
    "is related to",
    "is regarding",
    "relates to"
  ];


  //var narrative = narrative_fatalistic;
  var narrative = narrative_descriptive;


  for (var ii=0; ii<n; ii++) { a_idx.push(ii); }

  for (var ii=0; ii<n_card; ii++) {
    var p = Math.floor( Math.random() * (n - ii) );
    var t = a_idx[ii];
    a_idx[ii] = a_idx[p];
    a_idx[p] = t;
  }

  var res = [];

  for (var ii=0; ii<n_card; ii++) {
    var p = a_idx[ii];

    var light_shadow = ["light", "shadow"][Math.floor(Math.random()*2)];

    var _n = d[p].fortune_telling.length;
    _n = 2;

    var idx = Math.floor(Math.random() * _n);

    var fortune = d[p].fortune_telling[idx];

    var __n = d[p].meanings[light_shadow].length;
    __n = 2;
    idx = Math.floor(Math.random() * __n);
    var meaning = d[p].meanings[light_shadow][idx];

    var _name = d[p].name.replace(/[wW]ands/, "Keys");

    //var phrase = ((light_shadow == "light") ? _crnd(light_phrases) : _crnd(shadow_phrases) );
    var phrase = _crnd(descriptive_join);
    //var sentence = _name + "(" + light_shadow + "): " + narrative[ii] + ", " + phrase + " ... " + meaning;
    var sentence = _name + "(" + light_shadow + "): " + narrative[ii] + ", " + phrase + " ... " + meaning;

    var html_sentence = "<b><u>[" + (ii+1).toString() + "] " + _capitalize(_name) + "</u></b> <small>(" + light_shadow + ")</small><br>";
    html_sentence += _capitalize(narrative[ii],1) + ", " + _capitalize(phrase,-1) + " " + _capitalize(meaning,-1);

    var val = {
      "index": p,
      "modifier":light_shadow,
      "name": d[p].name,
      "rank": d[p].rank,
      "suit": d[p].suit,
      "fortune_telling" : fortune,
      "keywords": d[p].keywords,
      "meaning" : meaning,
      "_sentence": sentence,
      "sentence": html_sentence
    };

    res.push(val);
  }

  return res;
}

function display_tarot() {
  for (var ii=0; ii<10; ii++)  {
    var id = "ui_canvas_card" + ii.toString();
    $("#" + id).fadeTo(400, 1.0);
  }

  $("#ui_loading").fadeOut();
  var _lbt = document.getElementById("ui_loading_placeholder");
  _lbt.style.display = "block";
}

// called after init is done loading the JSON tarot interpretations
//
function finit() {

  // wait til ldata is ready, otehrwise setup another callback in 1s
  //
  if (!g_tarot.ready) {
    console.log("sleepy");
    setTimeout(finit, 1000);
    return;
  }

  // hacky way to let the tarot cards load before turning on the reading
  //
  setTimeout( function() { document.getElementById("ui_button_reading").click() }, 1000 );

  var reading = tarot_reading_celtic_cross(g_tarot.data);
  g_tarot["reading"] = reading;


  // load each of the SVG tarot cards
  //
  for (var ii=0; ii<reading.length; ii++) {

    setTimeout( (function(_x,_y,_m) {
      return function() {
        init_pixi_layered_card(_x,_y);
        if (_m == "shadow") {
          setTimeout( function() {
            var _e = document.getElementById(_x);
            _e.style.transform = "rotate(180deg)";
            g_data.card_queue--;
            if (g_data.card_queue==0) {
              setTimeout(display_tarot, 500);
            }
          },0);
        }
        else {
          setTimeout( function() {
            g_data.card_queue--;
            if (g_data.card_queue==0) { setTimeout(display_tarot, 500); }
          },0);
        }
      }
    })("ui_canvas_card" + ii.toString(), g_data.tarot_sched[reading[ii].index], reading[ii].modifier), 0);

    var ui_id = "ui_card" + ii.toString();

    // We don't have a good 'wand' graphic, so we've replaced it with keys.
    // Update the reading to reflect the change
    //

    caption_update(ui_id, reading[ii].sentence, "caption_" + ii.toString(), g_ui.caption_dxy[ui_id]);
  }
}


// pixi_canvas_id - the text id of the canvas to use
// _img_bg        - required background image (will move)
// _img_fg        - required foreground image (will float)
// _img_suit      - optional suite data (static)
// _img_text      - optional text data (static)
//
function start_card_canvas(pixi_canvas_id, _img_bg, _img_fg, _img_suit, _img_text) {
  var bg_s = 1440;

  var w = 190, h = 317;
  const app = new PIXI.Application({ antialias: true, width: w, height: h, view: document.getElementById(pixi_canvas_id)  });

  var _scale = h/720.0;

  var rnd = [
    Math.random()*3/4 + 0.25,
    Math.random()/2 + 0.5,
    Math.random()/2 + 0.5 ];

  app.stage.interactive = true;

  var bg = PIXI.Sprite.from(_img_bg);

  bg.anchor.set(0.5);

  bg.x = app.screen.width / 2;
  bg.y = app.screen.height / 2;

  bg.x = w/2;
  bg.y = h/4;

  app.stage.addChild(bg);

  var container = new PIXI.Container();
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;

  if (typeof _img_suit !== "undefined") {
    var st = PIXI.Sprite.from(_img_suit);
    st.anchor.set(0.5);
    container.addChild(st);
  }

  var fg = PIXI.Sprite.from(_img_fg);
  fg.anchor.set(0.5);
  container.addChild(fg);

  if (typeof _img_text !== "undefined") {
    var txt = PIXI.Sprite.from(_img_text);
    txt.anchor.set(0.5);
    container.addChild(txt);
  }

  app.stage.addChild(container);

  g_data["app"] = app;
  g_data["bg"] = bg;
  g_data["fg"] = fg;
  g_data["st"] = st;

  let count = 0;
  app.ticker.add( (function(_freq0, _freq1, _freq2) {
    return function() {
      var f = _freq0, fx = _freq1, fy = _freq2;
      fg.y = Math.sin(f*count)*10;
      count += 0.025;
      bg.x = Math.sin(fx*count/2 + (Math.PI/21.0) )*20;
      bg.y = 100+Math.sin(fy*count/2 + (Math.PI/21.0) + (Math.PI/4.0) )*20;
    };
  })(rnd[0], rnd[1], rnd[2]));

}

async function render_svg_to_png(canvas_id, svg_str) {
  var canvas = document.getElementById(canvas_id);
  var gfx_ctx = canvas.getContext('2d');
  var v = await canvg.Canvg.fromString(gfx_ctx, svg_str);
  await v.render();
  var png = canvas.toDataURL();
  return png;
}

function realize_svg_card_back(tarot_data) {

  var bg_ctx = sibyl.bg_ctx;
  var background_sched = tarot_data.bg;

  //var bg_id = "back_card_ok12345_" + tarot_data.card_idx.toString();
  //sibyl.bg_ctx.svg_id = "__back_card_" + tarot_data.card_idx.toString();
  var bg_id = "_back_card_";
  sibyl.bg_ctx.svg_id = "__back_card_";
  sibyl.bg_ctx.create_background_rect = false;
  sibyl.bg_ctx.create_svg_header = false;
  sibyl.bg_ctx.scale = 0.2;
  sibyl.bg_ctx.global_scale = 0.5;

  var bg_cp = tarot_data.colors[2][0].hex;
  var bg_cs = tarot_data.colors[2][1].hex;

  var bg_svg_str_single = '<g id="' + bg_id + '">\n' + sibyl.mystic_symbolic_sched(bg_ctx, background_sched, bg_cp, bg_cs) + '\n</g>';

  var w = 500;
  var h = 500;

  var first_bg = true;

  var svg_extra_header = "";
  svg_extra_header += "<rect x=\"-" + w.toString() +
    "\" y=\"-" + h.toString() + "\" " +
    "width=\"" + (3*w).toString() +
    "\" height=\"" + (3*h).toString() +
    //"\" fill=\"" + _bg +
    "\" fill=\"" + bg_cp +
    "\" data-is-background=\"true\">\n</rect>\n" +
    "<g transform=\"translate( -200 -200 )\">"  ;

  var _n_x = 8;
  var _n_y = 11;
  var dx = 175*sibyl.bg_ctx.global_scale;
  var dy = 100*sibyl.bg_ctx.global_scale;
  var bg_svg_str = "";
  for (var x_idx=0; x_idx<_n_x; x_idx++) {
    for (var y_idx=0; y_idx<_n_y; y_idx++) {
      var _x = Math.floor( x_idx - (_n_x/2) )*dx ;
      var _y = Math.floor( y_idx - (_n_y/2) )*dy ;

      if ((y_idx%2)==1) { _x += dx/2; }

      bg_svg_str += "<g transform=\"";
      bg_svg_str += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
      bg_svg_str += "\">";

      if (first_bg) {
        bg_svg_str += bg_svg_str_single;
        first_bg = false;
      }
      else {
        bg_svg_str += '<use xlink:href="#' + bg_id + '"/>\n';
      }

      bg_svg_str  += "</g>";
    }
  }


  //var bg_hdr = '<svg version="1.1" id="bg_frame" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500px" height="500px">';
  var bg_hdr = '<svg version="1.1" id="bg_frame" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="190px" height="317px">';
  bg_hdr += svg_extra_header;
  bg_svg_str = bg_hdr + bg_svg_str + "</g>" + "</svg>";

  return bg_svg_str;

}

//function init_pixi_layered_card(canvas_id, tarot_data) {
function realize_svg_card(tarot_data) {
  var creature_sched = tarot_data.fg;
  var suite_sched = {};

  var full_svg = "";

  var has_suit = false;
  var has_numeral = false;
  var has_text = true;

  //ugh
  //
  sibyl.remap_fill_id( sibyl.mystic_symbolic );
  sibyl.remap_fill_id( sibyl.bg_symbol );


  var major_arcana = g_data.major_arcana;
  var _svg_header = '<svg version="1.1" id="Frame_0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720px" height="720px">';
  var name = "";
  if (tarot_data.family == "major") {
    name = tarot_data.designation;
  }
  else {
    name = tarot_data.designation.toUpperCase() + " of " + tarot_data.family.toUpperCase() + "S";
  }

  // 317/720*2
  //
  //var _scale = 0.88;
  var _scale = 1.0;
  var dxy = [0,0];

  var _r = _RESCALE;

  var _suite_scale = { "ace":_r*1.0, "page":_r*0.75, "knight":_r*0.75, "queen":_r*0.7, "king":_r*0.7 };
  var _suite_dxy = { "ace":[0,0],"page":[9,-22], "knight":[26,-5],"queen":[0,-31], "king":[0,-31] };

  if (tarot_data.family != "major") {

    if ((tarot_data.designation == "ace") ||
        (tarot_data.designation == "page") ||
        (tarot_data.designation == "knight") ||
        (tarot_data.designation == "queen") ||
        (tarot_data.designation == "king")) {

      // whoops, I rescaled the minor arcana page/knight/qeen/king/ace already
      //
      _scale = _suite_scale[tarot_data.designation];
      dxy = _suite_dxy[tarot_data.designation];
      has_text = true;
    }
    else {
      _scale = 0.88;
      has_text = false;

      var tok = creature_sched.base.split("_");
      has_suit = true;
      var n = parseInt(tok[2]);
      var suit = creature_sched.attach.nesting[0].base;

      suite_sched["base"] = creature_sched.base;
      suite_sched["attach"] = {"nesting":[]};

      for (var ii=0; ii<n; ii++) {
        suite_sched["attach"]["nesting"].push( { "base": suit } );
        creature_sched["attach"]["nesting"][ii]["base"] = "empty";
      }
      suite_sched["attach"]["nesting"].push( { "base": "empty" } );
    }
  }
  else {
    has_text = true;

    // fudge factor to help fit...
    //
    _scale = _r*major_arcana[tarot_data.family_idx].scale*0.88;
    if ("d" in major_arcana[tarot_data.family_idx]) {
      dxy = major_arcana[tarot_data.family_idx].d;
      dxy[0] *= _r;
      dxy[1] *= _r;
    }
  }

  var background_sched = tarot_data.bg;

  var seed = '123x';

  var fg_ctx = sibyl.fg_ctx;
  var bg_ctx = sibyl.bg_ctx;

  var _fg_info = sibyl.preprocess_svgjson( sibyl.mystic_symbolic, "#000", "#fff" );
  var _bg_info = sibyl.preprocess_svgjson( sibyl.mystic_symbolic, "#000", "#fff" );

  // we don't want to restrict the vocabulary after we've chosen the schedule
  //
  fg_ctx.choice = _fg_info.choice;
  fg_ctx.symbol = _fg_info.symbol;
  fg_ctx.data   = _fg_info.data;

  // we need to translate the creature in a containing <g> element,
  // so don't create the header so we can put it in later.
  //
  fg_ctx.create_svg_header = false;

  bg_ctx.choice = _bg_info.choice;
  bg_ctx.symbol = _bg_info.symbol;
  bg_ctx.data   = _bg_info.data;

  sibyl.fg_ctx.global_scale = _scale;

  sibyl.fg_ctx.create_background_rect = false;
  fg_ctx.svg_id = 'foo';
  fg_ctx.global_scale = _scale;

  fg_ctx.svg_id = rndstr();

  var fg_cp = tarot_data.colors[1][0].hex;
  var fg_cs = tarot_data.colors[1][1].hex;
  if (tarot_data.invert_color_creature) {
    fg_cp = tarot_data.colors[1][1].hex;
    fg_cs = tarot_data.colors[1][0].hex;
  }
  var creature_svg_str  = sibyl.mystic_symbolic_sched(fg_ctx, creature_sched, fg_cp, fg_cs);

  var svg_creature_only = 
    '<g transform=" translate(' + dxy[0].toString() + " " + dxy[1].toString() + ')">' +
    creature_svg_str +
    "</g>";

  creature_svg_str = _svg_header +
    '<g transform=" translate(' + dxy[0].toString() + " " + dxy[1].toString() + ')">' +
    creature_svg_str +
    "</g>" +
    "</svg>";

  //---

  // background tiled pattern
  //

  var suite_svg_str = "";
  var svg_suite_only = "";
  if (has_suit) {
    fg_ctx.create_svg_header = true;
    fg_ctx.svg_id = rndstr();
    suite_svg_str = sibyl.mystic_symbolic_sched(fg_ctx, suite_sched);

    fg_ctx.create_svg_header = false;
    svg_suite_only = sibyl.mystic_symbolic_sched(fg_ctx, suite_sched);
  }

  //var bg_id = "bg_ok1234";
  //sibyl.bg_ctx.svg_id = "__background_creature_" + seed;
  var bg_id = "_background_" + tarot_data.card_idx.toString();
  sibyl.bg_ctx.svg_id = "__back_card_" + tarot_data.card_idx.toString();

  sibyl.bg_ctx.create_background_rect = false;
  sibyl.bg_ctx.create_svg_header = false;
  sibyl.bg_ctx.scale = 0.2;
  sibyl.bg_ctx.global_scale = 0.5;

  bg_ctx.svg_id = rndstr();

  var bg_cp = tarot_data.colors[2][0].hex;
  var bg_cs = tarot_data.colors[2][1].hex;

  var bg_svg_str_single = '<g id="' + bg_id + '">\n' + sibyl.mystic_symbolic_sched(bg_ctx, background_sched, bg_cp, bg_cs) + '\n</g>';

  var svg_extra_header = "";

  var w = 500;
  var h = 500;

  var first_bg = true;
  svg_extra_header += "<rect x=\"-" + w.toString() +
    "\" y=\"-" + h.toString() + "\" " +
    "width=\"" + (3*w).toString() +
    "\" height=\"" + (3*h).toString() +
    //"\" fill=\"" + _bg +
    "\" fill=\"" + bg_cp +
    "\" data-is-background=\"true\">\n</rect>\n";

  var _n_x = 8;
  var _n_y = 11;
  var dx = 175*sibyl.bg_ctx.global_scale;
  var dy = 100*sibyl.bg_ctx.global_scale;
  var bg_svg_str;
  for (var x_idx=0; x_idx<_n_x; x_idx++) {
    for (var y_idx=0; y_idx<_n_y; y_idx++) {
      var _x = Math.floor( x_idx - (_n_x/2) )*dx ;
      var _y = Math.floor( y_idx - (_n_y/2) )*dy ;

      if ((y_idx%2)==1) { _x += dx/2; }

      bg_svg_str += "<g transform=\"";
      bg_svg_str += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
      bg_svg_str += "\">";

      if (first_bg) {
        bg_svg_str += bg_svg_str_single;
        first_bg = false;
      }
      else {
        bg_svg_str += '<use xlink:href="#' + bg_id + '"/>\n';
      }

      bg_svg_str  += "</g>";
    }
  }

  var svg_background_only = bg_svg_str;

  var bg_hdr = '<svg version="1.1" id="bg_frame" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500px" height="500px">';
  bg_hdr += svg_extra_header;
  bg_svg_str = bg_hdr + bg_svg_str + "</svg>";

  var text_svg_str = g_data.svg_text[name];
  var svg_text_only = g_data.svg_text_inner[name];

  var full_svg = 
    '<svg version="1.1" id="bg_frame" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="190px" height="317px">' +

    svg_extra_header + 
    "<g transform=\"translate(-250 -250)\">" +
    svg_background_only + 
    "</g>" +

    // eyeball'd until it looked correct....
    // better would be to work out scale factors and proper offets
    //
    "<g transform=\"translate(-264 -205)\">" +
    svg_suite_only +
    "</g>" +

    "<g transform=\"translate(-264 -205)\">" +
    svg_creature_only +
    "</g>" +

    "<g transform=\"translate(0 0)\">" + 
    svg_text_only +
    "</g>" +

    "</svg>";

  return { "fg": creature_svg_str, "bg": bg_svg_str, "suite": suite_svg_str, "text": text_svg_str, "svg_card": full_svg };
}

function init_pixi_layered_card(canvas_id, tarot_data) {

  var svg_data = realize_svg_card(tarot_data);
  var creature_svg_str = svg_data.fg;
  var bg_svg_str = svg_data.bg;
  var suite_svg_str = svg_data.suite;
  var text_svg_str = svg_data.text;

  var has_suit = false;
  var has_numeral = false;
  var has_text = true;

  if (tarot_data.family != "major") {

    if ((tarot_data.designation == "ace") ||
        (tarot_data.designation == "page") ||
        (tarot_data.designation == "knight") ||
        (tarot_data.designation == "queen") ||
        (tarot_data.designation == "king")) {

      has_text = true;
    }
    else {
      has_text = false;
      has_suit = true;
    }

  }

  g_data.png_card[canvas_id].n = 3 + (has_suit?1:0);

  var _cid_fg = canvas_id + "_fg";
  var _cid_su = canvas_id + "_suit";
  var _cid_bg = canvas_id + "_bg";
  var _cid_txt = canvas_id + "_text";
  var _cid = canvas_id;

  render_svg_to_png(_cid_fg, creature_svg_str).then( _png => {
    g_data.png_card[_cid].n--;
    g_data.png_card[_cid].fg = _png;
    if (g_data.png_card[_cid].n==0) { 
      start_card_canvas(_cid, g_data.png_card[_cid].bg, g_data.png_card[_cid].fg, g_data.png_card[_cid].suit, g_data.png_card[_cid].text);
    }
  } );

  if (has_suit) {
    render_svg_to_png(_cid_su, suite_svg_str).then( _png => {
      g_data.png_card[_cid].n--;
      g_data.png_card[_cid].suit = _png;
      if (g_data.png_card[_cid].n==0) { 
        start_card_canvas(_cid, g_data.png_card[_cid].bg, g_data.png_card[_cid].fg, g_data.png_card[_cid].suit, g_data.png_card[_cid].text);
      }
    } );
  }

  render_svg_to_png(_cid_bg, bg_svg_str).then( _png => {
    g_data.png_card[_cid].n--;
    g_data.png_card[_cid].bg = _png;
    if (g_data.png_card[_cid].n==0) { 
      start_card_canvas(_cid, g_data.png_card[_cid].bg, g_data.png_card[_cid].fg, g_data.png_card[_cid].suit, g_data.png_card[_cid].text);
    }
  } );

  //var text_svg_str = g_data.svg_text[name];
  render_svg_to_png(_cid_txt, text_svg_str).then( _png => {
    g_data.png_card[_cid].n--;
    g_data.png_card[_cid].text = _png;
    if (g_data.png_card[_cid].n==0) { 
      start_card_canvas(_cid, g_data.png_card[_cid].bg, g_data.png_card[_cid].fg, g_data.png_card[_cid].suit, g_data.png_card[_cid].text);
    }
  } );

}

function realize_tarot_sched(_seed, ctx) {
  var tarot_sched = [];

  var card_num = 0;

  sibyl.reseed(_seed);

  var minor_arcana_suit = ctx.minor_arcana_suit;
  var minor_arcana = ctx.minor_arcana;
  var major_arcana = ctx.major_arcana;
  var exclude_all = ctx.exclude_all;
  var exclude_all_and_wing = ctx.exclude_all_and_wing;
  var ace_choice = ctx.ace_choice;

  var tarot_card_json = sibyl.tarot_template;
  var minor_arcana_template = {};
  for (var ii=0; ii<tarot_card_json.length; ii++) {
    var name = tarot_card_json[ii].name;
    var tok = name.split("_");

    if (!(tok[2] in minor_arcana_template)) {
      minor_arcana_template[tok[2]] = [];
    }

    minor_arcana_template[tok[2]].push( tarot_card_json[ii] );
  }


  var c0 = sibyl.rand_color_n(2);
  var c1 = sibyl.rand_color_n(2);
  var c2 = sibyl.rand_color_n(2);
  var c3 = sibyl.rand_color_n(2);

  var cf = sibyl.rand_color_n(8);
  var _cx = [];
  for (var ii=0; ii<4; ii++) {
    var r = sibyl.rand_color();
    _cx.push( [ { "hex": r.background.hex, "hsv": r.background.hsv }, {"hex":r.background2.hex, "hsv":r.background2.hsv} ] );
  }

  var colors = {
    "pentacle": [ cf[0], cf[4], _cx[0] ],
    "key":      [ cf[1], cf[5], _cx[1] ],
    "sword":    [ cf[2], cf[6], _cx[2] ],
    "cup":      [ cf[3], cf[7], _cx[3] ]
  };


  // fir create schedules for major arcana
  //
  for (var ma_idx=0; ma_idx < ctx.major_arcana.length; ma_idx++) {

    var tarot_data = {
      "fg": {},
      "bg": {},
      "colors":{},
      "family":"major",
      "designation":major_arcana[ma_idx].name,
      "family_idx":ma_idx,
      "card_idx":card_num
    };

    var _c0 = sibyl.rand_color_n(2);
    var _c1 = sibyl.rand_color_n(2);

    var cf = sibyl.rand_color_n(8);
    var _cx = [];
    for (var ii=0; ii<4; ii++) {
      var r = sibyl.rand_color();
      _cx.push( [ { "hex": r.background.hex, "hsv":r.background.hsv }, {"hex":r.background2.hex, "hsv":r.background2.hsv } ] );
    }

    var ma_colors = [ cf[0], cf[4], _cx[0] ];
    tarot_data["colors"] = ma_colors;

    var _orig = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, {});

    var _t = sibyl.preprocess_svgjson(sibyl.bg_symbol, undefined, undefined, false, exclude_all);
    sibyl.bg_ctx.choice = _t.choice;
    sibyl.bg_ctx.symbol = _t.symbol;
    sibyl.bg_ctx.data = _t.data;

    sibyl.bg_ctx.max_depth = 0;
    sibyl.bg_ctx.max_nest_depth = 1;
    sibyl.bg_ctx.complexity = 1;
    sibyl.mystic_symbolic_random( sibyl.bg_ctx );
    var bg0 = sibyl.bg_ctx.realized_child.base;
    var bg1 = "";
    if ("attach" in sibyl.bg_ctx.realized_child) {
      bg1 = sibyl.bg_ctx.realized_child.attach.nesting[0].base;
    }

    tarot_data.bg["base"] = bg0 + ma_colors[2][0].hex + ma_colors[2][1].hex ;
    if (bg1.length > 0) {
      tarot_data.bg["attach"] = { "nesting": [ { "base" : bg1 + ma_colors[2][1].hex + ma_colors[2][0].hex } ] };
    }

    var base_creature = _orig.symbol[ major_arcana[ma_idx].symbol ];
    var _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);

    sibyl.fg_ctx.choice = _t.choice;
    sibyl.fg_ctx.symbol = _t.symbol;
    sibyl.fg_ctx.data = _t.data;
    sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_creature );

    var json_card = sibyl.fg_ctx.realized_child;

    // lovers is a card built up of other base objects,
    // so we need to do some special processing.
    //
    if (major_arcana[ma_idx].symbol == "lovers_nestbox") {
      var _c = ma_colors[1][0].hex + ma_colors[1][1].hex;
      var x = json_card.attach.nesting[0];
      json_card.attach.nesting = [
        { "base": "woman_stand" + _c },
        { "base": "man_stand" + _c },
        { "base": x.base + _c  }
      ];
    }

    // justice needs it's own procesing because we don't
    // want the item on the other side of the scale
    // to be repeated.
    //
    else if (major_arcana[ma_idx].symbol == "scales") {
      sibyl.mystic_symbolic_random( sibyl.bg_ctx );
      json_card.attach["nesting"].push( sibyl.bg_ctx.realized_child );
    }

    tarot_data.fg = json_card;
    tarot_data["num"] = card_num;

    tarot_sched.push( tarot_data );
    card_num++;
  }

  for (var suit_idx=0; suit_idx < minor_arcana_suit.length; suit_idx++) {
    for (var card_idx=0; card_idx < minor_arcana.length; card_idx++) {

      var suit = ctx.minor_arcana_suit[suit_idx];
      var tarot_data = {
        "fg": {},
        "bg": {},
        "colors":colors[suit],
        "family": suit,
        "designation": minor_arcana[card_idx],
        "family_idx":card_idx,
        "card_idx":card_num
      };

      var _seed = rseed();

      var color_suit = colors[suit][0][0].hex + colors[suit][0][1].hex;
      var suit_ent = minor_arcana_suit[suit_idx]  + colors[suit][0][0].hex + colors[suit][0][1].hex;
      var suit_ent_r = minor_arcana_suit[suit_idx]  + colors[suit][0][1].hex + colors[suit][0][0].hex;


      // generate background creature
      //
      var _t = sibyl.preprocess_svgjson(sibyl.bg_symbol, undefined, undefined, false, exclude_all);
      sibyl.bg_ctx.choice = _t.choice;
      sibyl.bg_ctx.symbol = _t.symbol;
      sibyl.bg_ctx.data = _t.data;

      sibyl.bg_ctx.max_depth = 0;
      sibyl.bg_ctx.max_nest_depth = 1;
      sibyl.bg_ctx.complexity = 1;
      sibyl.mystic_symbolic_random( sibyl.bg_ctx );
      var bg0 = sibyl.bg_ctx.realized_child.base;
      var bg1 = "";
      if ("attach" in sibyl.bg_ctx.realized_child) {
        bg1 = sibyl.bg_ctx.realized_child.attach.nesting[0].base;
      }

      tarot_data.bg["base"] = bg0 + colors[suit][2][0].hex + colors[suit][2][1].hex ;
      if (bg1.length > 0) {
        tarot_data.bg["attach"] = { "nesting": [ { "base" : bg1 + colors[suit][2][1].hex + colors[suit][2][0].hex } ] };
      }


      var json_card = {
        "base": "goat",
        "attach" : { "nesting" : [ ] }
      };

      var invert_color_creature = false;
      tarot_data["invert_color_creature"] = false;

      // number cards that aren't ace or page to king
      //
      if ((card_idx > 0) && (card_idx < 10)) {

        // exclude single wing from base creature
        //
        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all_and_wing);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;
        var base_creature_name = sibyl.random_creature( sibyl.fg_ctx, "base" );
        var base_creature = sibyl.fg_ctx.symbol[base_creature_name];

        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;
        //sibyl.mystic_symbolic_random( sibyl.fg_ctx );
        sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_creature );

        var card_template = sibyl.crnd(minor_arcana_template[card_idx+1]);
        json_card = {
          "base": card_template.name,
          "attach" : { "nesting" : [ ] }
        };

        for (var ii=0; ii<=card_idx; ii++) {
          json_card.attach.nesting.push( { "base" : suit_ent } );
        }
        json_card.attach.nesting.push( sibyl.fg_ctx.realized_child );

        invert_color_creature = true;
        tarot_data["invert_color_creature"] = true;


      }

      // ace
      //
      else if (card_idx==0) {

        var ace_base = sibyl.crnd(ace_choice);
        json_card = {
          "base": ace_base ,
          //"attach" : { "nesting" : [ { "base": suit_ent + color_suit }  ] }
          "attach" : { "nesting" : [ { "base": suit_ent }  ] }
        };

      }

      // page
      //
      else if (card_idx==10) {

        var xc = colors[suit][1][1].hex + colors[suit][1][0].hex;

        var base_ele = sibyl.fg_ctx.symbol[ "dog" ];
        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;
        sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_ele );

        json_card = sibyl.fg_ctx.realized_child;
        json_card.attach["crown"] = [ {"base": suit_ent } ];
      }

      // knight
      //
      else if (card_idx==11) {

        var base_ele = sibyl.fg_ctx.symbol[ "horse" ];
        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;
        sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_ele );

        json_card = sibyl.fg_ctx.realized_child;
        json_card.attach["crown"] = [ {"base": suit_ent + color_suit } ];
      }

      // queen
      //
      else if (card_idx==12) {

        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;

        var base_ele = sibyl.fg_ctx.symbol[ "crown_5pt" ];
        sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_ele );

        json_card = sibyl.fg_ctx.realized_child;

        json_card.attach["tail"] = [ {"base": suit + color_suit } ];
      }

      // king
      //
      else if (card_idx==13) {

        _t = sibyl.preprocess_svgjson(sibyl.mystic_symbolic, undefined, undefined, false, exclude_all);
        sibyl.fg_ctx.choice = _t.choice;
        sibyl.fg_ctx.symbol = _t.symbol;
        sibyl.fg_ctx.data = _t.data;

        var base_ele = sibyl.fg_ctx.symbol[ "crown_ornate" ];
        sibyl.mystic_symbolic_random( sibyl.fg_ctx, base_ele );

        json_card = sibyl.fg_ctx.realized_child;
        json_card.attach["tail"] = [ {"base": suit + color_suit } ];
      }
      tarot_data.fg = json_card;

      tarot_sched.push(tarot_data);

      card_num++;
    }
  }


  var back_card_color = sibyl.rand_color();
  var bca = [
    [ { "hex": "#000" }, { "hex":"#fff" } ],
    [ { "hex": "#000" }, { "hex":"#fff" } ],
    [ { "hex": back_card_color.background.hex, "hsv": back_card_color.background.hsv },
      { "hex": back_card_color.background2.hex,  "hsv": back_card_color.background2.hsv } ]
  ];
  var back_symbol_name = sibyl.crnd(ctx.back_creature_choice);


  // last entry is the back of the cards
  //
  tarot_sched.push( {
    //"bg" : { "base" : back_symbol_name + bca[0].hex + bca[1].hex },
    "bg" : { "base" : back_symbol_name + back_card_color.background.hex + back_card_color.background2.hex },
    "fg" : { "base" : "empty" },
    "colors" : bca,
    "card_idx": 78
  });
  

  return tarot_sched;

}

function populate_deck_image_single(idx) {


  console.log(">>", idx);

  console.log("cp0:", Date.now());

  var svg_data = realize_svg_card(g_data.tarot_sched[idx]);

  document.getElementById("ui_deck" + idx.toString()).innerHTML = svg_data.svg_card;
  return;

  console.log("cp1:", Date.now());

  var c = document.createElement("canvas");
  c.width = 190;
  c.height = 317;
  var gfx_ctx = c.getContext('2d');
  //gfx_ctx.drawImage( svg_img, 0, 0 );


  var svg = new Blob([svg_data.svg_card], {type: "image/svg+xml;charset=utf-8"});
  var url = URL.createObjectURL(svg);

  var img = new Image();
  img.onload = function() {
    gfx_ctx.drawImage(img, 0, 0);
    var png = canvas.toDataURL("image/png");
    document.getElementById("ui_deck" + idx.toString()).innerHTML = '<img src="' + png + '"/>';
    URL.revokeOBjectURL(png);
  };

  return;
  //---

  var svg_img = new Image();
  svg_img.src = 'data:image/svg+xml;base64,' + window.btoa(svg_data.svg_card);

  console.log(svg_img);

  //----
  var _img = document.getElementById("ui_img_deck" + idx.toString());
  _img.src = svg_img;
  //----
  return;


  console.log("cp2:", Date.now());

  var png_img = c.toDataURL('image/png');
  var _img = document.getElementById("ui_img_deck" + idx.toString());
  _img.src = png_img;

  console.log("cp3:", Date.now());

  console.log(svg_img, png_img, _img);

  return;

  render_svg_to_png("ui_canvas_deck" + idx.toString(), svg_data.svg_card).then(
    (function(_ui_id) {
      return function(_png) {
        var _img = document.getElementById(_ui_id);
        //var _img = document.createElement("img");
        _img.src = _png;
        //ele.appendChild(_img);
      };
    })("ui_img_deck" + idx.toString())
  );

}

function populate_deck_image() {

  var card_back_svg = realize_svg_card_back(g_data.tarot_sched[78]);

  render_svg_to_png("ui_canvas_deck78", card_back_svg).then(
    _png => {

      // populate all other cards initially with card backing
      // including the back card spot.
      //
      //for (var ii=0; ii<=78; ii++) {
      for (var ii=0; ii<78; ii++) {
        var ui_id = "ui_deck" + ii.toString();
        var ele = document.getElementById(ui_id);
        var _img = document.createElement("img");
        _img.src = _png;
        _img.id = "ui_img_deck" + ii.toString();
        ele.appendChild(_img);
      }

      var _tmp = realize_svg_card_back(g_data.tarot_sched[78]);
      document.getElementById("ui_deck78").innerHTML = _tmp;

    }
  );

  g_data.deck_queue_count = 78;

  //for (var ii=0; ii<78; ii++) {
  for (var ii=0; ii<78; ii++) {

    //if (ii==0) { console.log(">>", svg_data.svg_card); }

    setTimeout( (function(_x) {
      return function() {
        populate_deck_image_single(_x);
        g_data.deck_queue_count--;
        if (g_data.deck_queue_count==0) {
          g_data.deck_ready = true;
        }
      };
    })(ii), 5000 + 10*ii);

  }

}

// call on initial page load
//
function init() {

  var qd_ele = document.getElementById("ui_display_question");
  if (g_data.is_seed_random) {
    qd_ele.innerHTML = "<p>Deck was created with random seed: <b>" + g_data.seed + "</b></p>";
  }
  else {
    qd_ele.innerHTML = "<p>The question you asked:<br><b>" + g_data.seed + "</b></p>";
  }

  //---

  init_svg_text();
  _load("data/tarot_interpretations.json", _tarot_json_cb);

  console.log("s>>", Date.now());
  g_data["tarot_sched"] = realize_tarot_sched(g_data.seed, g_data);
  console.log("e>>", Date.now());

  populate_deck_image();

  setTimeout(finit, 1000);
}

function _bbox(ele) {
  let bbox = ele.getBoundingClientRect();
  return [ [ bbox.left + window.pageXOffset, bbox.bottom + window.pageYOffset ],
           [ bbox.right + window.pageXOffset, bbox.top + window.pageYOffset ] ];
}

// update the caption (reading).
// ui_id is the card id and cap_name is the caption element id.
//
// dxy can be given to do other positioning.
//
function caption_update(ui_id, txt, cap_name, dxy) {
  dxy = ((typeof dxy === "undefined") ? [-220, 120] : dxy);
  //var _m = (g_ui.mobile_view?"_m":"");

  var caption = document.getElementById(cap_name)

  var captxt = document.getElementById(cap_name + "_text");
  captxt.innerHTML = txt;

  var ele = document.getElementById(ui_id);
  var domrect = ele.getBoundingClientRect();

  var b = _bbox(ele);

  caption.style.position = "absolute";
  if (g_ui.mobile_view) {
    caption.style.left = (b[1][0] + 10).toString() + "px";
    caption.style.top = (b[1][1] + 10).toString() + "px";
  }
  else {
    caption.style.left = (b[0][0] + dxy[0]).toString() + "px";
    caption.style.top = (b[1][1] + dxy[1]).toString() + "px";

    var _l = (b[0][0] + dxy[0]).toString() + "px";
    var _t = (b[1][1] + dxy[1]).toString() + "px";
  }

}

function init_svg_text() {

  var svg_header = '<svg version="1.1"' +
    ' id="Frame_0" xmlns="http://www.w3.org/2000/svg"' +
    ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
    ' width="190px"' +
    ' height="317px">'

  var txt_ele_numeral = '<text x="0" y="0" id="_text_numeral">' +
    '<tspan' +
    '  id="_tspan_numeral"' +
    //'  x="216"' +
    '  x="95"' +
    //'  y="64"' +
    '  y="28"' +
    ' text-anchor="middle"' +
    '  style="fill:rgb(50,50,50);font-style:normal;font-variant:normal;font-weight:bold;' +
      //'font-stretch:normal;font-size:33px;font-family:\'Caviar Dreams\';' +
      'font-stretch:normal;font-size:15px;font-family:\'Caviar Dreams\';' +
      '-inkscape-font-specification:\'Caviar Dreams, Bold\';' +
      'font-variant-ligatures:normal;font-variant-caps:' +
      'normal;font-variant-numeric:normal;font-feature-settings:' +
      'normal;text-align:center;writing-mode:lr-tb;' +
      'text-anchor:middle;stroke-width:0.26458332px">' +
    '<!--::TEXT::-->' +
    '</tspan>' +
    '</text> ';

  var txt_ele_name =
    //'<rect rx="23" x="41" y="608" width="351" height="46" fill="#efefef" > ' +
    //'<rect rx="10" x="18" y="267" width="154" height="20" fill="#efefef" > ' +
    '<rect rx="10" x="12" y="267" width="166" height="20" fill="#efefef" > ' +
    '</rect>' +
    '<text x="0" y="0" id="_text_name">' +
    '<tspan' +
    '  id="_tspan_name"' +
    ' text-anchor="middle"' +
    //'  x="216"' +
    '  x="95"' +
    //'  y="644"' +
    '  y="283"' +
    '  style="fill:rgb(50,50,50);font-style:normal;font-variant:normal;' +
      //'font-weight:bold;font-stretch:normal;font-size:33px;' +
      'font-weight:bold;font-stretch:normal;font-size:15px;' +
      'font-family:\'Caviar Dreams\';-inkscape-font-specification:\'Caviar Dreams, Bold\';'+
      'font-variant-ligatures:normal;font-variant-caps:normal;' +
      'font-variant-numeric:normal;font-feature-settings:normal;' +
      'text-align:center;writing-mode:lr-tb;text-anchor:middle;' +
      'stroke-width:0.26458332px">' +
    '<!--::TEXT::-->' +
    '</tspan>' +
    '</text> ';



  for (var suit_idx=0; suit_idx < g_data.minor_arcana_suit.length; suit_idx++) {
    for (var num_idx=0; num_idx < g_data.minor_arcana.length; num_idx++) {

      var name = g_data.minor_arcana[num_idx].toUpperCase() + " of " + g_data.minor_arcana_suit[suit_idx].toUpperCase() + "S";

      g_data.svg_text[name] = svg_header;
      g_data.svg_text_inner[name] = "";

      if ((num_idx>0) && (num_idx<10)) {
        g_data.svg_text[name] += txt_ele_numeral.replace('<!--::TEXT::-->', g_data.numeral[num_idx+1]);
        g_data.svg_text_inner[name] += txt_ele_numeral.replace('<!--::TEXT::-->', g_data.numeral[num_idx+1]);
      }

      if ((num_idx<1) || (num_idx>=10)) {
        g_data.svg_text[name] += txt_ele_name.replace('<!--::TEXT::-->', name );
        g_data.svg_text_inner[name] += txt_ele_name.replace('<!--::TEXT::-->', name );
      }

      g_data.svg_text[name] += "</svg>";

    }
  }


  for (var ma_idx=0; ma_idx<g_data.major_arcana.length; ma_idx++) {
    var name = g_data.major_arcana[ma_idx].name;

    g_data.svg_text[name] = svg_header;
    g_data.svg_text[name] += txt_ele_numeral.replace('<!--::TEXT::-->', g_data.numeral[ma_idx]);
    g_data.svg_text[name] += txt_ele_name.replace('<!--::TEXT::-->', name);
    g_data.svg_text[name] += "</svg>";

    g_data.svg_text_inner[name] = txt_ele_numeral.replace('<!--::TEXT::-->', g_data.numeral[ma_idx]);
    g_data.svg_text_inner[name] += txt_ele_name.replace('<!--::TEXT::-->', name);
  }

}


$(document).ready(function() {

  // Initially hide the 10 divination cards so we don't
  // get a jerky update as the canvases start to render
  //
  for (var ii=0; ii<10; ii++)  {
    var id = "ui_canvas_card" + ii.toString();
    var ele = document.getElementById(id);
    ele.style.display = "none";
  }


  // card1 is under card0 so when card0 is hovered over,
  // make card1 semi translucent to see the full card0
  //
  // All other cards have mouse enter/leave events
  // captured to popup the reading or ignore it
  // if the reading button has been toggled.
  //
  $("#ui_card0").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card0", g_tarot.reading[0].sentence, "caption_0" + _m, [200,-150]);
    caption_update("ui_card0", g_tarot.reading[0].sentence, "caption_0" + _m, g_ui.caption_dxy["ui_card0"]);
    $("#caption_0" + _m).fadeIn();
    $("#ui_card1" + _m).fadeTo(400, 0.15);
  });

  $("#ui_card0").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_0" + _m).fadeOut();
    }
    $("#ui_card1" + _m).fadeTo(400, 1.0);
  });

  //--

  $("#ui_card1").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card1", g_tarot.reading[1].sentence, "caption_1" + _m, [-180,250]);
    caption_update("ui_card1", g_tarot.reading[1].sentence, "caption_1" + _m, g_ui.caption_dxy["ui_card1"]);
    $("#caption_1" + _m).fadeIn();

  });

  $("#ui_card1").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_1" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card2").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card2", g_tarot.reading[2].sentence, "caption_2" + _m, [0,-180]);
    caption_update("ui_card2", g_tarot.reading[2].sentence, "caption_2" + _m, g_ui.caption_dxy["ui_card2"]);
    $("#caption_2" + _m).fadeIn();
  });

  $("#ui_card2").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_2" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card3").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card3", g_tarot.reading[3].sentence, "caption_3" + _m, [0,330]);
    caption_update("ui_card3", g_tarot.reading[3].sentence, "caption_3" + _m, g_ui.caption_dxy["ui_card3"]);
    $("#caption_3" + _m).fadeIn();
  });

  $("#ui_card3").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_3" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card4").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card4", g_tarot.reading[4].sentence, "caption_4" + _m, [0,-180]);
    caption_update("ui_card4", g_tarot.reading[4].sentence, "caption_4" + _m, g_ui.caption_dxy["ui_card4"]);
    $("#caption_4" + _m).fadeIn();
  });

  $("#ui_card4").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_4" + _m).fadeOut();
    }
  });

  //--


  $("#ui_card5").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card5", g_tarot.reading[5].sentence, "caption_5" + _m, [0,330]);
    caption_update("ui_card5", g_tarot.reading[5].sentence, "caption_5" + _m, g_ui.caption_dxy["ui_card5"]);
    $("#caption_5" + _m).fadeIn();
  });

  $("#ui_card5").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_5" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card6").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card6", g_tarot.reading[6].sentence, "caption_6" + _m);
    caption_update("ui_card6", g_tarot.reading[6].sentence, "caption_6" + _m, g_ui.caption_dxy["ui_card6"]);
    $("#caption_6" + _m).fadeIn();
  });

  $("#ui_card6").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_6" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card7").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card7", g_tarot.reading[7].sentence, "caption_7" + _m, [-220, 300]);
    caption_update("ui_card7", g_tarot.reading[7].sentence, "caption_7" + _m, g_ui.caption_dxy["ui_card7"]);
    $("#caption_7" + _m).fadeIn();
  });

  $("#ui_card7").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_7" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card8").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card8", g_tarot.reading[8].sentence, "caption_8" + _m, [-220,-120]);
    caption_update("ui_card8", g_tarot.reading[8].sentence, "caption_8" + _m, g_ui.caption_dxy["ui_card8"]);
    $("#caption_8" + _m).fadeIn();
  });

  $("#ui_card8").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_8" + _m).fadeOut();
    }
  });

  //--

  $("#ui_card9").mouseenter( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    //caption_update("ui_card9", g_tarot.reading[9].sentence, "caption_9" + _m, [-220,-20]);
    caption_update("ui_card9", g_tarot.reading[9].sentence, "caption_9" + _m, g_ui.caption_dxy["ui_card9"]);
    $("#caption_9" + _m).fadeIn();
  });

  $("#ui_card9").mouseleave( function(e) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      $("#caption_9" + _m).fadeOut();
    }
  });

  //---

  // initially update captions with default data
  //
  for (var ii=0; ii<10; ii++) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    var ui_id = "ui_card" + ii.toString();
    var cap_id = "caption_" + ii.toString() + _m;
    caption_update(ui_id, g_tarot.reading[ii].sentence, cap_id, g_ui.caption_dxy[ui_id]);
  }

  //--

  $("#ui_button_reading").mouseenter( function(e) {
    var ele = document.getElementById("ui_button_reading");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      ele.style.color = "#333";
    }
    else {
      ele.style.color = "#fff";
    }
  });

  $("#ui_button_reading").mouseleave( function(e) {
    var ele = document.getElementById("ui_button_reading");
    if (g_ui.button_state.ui_button_reading.state == "off") {
      ele.style.color = "#777";
    }
    else {
      ele.style.color = "#fff";
    }
  });


  // toggle whether all readings are shown at once or
  // only on hover
  //
  $("#ui_button_reading").click( function(e) {


    // disable if all cards are being viewed
    //
    if (g_ui.button_state.ui_button_deck.state == "on") {
      var _ele_read = document.getElementById("ui_tarot_reading");
      var _ele_deck = document.getElementById("ui_tarot_deck");

      _ele_read.style.display = "grid";
      _ele_deck.style.display = "none";


      var btn_deck = document.getElementById("ui_button_deck");
      g_ui.button_state.ui_button_deck.state = "off";
      btn_deck.style.backgroundColor = "transparent";
      btn_deck.style.color = "#777";

      g_ui.button_state.ui_button_reading.state = "on";
      var ele = document.getElementById("ui_button_reading");
      ele.style.backgroundColor = "#777";
      ele.style.color = "#fff";

      var _m = (g_ui.mobile_view ? "_m" : "");
      for (var ii=0; ii<10; ii++) {
        var ui_id = "ui_card" + ii.toString();
        var cap_id = "caption_" + ii.toString() + _m;
        caption_update(ui_id, g_tarot.reading[ii].sentence, cap_id, g_ui.caption_dxy[ui_id]);
        $("#caption_" + ii.toString() + _m).fadeIn();
      }

      return;
    }

    if (g_ui.button_state.ui_button_reading.state == "off") {
      g_ui.button_state.ui_button_reading.state = "on";
      var ele = document.getElementById("ui_button_reading");
      ele.style.backgroundColor = "#777";
      ele.style.color = "#fff";

      var _m = (g_ui.mobile_view ? "_m" : "");
      for (var ii=0; ii<10; ii++) {
        var ui_id = "ui_card" + ii.toString();
        var cap_id = "caption_" + ii.toString() + _m;
        caption_update(ui_id, g_tarot.reading[ii].sentence, cap_id, g_ui.caption_dxy[ui_id]);
        $("#caption_" + ii.toString() + _m).fadeIn();
      }

    }
    else {
      g_ui.button_state.ui_button_reading.state = "off";
      var ele = document.getElementById("ui_button_reading");
      ele.style.backgroundColor = "transparent";
      ele.style.color = "#333";

      var _m = (g_ui.mobile_view ? "_m" : "");
      for (var ii=0; ii<10; ii++) {
        $("#caption_" + ii.toString() + _m).fadeOut();
      }

    }

  });

  //---

  // doing the highlight and focus is easier then 
  // figuring out how to do it incss.
  // Enable the appropriate button state in the g_ui
  // state object.
  //
  $("#ui_button_deck").mouseenter( function(e) {
    var ele = document.getElementById("ui_button_deck");
    if (g_ui.button_state.ui_button_deck.state == "off") {
      ele.style.color = "#333";
    }
    else {
      ele.style.color = "#fff";
    }
  });

  $("#ui_button_deck").mouseleave( function(e) {
    var ele = document.getElementById("ui_button_deck");
    if (g_ui.button_state.ui_button_deck.state == "off") {
      ele.style.color = "#777";
    }
    else {
      ele.style.color = "#fff";
    }
  });

  // toggle between the deck view pane or the reading
  // pane
  //
  $("#ui_button_deck").click( function(e) {

    var _ele_read = document.getElementById("ui_tarot_reading");
    var _ele_deck = document.getElementById("ui_tarot_deck");

    if (g_ui.button_state.ui_button_deck.state == "off") {
      g_ui.button_state.ui_button_deck.state = "on";
      var ele = document.getElementById("ui_button_deck");
      ele.style.backgroundColor = "#777";
      ele.style.color = "#fff";

      _ele_read.style.display = "none";
      _ele_deck.style.display = "block";

      // disable reading...
      //
      g_ui.button_state.ui_button_reading.state = "off";
      var ele = document.getElementById("ui_button_reading");
      ele.style.backgroundColor = "transparent";
      //ele.style.color = "#333";
      ele.style.color = "#777";

      for (var ii=0; ii<10; ii++) {
        $("#caption_" + ii.toString()).fadeOut();
        $("#caption_" + ii.toString() + "_m").fadeOut();
      }

    }
    else {
      g_ui.button_state.ui_button_deck.state = "off";
      var ele = document.getElementById("ui_button_deck");
      ele.style.backgroundColor = "transparent";
      ele.style.color = "#777";

      _ele_read.style.display = "grid";
      _ele_deck.style.display = "none";

    }

    console.log("deck");
  });

  //---

  /*
  $("#ui_modal").click( function(e) {
    if (g_ui.modal_state == "off") {
      g_ui.modal_state = "on";
      $("#ui_modal").fadeIn();
      $("#ui_content").fadeTo("slow", 0.5);
    }
    else {
      g_ui.modal_state = "off";
      $("#ui_modal").fadeOut();
      $("#ui_content").fadeTo("slow", 1);
    }
  });
  */

  $("#ui_modal_generate").click( function(e) {
    g_ui.modal_state = "off";
    $("#ui_modal").fadeOut();
    $("#ui_content").fadeTo("slow", 1);

    var ele = document.getElementById("ui_modal_text");
    seed_text = ele.value;

    g_data.is_seed_random = false;
    if (seed_text.length === 0) {
      console.log("using random");
      seed_text = rndstr();

      g_data.is_seed_random = true;
    }

    console.log("seed:", seed_text);
    g_data.seed = seed_text;

    // `init` will bog down the browser, so
    // we want the modal to disappear as
    // quickly as possible.
    //
    setTimeout(init, 1000);

    $("#ui_loading").fadeIn();
    var _lbt = document.getElementById("ui_loading_placeholder");
    _lbt.style.display = "none";

  });

  $("#ui_modal_test").click( function(e) {
    g_ui.modal_state = "on";
    $("#ui_modal").fadeIn();
    $("#ui_content").fadeTo("slow", 0.5);
  });

  $("#ui_about").click( function(e) {
    if (g_ui.modal_info_state == "off") {
      g_ui.modal_info_state = "on";
      $("#ui_modal_info").fadeIn();
    }
    else {
      g_ui.modal_info_state = "off";
      $("#ui_modal_info").fadeOut();
    }
  });

  $("#ui_modal_info").click( function(e) {
    g_ui.modal_info_state = "off";
    $("#ui_modal_info").fadeOut();
  });


  // wip
  //
  $("#ui_button_download").click( function(e) {
    console.log("dl");
    if (g_data.deck_ready) {
      if (g_data.deck_download_in_progress) {
        console.log("deck download queued...");
        $("#ui_button_download_queued_message").fadeIn();
        setTimeout( function() { $("#ui_button_download_queued_message").fadeOut() }, 5000 );
      }
      else {
        g_data.deck_download_in_progress = true;
        $("#ui_download_loading").fadeIn();
        downloadDeck();
      }
    }
    else {
      console.log("deck not ready...");
      $("#ui_button_download_message").fadeIn();
      setTimeout( function() { $("#ui_button_download_message").fadeOut() }, 5000 );
    }
  });

  $("#ui_content").click(function(e) {
    if (g_ui.modal_state == "on") {
      g_ui.modal_state = "off";
      $("#ui_modal").fadeOut();
      $("#ui_content").fadeTo("slow", 1);

      var ele = document.getElementById("ui_modal_text");
      seed_text = ele.value;

      g_data.is_seed_random = false;
      if (seed_text.length === 0) {
        seed_text = rndstr();
        g_data.is_seed_random = true;
      }
      g_data.seed = seed_text;

      //DEBUG
      //init();
      setTimeout(init, 1000);

      $("#ui_loading").fadeIn();
      var _lbt = document.getElementById("ui_loading_placeholder");
      _lbt.style.display = "none";
    }
  });

  //--


  $(document).keyup(function(e) {
    if (e.key === "Escape") {
      if (g_ui.modal_state == "on") {
        g_ui.modal_state = "off";
        $("#ui_modal").fadeOut();
        $("#ui_content").fadeTo("slow", 1);

        var ele = document.getElementById("ui_modal_text");
        seed_text = ele.value;

        g_data.is_seed_random = false;
        if (seed_text.length === 0) {
          seed_text = rndstr();
          g_data.is_seed_random = true;
        }
        g_data.seed = seed_text;

        //DEBUG
        //init();
        setTimeout(init, 1000);

        $("#ui_loading").fadeIn();
        var _lbt = document.getElementById("ui_loading_placeholder");
        _lbt.style.display = "none";
      }
    }
  });


  // initially set whether we're in mobile view state
  //
  g_ui.mobile_view = ( ($(window).width() < g_ui.mobile_width) ? true : false );

  if (true) {
    g_ui.modal_state = "on";
    $("#ui_modal").fadeIn();
    $("#ui_content").fadeTo("slow", 0.5);
  }

});

window.onresize = function() {
  var prev_mobile_view = g_ui.mobile_view;
  g_ui.mobile_view = ( ($(window).width() < g_ui.mobile_width) ? true : false );

  // if we're in the deck view state, turn off all captions
  //
  if (g_ui.button_state.ui_button_deck.state == "on") {
    for (var ii=0; ii<10; ii++) {
      $("#caption_" + ii.toString() + "_m").fadeOut();
      $("#caption_" + ii.toString()).fadeOut();
    }
    return;
  }

  // if we've resized from a mobile view to a desktop view or vice
  // versa, disable/enable the appropriate mobile captions and
  // enable/disable the desktop captions
  //
  if (prev_mobile_view != g_ui.mobile_view) {
    g_ui.button_state.ui_button_reading.state = "off";
    var ele = document.getElementById("ui_button_reading");
    ele.style.backgroundColor = "transparent";
    ele.style.color = "#333";

    var _m = (g_ui.mobile_view ? "_m" : "");
    for (var ii=0; ii<10; ii++) {
      if (prev_mobile_view) {
        $("#caption_" + ii.toString() + "_m").fadeOut();
        $("#caption_" + ii.toString()).fadeIn();
      }
      else {
        $("#caption_" + ii.toString() + "_m").fadeIn();
        $("#caption_" + ii.toString()).fadeOut();
      }
    }
  }

  // update captions
  //
  for (var ii=0; ii<10; ii++) {
    var _m = (g_ui.mobile_view ? "_m" : "");
    var ui_id = "ui_card" + ii.toString();
    var cap_id = "caption_" + ii.toString() + _m;

    caption_update(ui_id, g_tarot.reading[ii].sentence, cap_id, g_ui.caption_dxy[ui_id]);
  }
}

//---
//

// https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
// CC-BY-SA user Kim Nyholm (https://stackoverflow.com/users/8450075/kim-nyholm)
//
function saveAs(blob, filename) {
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const a = document.createElement('a');
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 0)
  }
}

function downloadDeck() {
  var zip = new JSZip();
  zip.file("README", "Resonant Voyant Tarot\n---\n\nseed: " + g_data.seed + "\n");
  var imgdir = zip.folder("images");

  for (var ii=0; ii<=78; ii++) {
    var ele = document.getElementById("ui_deck"+ ii.toString());
    var svg = ele.children[0];
    imgdir.file("card" + ii.toString() + ".svg", svg.outerHTML);
  }
  var ele = document.getElementById("ui_deck78");
  var svg = ele.children[0];
  imgdir.file("card78.svg", svg.outerHTML);

  zip.generateAsync({type:"blob"})
    .then(function(content) {
      saveAs(content, "tarot.zip");
      g_data.deck_download_in_progress = false;
      $("#ui_download_loading").fadeOut();
    });
}


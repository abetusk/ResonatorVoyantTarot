#!/usr/bin/env node

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


function rseed() {
  var seed = "";
  var x = "abcdefghijklmnopqrstuvwxyzABDCEFGHIJKLMNOPQRSTUVWXYZ01234567890";
  var n = x.length;
  for (var ii=0; ii<32; ii++) {
    seed += x[ Math.floor(Math.random()*n) ];
  }
  return seed;
}

function rstr(m) {
  m = ((typeof m === "undefined") ? 32 : m);
  var seed = "";
  var x = "abcdefghijklmnopqrstuvwxyzABDCEFGHIJKLMNOPQRSTUVWXYZ01234567890";
  var n = x.length;
  for (var ii=0; ii<m; ii++) {
    seed += x[ Math.floor(Math.random()*n) ];
  }
  return seed;
}


function reseed(_s) {
  g_rng = new alea(_s);
}

var alea = require("./alea.js");
var fs = require("fs");
var getopt = require("posix-getopt");
var lodash = require("lodash");

var parser;
var opt;

var SEED = rseed();
var g_rng = new alea(SEED);

var _VERSION = "0.1.9";

function show_version(fp) {
  fp.write("version: " + _VERSION + "\n");
}

function show_help(fp) {
  show_version(fp)
  fp.write("\n");
  fp.write("usage:\n");
  fp.write("\n");
  fp.write("    sibyl [-h] [-v] [options] <svgjson> <command>\n");
  fp.write("\n");
  fp.write("  <svgjson>                   svgjson file\n");
  fp.write("  <command>                   random|<dsl>\n");
  fp.write("  [-n nest-depth]             max nesting depth (default " + sibyl_opt.max_nest_depth.toString() + ")\n");
  fp.write("  [-a attach-depth]           max attach depth (default " + sibyl_opt.max_attach_depth.toString() + ")\n");
  fp.write("  [-S scale]                  rescale factor (default " + sibyl_opt.scale.toString() + ")\n");
  fp.write("  [-G globalscale]            global scale (default " + sibyl_opt.global_scale.toString() + ")\n");
  fp.write("  [-C complexity]             complexity factor (how many attach points for a random creature) (default " + sibyl_opt.complexity.toString() + ")\n");
  fp.write("  [-p color]                  set primary color (ex. '#000000') (default random)\n");
  fp.write("  [-s color]                  set secondary color (ex '#ffffff') (default random)\n");
  fp.write("  [-b color]                  set background color (ex. '#777777') (default random)\n");
  fp.write("  [-c color]                  set background2 color (ex. '#888888') (default random)\n");
  fp.write("  [-l linewidth]              set linewidth (default 4)\n");
  fp.write("  [-P dx,dy]                  shift front creature by dx,dy (ex. '30,-5') (default '0,0')\n");
  fp.write("  [-B background-image]       set background image ('*' for random)\n");
  fp.write("  [-T background-scale]       set background scale factor (default " + sibyl_opt.background_scale_x.toString() + ")\n");
  fp.write("  [-D tiledx,tiledy]          shift tile background by tiledx,tiledy (ex. '-10,3') (default '0,0')\n");
  fp.write("  [-E symbol]                 exclude items from random generation (e.g. 'bob,pipe')\n");
  fp.write("  [-e exclude-file]           file with excluded symbols\n");
  fp.write("  [-J svgjson]                add svgjson file to symbols (can be specified multiple times)\n");
  fp.write("  [-j outjson]                output schedule JSON\n");
  fp.write("  [-R injson]                 input schedule JSON\n");
  fp.write("  [-L color]                  color ring (e.g. '#77777,#afafaf,#fe3f3f,#1f1f7f') (unimmplemented)\n");
  fp.write("  [-Z seed]                   prng seed (deafult random)\n");
  fp.write("  [-X svg_x_width]            width out output svg (deafult 720px)\n");
  fp.write("  [-Y svg_y_height]           height out output svg (deafult 720px)\n");
  fp.write("  [-g]                        disable gradient\n");
  fp.write("  [-t]                        tile background\n");
  fp.write("  [-Q]                        bonkers mode (override attach restrictions)\n");
  fp.write("  [-h]                        show help (this screen)\n");
  fp.write("  [-v]                        show version\n");
  fp.write("\n");
  fp.write("\n");
}

var sibyl_opt = {
  "max_attach_depth" : 1,
  "max_nest_depth" : 2,
  "scale" : 0.5,
  "global_scale" : 1.0,
  "complexity" : 4,
  "primary_color" : "",
  "secondary_color" : "",

  "dx" : 0,
  "dy" : 0,

  "background_color" : "",
  "background_color2" : "",
  "use_background_image":false,
  "background_image":"",
  "background_scale_set": false,
  "background_scale_x": 0.5,
  "background_scale_y": 0.5,
  "tile_background" : false,
  "background_dx" : 0,
  "background_dy" : 0,
  "use_gradient" : true,
  "bonkers" : false,
  "exclude" : [],
  "exclude_fn" : [],
  "line_width" : 4,
  "color_ring" : [],
  "output_sched" : false,
  "seed" : SEED,

  "cmd" : "random",

  "use_mask": false,

  "svg_width" : "720px",
  "svg_height" : "720px",

  "sched_in_fn" : "",
  "custom_sched" : {},
  "use_custom_sched": false,

  "additional_svgjson" : []
};

var long_opt = [
  "p", ":(primary-color)",
  "s", ":(secondary-color)",
  "b", ":(background-color)",
  "c", ":(background-color2)",
  "a", ":(attach-depth)",
  "n", ":(nest-depth)",
  "S", ":(scale)",
  "G", ":(global-scale)",
  "C", ":(complexity)",
  "B", ":(background-image)",
  "T", ":(background-scale)",
  "t", "(background-tile)",
  "g", "(disable-gradient)",
  "D", ":(background-tile-dxy)",
  "Q", "(bonkers-mode)",
  "E", ":(exclude)",
  "e", ":(exclude-file)",
  "L", ":(color-ring)",
  "l", ":(line-width)",
  "R", ":(sched-in)",
  "j", "(output-sched)",
  "Z", ":(seed)",
  "J", ":(svgjson)",
  "M", "(mask)",
  "X", ":(svg-width)",
  "Y", ":(svg-height)",
  "P", ":(dxy)"
];

parser = new getopt.BasicParser("h" + long_opt.join(""), process.argv);
while ((opt =  parser.getopt()) !== undefined) {
  switch(opt.option) {

    case 'h':
      show_help(process.stdout);
      process.exit(0);
      break;

    case 'v':
      show_version(process.stdout);
      process.exit(0);
      break;

    case 'p':
      sibyl_opt.primary_color = opt.optarg;
      break;

    case 's':
      sibyl_opt.secondary_color = opt.optarg;
      break;

    case 'b':
      sibyl_opt.background_color = opt.optarg;
      break;

    case 'c':
      sibyl_opt.background_color2 = opt.optarg;
      break;

    case 'l':
      sibyl_opt.line_width = opt.optarg;
      break;

    case 'L':
      sibyl_opt.optarg.color_ring.push(opt.optarg);
      break;

    case 'X':
      if (opt.optarg.match(/[a-zA-Z]/)) {
        sibyl_opt.svg_width  = opt.optarg;
      }
      else {
        sibyl_opt.svg_width  = opt.optarg + "px";
      }
      break;

    case 'Y':
      if (opt.optarg.match(/[a-zA-Z]/)) {
        sibyl_opt.svg_height = opt.optarg;
      }
      else {
        sibyl_opt.svg_height = opt.optarg + "px";
      }
      break;

    case 'P':
      var tok = opt.optarg.split(",");
      sibyl_opt.dx = parseFloat(tok[0]);
      if (tok.length > 1) {
        sibyl_opt.dy = parseFloat(tok[1]);
      }
      break;

    //---

    case 'M':
      sibyl_opt.use_mask = true;
      break;

    case 'B':
      sibyl_opt.use_background_image = true;
      sibyl_opt.background_image = opt.optarg;
      break;

    case 'T':
      var tok = opt.optarg.split(",");
      if (tok.length == 1) {
        sibyl_opt.background_scale_x = parseFloat(tok[0]);
        sibyl_opt.background_scale_y = parseFloat(tok[0]);
      }
      else {
        sibyl_opt.background_scale_x = parseFloat(tok[0]);
        sibyl_opt.background_scale_y = parseFloat(tok[1]);
      }
      sibyl_opt.background_scale_set = true;
      break;

    case 'D':
      var tok = opt.optarg.split(",");

      sibyl_opt.background_dx = parseFloat(tok[0]);
      if (tok.length > 1) {
        sibyl_opt.background_dy = parseFloat(tok[1]);
      }
      break;

    case 't':
      sibyl_opt.tile_background = true;
      break;

    //---

    case 'S':
      sibyl_opt.scale = parseFloat(opt.optarg);
      break;

    case 'G':
      sibyl_opt.global_scale = parseFloat(opt.optarg);
      break;

    case 'C':
      sibyl_opt.complexity = parseInt(opt.optarg);
      break;

    case 'n':
      sibyl_opt.max_nest_depth = parseInt(opt.optarg);
      break;

    case 'a':
      sibyl_opt.max_attach_depth = parseInt(opt.optarg);
      break;

    case 'g':
      sibyl_opt.use_gradient = false;
      break;

    case 'J':
      sibyl_opt.additional_svgjson.push(opt.optarg);
      break;

    case 'Q':
      sibyl_opt.bonkers = true;
      break;

    case 'E':
      sibyl_opt.exclude.push(opt.optarg);
      break;

    case 'e':
      sibyl_opt.exclude_fn.push(opt.optarg);
      break;

    case 'Z':
      SEED = opt.optarg;
      sibyl_opt.seed = opt.optarg;
      g_rng = new alea(sibyl_opt.seed);
      break;

    //---

    case 'R':
      sibyl_opt.sched_in_fn = opt.optarg;
      break;

    case 'j':
      sibyl_opt.output_sched = true;
      break;

    //---

    default:
      show_help(process.stderr);
      process.exit(-1);
      break;
  }
}

if (sibyl_opt.tile_background && (!sibyl_opt.background_scale_set)) {
  sibyl_opt.background_scale_x = 0.5;
  sibyl_opt.background_scale_y = 0.5;
}

// Create random color by default
//
var _rcolor = rand_color();
var primary_color   = _rcolor.primary.hex;
var secondary_color = _rcolor.secondary.hex;
var bg_color        = _rcolor.background.hex;
var bg_color2       = _rcolor.background2.hex;

// SVG header and footer for eventual SVG output
//
var svg_header = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<!-- Generator: Moho 13.5 build 20210422 -->',
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
  '<svg version="1.1" id="Frame_0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720px" height="720px">'
].join("");

var svg_footer = "</svg>";

var svg_xmljson = {
  "svg" : {
    "version":"1.1",
    "id" : "",
    "xmlns":"http://www.w3.org/2000/svg",
    "xmlns:xlink":"http://www.w3.org/1999/xlink",
    "width":"720px",
    "height":"720px"
  }
};

function make_svg_header(data) {
  var s = "<svg";
  for (var key in data["svg"]) {
    s += ' ' + key + '="' + data['svg'][key] + '"';
  }
  s += '>';
  return s;
}


// Override defaults with user specified values
//
if (sibyl_opt.primary_color.match(/^#[0-9a-fA-F]{6}/)) {
  primary_color = sibyl_opt.primary_color;
}
if (sibyl_opt.secondary_color.match(/^#[0-9a-fA-F]{6}/)) {
  secondary_color = sibyl_opt.secondary_color;
}
if (sibyl_opt.background_color.match(/^#[0-9a-fA-F]{6}/)) {
  bg_color = sibyl_opt.background_color;
}

if (sibyl_opt.background_color2.match(/^#[0-9a-fA-F]{6}/)) {
  bg_color2 = sibyl_opt.background_color2;
}


// fn is the JSON ("svgjson") that holds information about
// the vocabulary.
//
// arg_str is the command/dsl string to parse
//
var fn = "./_svg-vocabulary-pretty-printed.json";

if ( (process.argv.length - parser.optind()) > 1 ) {
  fn = process.argv[parser.optind()];
  sibyl_opt.cmd = process.argv[parser.optind()+1];
}
else if ( (process.argv.length - parser.optind()) > 0 ) {
  sibyl_opt.cmd = process.argv[parser.optind()];
}

if (fn.length == 0) {
  console.log("provide json");
  show_help(process.stderr);
  process.exit(1);
}

for (var ii=0; ii<sibyl_opt.exclude_fn.length; ii++) {
  var _exclude_dat = fs.readFileSync(sibyl_opt.exclude_fn[ii]).toString('utf-8');
  var lines = _exclude_dat.split("\n");
  for (var jj=0; jj<lines.length; jj++) {
    if (lines[jj].length == 0) { continue; }
    if (lines[jj][0] == '#') { continue; }
    sibyl_opt.exclude.push(lines[jj]);
  }
}

// Read the vocabulary JSON and
// make a copy for each of the background and
// main creature.
// I got nervous about shallow vs. deep copy so
// this is why thre are two copies.
//
var _vocab0 = require("./mystic_symbolic_vocabulary.js");
var _vocab1 = require("./mystic_symbolic_vocabulary.js");
var adata = _vocab0.vocabulary;
var bg_data = _vocab1.vocabulary;

var TAROT_TEMPLATE = {};

var use_custom_tarot_svgjson = true;
if (use_custom_tarot_svgjson) {
  var _v0 = require("./tarot_vocabulary.js");
  var _v1 = require("./tarot_vocabulary.js");
  for (var ii=0; ii<_v0.vocabulary.length; ii++) {
    adata.push(_v0.vocabulary[ii]);
    bg_data.push(_v1.vocabulary[ii]);
  }

  TAROT_TEMPLATE = _v0.vocabulary;
}

// Read additional JSON SVG files.
// The additional JSON files are for ease of use, rather
// than having to regenerate the core SVG JSON file.
// Multiple files can be specified.
//
for (var ii=0; ii<sibyl_opt.additional_svgjson.length; ii++) {
  var _raw_bytes = fs.readFileSync(sibyl_opt.additional_svgjson[ii]);
  var _dat0 = JSON.parse(_raw_bytes);
  var _dat1 = JSON.parse(_raw_bytes);
  for (var jj=0; jj<_dat0.length; jj++) {
    adata.push(_dat0[jj]);
    bg_data.push(_dat1[jj]);
  }
}

if (sibyl_opt.sched_in_fn.length > 0) {
  sibyl_opt.custom_sched = {};
  sibyl_opt.use_custom_sched = true;
  var _raw_bytes = fs.readFileSync(sibyl_opt.sched_in_fn);
  sibyl_opt.custom_sched = JSON.parse(_raw_bytes);

  //arg_str = "custom";
  sibyl_opt.cmd = "custom";
}


// ----------------
// ----------------
// ----------------
// Helper functions
// ----------------
// ----------------
// ----------------

function _clamp(val, _m, _M) {
  if (val < _m) { return _m; }
  if (val > _M) { return _M; }
  return val;
}

function _mod1(val) {
  if (val < 0.0) { val += 1.0; }
  if (val > 1.0) { val -= 1.0; }
  return val;
}


/*
// https://pegjs.org/online
// https://github.com/pegjs/pegjs
//

// keep for future reference but disable
// so we don't fail if it doesn't find
// the PEG file.
//
var USE_PEGJS = false;
var pegjs, gram_fn, gram_str, peg_parser;
if (USE_PEGJS) {
  pegjs = require("pegjs");

  // experiments with the custom language...
  // kind of a disaster but left here in case
  // I want to pick it up in the future.
  //
  gram_fn = "./mystisymbodsl.pegjs";
  gram_str= fs.readFileSync(gram_fn).toString();

  peg_parser = pegjs.generate(gram_str);

}
*/

function create_node() {
  return {
    "type":"basic",
    "base" : [],
    "nesting":[],
    "horn":[],
    "crown":[],
    "arm":[],
    "leg":[],
    "tail":[]
  };

}

function _default_emit(ctx, v) {
  console.log("<>", v.type, v.path, v.ele);
}

function convert_ast(ctx, data, emit) {
  emit = ((typeof emit === "undefined") ? _default_emit : emit);
  var attach_list = {"nesting":1, "horn":1, "crown":1, "arm":1, "leg":1, "tail":1};


  if (data.t == "base") {
    emit(ctx, {"type": "ele", "path":ctx.level, "ele":data.e});

    ctx.cur_node[ctx.cur_attach].push(data.e);
  }

  else if (data.t in attach_list) {

    ctx.cur_attach = data.t;

    ctx.level.pop();
    ctx.level.push(data.t);
    convert_ast(ctx, data.e, emit);
    ctx.level.pop();
  }

  else if (data.t == "sub") {

    var prv_attach = ctx.cur_attach;
    var new_node = create_node();
    var prv_node = ctx.cur_node;
    ctx.cur_node[ctx.cur_attach].push( new_node );
    ctx.cur_node = new_node;
    ctx.cur_attach = "base";
    new_node.type = "sub";

    ctx.level.push("sub_" + ctx.sub_num);
    ctx.sub_num++;
    convert_ast(ctx, data.e, emit);
    ctx.level.pop();

    ctx.cur_node = prv_node;
    ctx.cur_attach = prv_attach;
  }

  else if (data.t == "ring_expr") {
    convert_ast(ctx, data.e, emit);
  }

  else if (data.t == "ring") {

    var prv_attach = ctx.cur_attach;
    var new_node = create_node();
    var prv_node = ctx.cur_node;
    ctx.cur_node[ctx.cur_attach].push( new_node );
    ctx.cur_node = new_node;
    ctx.cur_attach = "base";
    new_node.type = "ring";

    ctx.level.push("ring_" + ctx.ring_num);
    ctx.ring_num++;
    convert_ast(ctx, data.l, emit);
    ctx.level.pop();

    ctx.cur_node = prv_node;
    ctx.cur_attach = prv_attach;
  }
  else if (data.t == "ring_list") {

    var prv_attach = ctx.cur_attach;
    var new_node = create_node();
    var prv_node = ctx.cur_node;
    ctx.cur_node[ctx.cur_attach].push( new_node );
    ctx.cur_node = new_node;
    ctx.cur_attach = "base";
    new_node.type = "ring_ele";

    convert_ast(ctx, data.e, emit);

    ctx.cur_node = prv_node;
    ctx.cur_attach = prv_attach;

    convert_ast(ctx, data.l, emit);
  }
  else if (data.t == "ring_end") {
    var prv_attach = ctx.cur_attach;
    var new_node = create_node();
    var prv_node = ctx.cur_node;
    ctx.cur_node[ctx.cur_attach].push( new_node );
    ctx.cur_node = new_node;
    ctx.cur_attach = "base";
    new_node.type = "ring_ele";

    convert_ast(ctx, data.e, emit);

    ctx.cur_node = prv_node;
    ctx.cur_attach = prv_attach;
  }

  else if (data.t == "rnd_expr") {
    convert_ast(ctx, data.e, emit);
  }
  else if (data.t == "rnd") {
    ctx.level.push("rnd_" + ctx.rnd_num);
    ctx.rnd_num++;
    convert_ast(ctx, data.l, emit);
    ctx.level.pop();


  }
  else if (data.t == "rnd_list") {
    convert_ast(ctx, data.e, emit);
    convert_ast(ctx, data.l, emit);
  }
  else if (data.t == "rnd_end") {
    convert_ast(ctx, data.e, emit);
  }


  if ("a" in data) {
    for (var ii=0; ii<data.a.length; ii++) {
      convert_ast(ctx, data.a[ii], emit);
    }

  }


}

function cleanup(data) {
  var attach_list = {"type":1,"base":1, "nesting":1, "horn":1, "crown":1, "arm":1, "leg":1, "tail":1};
  var res = {};

  if (typeof data === "string") { return data; }
  for (var key in attach_list) {
    if (data[key].length==0) { continue; }
    if (!(key in res)) { res[key] = []; }
    if (key == "type") { res[key] = data[key]; continue; }
    for (var ii=0; ii<data[key].length; ii++) {
      res[key].push( cleanup(data[key][ii]) );
    }
  }
  return res;
}

function ast_find(ast, id) {

  var cur_ast = ast;
  var cur_id = id;
  while (cur_id.length > 0) {
    var link_id = cur_id[0];
    var link_idx = cur_id[1];

    if (!(link_id in cur_ast)) { return ""; }

  }

}

function _flatten_r(data, a, lvl) {

  console.log(lvl, "flatten_r:", JSON.stringify(data), JSON.stringify(a));

  if (typeof data === "string") { a.push(data); return; }

  if ("base" in data) {
    for (var ii=0; ii<data.base.length; ii++) {

      console.log(lvl, "base...", ii, JSON.stringify(data.base[ii]), JSON.stringify(a));

      flatten_r(data.base[ii], a, lvl+1);
    }
    data.base = a;
  }

  var tdata = {};
  for (var key in data) {
    if (key == "base") { continue; }

    console.log(lvl, "...key", key);

    var sub_a = [];
    for (var ii=0; ii<data[key].length; ii++) {
      flatten_r(data[key][ii], sub_a, lvl+1);
    }

    console.log(lvl, "got for key", key, ":", JSON.stringify(sub_a));

    tdata[key] = sub_a;

  }

  for (var key in tdata) {
    if (key === "base") { continue; }
    data[key] = tdata[key];
    console.log(lvl, "data[", key, "]", JSON.stringify(data[key]));
  }

  console.log(lvl, "data", JSON.stringify(data));

}

/*
function flatten_r(data, a, lvl) {
  var key_count = 0;
  for (var key in data) { key_count++; }
  if ((key_count==1) && ("base" in data)) {
    var _a = [];
    for (var ii=0; ii<data.base.length; ii++) {
      _a.push( flatten_r(data.base[ii]) );
    }
    return _a;
  }
  else {
    for (var key in data) {

    }
  }
}
*/

function is_simple(data) {
  //if (typeof data === "string") { return true; }
  if (typeof data === "string") { return false; }
  if (!("base" in data)) { return false; }
  var key_count = 0;
  for (var key in data) {
    key_count++;
  }
  if (key_count==1) { return true; }
  return false;
}

function flatten_r(data, a, lvl) {

  console.log(lvl, "flatten_r:", JSON.stringify(data), JSON.stringify(a));

  if (typeof data === "string") { return data; return; }

  var tdata = {};
  if ("base" in data) {

    if (is_simple(data)) {

      console.log(lvl, "is_simple", JSON.stringify(data));

      var _res = [];
      for (var ii=0; ii<data.base.length; ii++) {
        if (is_simple(data.base[ii])) {
          for (jj=0; jj<data.base[ii].base.length; jj++) {
            _res.push(data.base[ii].base[jj]);
          }
        }
        else {
          _res.push(data.base[ii]);
        }
      }

      console.log(lvl, "res:", JSON.stringify(_res));
      tdata["base"] = _res;
    }
    else {

      var _a = [];
      for (var ii=0; ii<data.base.length; ii++) {

        console.log(lvl, "base...", ii, JSON.stringify(data.base[ii]), JSON.stringify(a));

        _a.push(flatten_r(data.base[ii], a, lvl+1));
      }
      tdata["base"] = _a;
      //data.base = _a;
    }
  }

  for (var key in data) {
    if (key == "base") { continue; }

    console.log(lvl, "...key", key);

    var sub_a = [];
    for (var ii=0; ii<data[key].length; ii++) {
      sub_a.push(flatten_r(data[key][ii], a, lvl+1));
    }

    console.log(lvl, "got for key", key, ":", JSON.stringify(sub_a));

    tdata[key] = sub_a;

  }

  return tdata;


}

function flatten(data) {

  var new_data = {};

  var a = [];
  var x = flatten_r(data, a, 0);
  var x = flatten_r(x, a, 0);
  var x = flatten_r(x, a, 0);

  console.log("GOT FLATTEN:\n", JSON.stringify(x, undefined, 2));
  //console.log(JSON.stringify(a,undefined,2));
  return;

  console.log(">>>", JSON.stringify(data));

  if (typeof data === "string") { return; }
  for (var key in data) {

    console.log(key);

    if (typeof data[key] === "string") { continue; }
    for (var ii=0; ii<data[key].length; ii++) {
      var a = [];

      console.log("???", key, a);
      flatten_r(data[key], a);

      new_data[key] = a;

      console.log("??>",  JSON.stringify(a) );

      //console.log(key, a);
    }
  }

  //for (var key in data) { flatten(data[key]); }
}


// *********************************************
// *********************************************
// *********************************************
// *********************************************


// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
// https://stackoverflow.com/users/96100/tim-down
//
function _tohex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function _rgb2hex(r, g, b) {
  return "#" + _tohex(r) + _tohex(g) + _tohex(b);
}

// https://stackoverflow.com/a/596243 CC-BY-SA
// https://stackoverflow.com/users/61574/anonymous
//
function _brightness(r, g, b) {
  return ((r/255.0)*0.299) + (0.587*(g/255.0)) + (0.114*(b/255.0));
}

//  https://stackoverflow.com/a/17243070
// From user Paul S. (https://stackoverflow.com/users/1615483/paul-s)
//
/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
 * 0 <= h,s,v, <=1
*/
function HSVtoRGB(h, s, v) {
  var r, g, b, i, f, p, q, t;
  if (arguments.length === 1) { s = h.s, v = h.v, h = h.h; }
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/* accepts parameters
 * r  Object = {r:x, g:y, b:z}
 * OR 
 * r, g, b
 *
 * 0 <= r,g,b <= 255
*/
function RGBtoHSV(r, g, b) {
  if (arguments.length === 1) { g = r.g, b = r.b, r = r.r; }
  var max = Math.max(r, g, b), min = Math.min(r, g, b),
    d = max - min,
    h,
    s = (max === 0 ? 0 : d / max),
    v = max / 255;

  switch (max) {
    case min: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
    case g: h = (b - r) + d * 2; h /= 6 * d; break;
    case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }

  return { h: h, s: s, v: v };
}

function HSVtoHSL(h, s, v) {
  if (arguments.length === 1) { s = h.s, v = h.v, h = h.h; }
  var _h = h,
    _s = s * v, _l = (2 - s) * v;
  _s /= (_l <= 1) ? _l : 2 - _l;
  _l /= 2;
  return { h: _h, s: _s, l: _l };
}

function HSLtoHSV(h, s, l) {
  if (arguments.length === 1) { s = h.s, l = h.l, h = h.h; }
  var _h = h, _s, _v; l *= 2;
  s *= (l <= 1) ? l : 2 - l;
  _v = (l + s) / 2;
  _s = (2 * s) / (l + s);
  return { h: _h, s: _s, v: _v };
}

// ------------------
// ------------------
// ------------------

// Integer random number in range of n
//
function _irnd(n) {
  if (typeof n === "undefined") { n=2; }
  //return Math.floor(Math.random()*n);
  return Math.floor(g_rng.double()*n);
}

function _srnd(m) {
  m = ((typeof m === "undefined") ? 32 : m);
  var _s = "";
  var x = "abcdefghijklmnopqrstuvwxyzABDCEFGHIJKLMNOPQRSTUVWXYZ01234567890";
  var n = x.length;
  for (var ii=0; ii<m; ii++) {
    _s += x[ _irnd(n) ];
  }
  return _s;

}

// _rnd()     : 0...1
// _rnd(a)    : 0...a
// -rnd(a,b)  : a...b
//
function _rnd(a,b) {
  a = ((typeof a === "undefined") ? 1.0 : a);
  if (typeof b === "undefined") {
    //return Math.random()*a;
    return g_rng.double()*a;
  }

  //return (Math.random()*(b-a) + a);
  return (g_rng.double()*(b-a) + a);
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
  else {
    _copy = a[idx];
  }

  //return a[idx];
  return _copy;
}

function _choose(a_orig, n) {
  if ((typeof n === "undefined") || (n<1)) { return []; }
  var a = [ ...a_orig ];

  if (n>=a.length) { return a; }

  var len = a.length;
  for (var ii=0; ii<n; ii++) {
    var p = _irnd(len-ii);
    var t = a[ii];
    a[ii] = a[p];
    a[p] = t;
  }

  return a.slice(0,n);
}

function _deg(x,y) { return Math.atan2(y,x)*180.0/Math.PI; }


// ------------------
// ------------------
// ------------------

// return the SVG "def" as a string.
// The defs are used for the linear and radial gradients
// that are used in the fill for the path.
//
function jsonsvg2svg_defs(defs, primary_color, secondary_color) {
  if (typeof defs === "undefined") { return ""; }

  var lines = [];
  for (var def_idx=0; def_idx<defs.length; def_idx++) {
    var x = defs[def_idx];
    var _type = x.type;

    if ((_type == "linearGradient") || (_type == "radialGradient")) {

      var _line = "<" + _type + " ";

      for (var _key in x) {
        if ((_key === "stops") ||
            (_key === "type")) {
          continue;
        }
        _line += " " + _key + "=\"" + x[_key] + "\"";
      }

      _line += ">";
      lines.push( _line );

      if ("stops" in x) {
        for (var ii=0; ii<x.stops.length; ii++) {
          var _stop_line = "<stop ";
          for (var _key in x.stops[ii]) {
            if (_key === "color" ) {
              var c = x.stops[ii][_key];

              if ((typeof primary_color !== "undefined") && (c == "#ffffff")) {
                c = primary_color;
              }
              else if ((typeof secondary_color !== "undefined") && (c == "#000000")) {
                c = secondary_color;
              }

              _stop_line += " style=\"stop-color:" + c + ";stop-opacity:1.0;\"";

              continue;
            }
            _stop_line += " " + _key + "=\"" + x.stops[ii][_key] + "\"";
          }
          _stop_line += "/>";
          lines.push( _stop_line );
        }
      }

      lines.push("</" + _type + ">\n")
    }
  }

  return lines.join("\n");
}

// recursively go through and process the JSON SVG.
// Child nodes ar estored in a `children` array.
// Returns an array of SVG lines.
//
function jsonsvg2svg_child(x, primary_color, secondary_color, disable_gradient, custom_prop) {
  disable_gradient = ((typeof disable_gradient === "undefined") ? false : disable_gradient);
  custom_prop = ((typeof custom_prop === "undefined") ? {} : custom_prop);
  var lines = [];

  var remap = {
    "fillRule": "fill-rule",
    "strokeWidth":"stroke-width",
    "strokeLinejoin":"stroke-linejoin",
    "strokeLinecap":"stroke-linecap",
    "vectorEffect":"vector-effect"
  };

  for (var ii=0; ii<x.length; ii++) {
    _json = x[ii];

    var tag = "";
    var _line = "";

    if ("tagName" in _json) {
      _line += "<" + _json["tagName"] + " ";
      tag = _json["tagName"];
    }

    if ("props" in _json) {
      for (var prop_key in _json.props) {

        var _val = _json.props[prop_key];
        if ((prop_key == "fill") || (prop_key == "stroke")) {

          if ((typeof primary_color !== "undefined") && (_val == "#ffffff")) {
            _val = primary_color;
          }
          else if ((typeof secondary_color !== "undefined") && (_val == "#000000")) {
            _val = secondary_color;
          }
          else if ((typeof primary_color !== "undefined") && disable_gradient && (_val.match(/^url/))) {
            _val = primary_color;
          }
        }

        var real_prop_key = prop_key;
        if (real_prop_key in remap) {
          real_prop_key = remap[prop_key];
        }

        if (real_prop_key in custom_prop) {
          _val = custom_prop[real_prop_key];
        }

        _line += " " + real_prop_key + "=\"" + _val + "\"";

      }
    }

    if ((tag !== "path") && (tag.length>0)) { _line += ">\n"; }

    if ("children" in _json) {
      var _d = jsonsvg2svg_child(_json.children, primary_color, secondary_color, disable_gradient, custom_prop);
      _line += _d.join("\n");
    }

    if ((tag !== "path") && (tag.length > 0)) {
      _line += "</" + tag + ">\n";
    }
    else if (tag === "path") {
      _line += "/>\n";
    }

    lines.push(_line);
  }

  return lines;
}

// Preprocess the vocabulary JSON file.
// The JSON file is stored as a simple array of objects.
// This function creates a lookup table for each symbol to
// easily access the data as well as creates SVG strings
// of the hader, footer and content of the symbol for ease
// of use.
//
// Returns structure.
//
// Note that `adata` is used in the returned structure, so
// mutating the returned structure could have an effect on the `adata`
// object and vice versa.
//
function _preprocess_svgjson(adata, primary_color, secondary_color, disable_gradient, exclude) {
  disable_gradient = ((typeof disable_gradient === "undefined") ? false : disable_gradient);
  exclude = ((typeof exclude === "undefined") ? [] : exclude);

  exclude_h = {};
  for (var ii=0; ii<exclude.length; ii++) { exclude_h[exclude[ii]] = true; }

  var xdata = {};

  for (var idx=0; idx<adata.length; idx++) {
    var data = adata[idx];

    var svg_width = 720.0, svg_height = 720.0;

    var specs = data.specs;

    for (var _key in specs) {

      // the recursinve bounding box (image to nest under)
      //
      if (_key === "nesting") {
      }

      // otherwise there are keypoints to anchor to
      //
      else {
        for (var ii=0; ii<specs[_key].length; ii++) {

          // SVG has y inverted (from top of svg image, in this case 720px)
          //
          //specs[_key][ii].point.y = svg_height - specs[_key][ii].point.y;
          //specs[_key][ii].normal.y *= -1.0;
        }
      }
    }

    var _svg_inner = [];
    _svg_inner = jsonsvg2svg_child(data.layers, primary_color, secondary_color, disable_gradient);

    adata[idx]["svg_header"] = ['<?xml version="1.0" encoding="utf-8"?>',
      '<!-- Generator: Moho 13.5 build 20210422 -->',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
      '<svg version="1.1" id="Frame_0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720px" height="720px">'].join("\n");
    adata[idx]["svg_footer"] = "</svg>";
    adata[idx]["svg_inner"] = _svg_inner.join("\n");

  }

  xdata["svg_header"] = ['<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Generator: Moho 13.5 build 20210422 -->',
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    '<svg version="1.1" id="Frame_0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720px" height="720px">'].join("\n");
  xdata["svg_footer"] = "</svg>";

  xdata["data"] = [];
  for (var ii=0; ii<adata.length; ii++) {
    if (adata[ii].name in exclude_h) { continue; }
    xdata.data.push( adata[ii] );
  }

  xdata["symbol"] = {};
  for (var ii=0; ii<adata.length; ii++) {
    if (adata[ii].name in exclude_h) { continue; }
    xdata.symbol[ adata[ii].name ] = adata[ii];
  }

  // for restricted choices
  //
  var attach_list = ["base", "nesting", "crown", "horn", "arm", "leg", "tail", "background"];
  xdata["choice"] = {};
  for (var ii=0; ii<attach_list.length; ii++) {
    xdata.choice[attach_list[ii]] = [];
  }

  for (var ii=0; ii<adata.length; ii++) {
    var _d = adata[ii];
    var allowed = { "base": true, "nesting": true, "crown": true, "horn": true, "arm": true, "leg": true, "tail": true, "background":false };

    var _ato = {"crown":false, "horn":false, "arm":false, "leg":false, "tail":false};

    // if meta doesn't even exist, just allow everything
    // (excpet background, by default)
    //
    if (!("meta" in _d)) {
      for (var jj=0; jj<attach_list.length; jj++) {
        if (allowed[attach_list[jj]]) {
          if (_d.name in exclude_h) { continue; }
          xdata.choice[attach_list[jj]].push(_d.name);
        }
      }
      continue;
    }

    // It must always be nested, so disable
    // all other attach points, even 'base'
    // while still allowing nesting.
    //
    if (("always_be_nested" in _d.meta) &&
        (_d.meta.always_be_nested)) {
      allowed.base = false;
      for (var _a in _ato) { allowed[_a] = false; }
      allowed.nesting = true;
    }

    if (("never_be_nested" in _d.meta) &&
        (_d.meta.never_be_nested)) {
      allowed.nesting = false;
    }

    // `attach_to` is opt in, so _ato is by
    // default false, only setting to true
    // if it appears in teh list.
    //
    if ("attach_to" in _d.meta) {
      for (jj=0; jj<_d.meta.attach_to.length; jj++) {
        _ato[ _d.meta.attach_to[jj] ] = true;
      }

      for (var _a in _ato) {
        allowed[_a] = _ato[_a];
      }
    }

    if (("background" in _d.meta) &&
        (_d.meta.background)) {
      allowed["background"] = true;
    }

    // now we can add the creature name
    // to the relevant lists
    //
    for (var _a in allowed) {
      if (allowed[_a]) {
        if (_d.name in exclude_h) { continue; }
        xdata.choice[_a].push( _d.name );
      }
    }

  }

  return xdata;
}

function random_creature(ctx, attach_type) {
  var idx = 0, sub_name = "";
  var data = ctx.data;

  if (("bonkers" in ctx) && (ctx.bonkers)) {
    idx = _irnd(data.length);
    sub_name = data[idx].name;
    return sub_name;
  }

  if (("choice" in ctx) && (attach_type in ctx.choice)) {
    idx = _irnd( ctx.choice[attach_type].length );
    return ctx.choice[attach_type][idx];
  }

  idx = _irnd(data.length);
  sub_name = data[idx].name;
  return sub_name;
}


//            crown
//      horn          horn
//         arm     arm
//           nesting 
//         leg     leg
//             tail
//
//            anchor
//
//
// looks like mystic symbolic uses a 'complexity' feature
// that allocates units to crown/horn/arm/leg/tail, with
// nesting always chosen, up to whatever depth.
//
// So for example, choosing 'hands_claddagh' at complexity
// 0 will only every choose a 'hands_claddagh' with a nested
// image.
// Choosing "complexity 1" ill choose a nesting image for the
// 'hands_claddagh' and then recur on one of crown, horn, arm,
// leg or tail.
// "complexity 2" will choose two from the list of (crown,
// horn, arm, leg, tail), etc.
//
// I'm not sure why setting "complexity 0" always chooses the
// 'hands_claddagh' as the main image with another nested inside...
// maybe this is an artifact of the weird size ratio of the 'hands_claddagh'?
// Choosing another image, like ''hand_fist' lets it be embedded
// in another image.
//
// ok, so it's the meta information...there are 'always_be_ntested'
// and 'always_nest' flags and this is probably why it's being
// giving the results we see.
//
// It looks like the creature generator doesn't really recur...
// It takes a base image, with nesting, then goes out to each of
// the attachments, using one symbol only, with an optional nesting
// within the attahced symbol.
// As far as I can tell, no attached symbols have themselves
// other attachments coming  off of their attachments.
//
// each symbol paths has a 'fill', 'stroke' and 'stroke-width'
// which can be changed as needed. 'fill-rule' can be kept
// as 'evenodd'?
// The svg for each has the fill and stroke broken out into
// json elements, so maybe we should consider only constructing
// the svg on the fly.
//
//
//
function mystic_symbolic_random(ctx, base, primary_color, secondary_color, bg_color) {
  if (typeof ctx === "undefined") { return ""; }
  primary_color = ((typeof primary_color === "undefined") ? "#ffffff" : primary_color);
  secondary_color = ((typeof secondary_color === "undefined") ? "#000000" : secondary_color);
  bg_color = ((typeof bg_color === "undefined") ? "#777777" : bg_color);

  var realized = {};

  //base = ( (typeof base === "undefined") ? ctx.data[ _irnd(ctx.data.length) ] : base ) ;
  if (typeof base === "undefined") {
    var base_name = random_creature(ctx, "base");
    base = ctx.symbol[base_name];
  }

  realized["base"] = base.name;

  var _include_background_rect = ctx.create_background_rect;

  // can randomize this later if desired.
  //
  var invert_flag = false;

  var scale = ctx.scale;
  var complexity = ctx.complexity;

  var top_level = false;

  if (ctx.cur_depth == 0) { top_level = true; }
  ctx.cur_depth++;

  var ret_str = "";

  if (top_level) {

    if (ctx.create_svg_header) {
      ret_str += base.svg_header;
    }

    var _scale = scale;
    if ("global_scale" in ctx) {
      _scale *= ctx.global_scale;
    }

    ret_str += "<g transform=\"translate(" + (ctx.svg_width/2).toString() + " " + (ctx.svg_height/2).toString() + ") " +
      " scale(" + _scale.toString() + " " + _scale.toString() + ") " +
      " translate(" + (-ctx.svg_width/2).toString() + " " + (-ctx.svg_height/2).toString() + ")\">\n";

    if (_include_background_rect) {
      var w = ctx.svg_width;
      var h = ctx.svg_height;
      _bg = bg_color;
      ret_str += "<rect x=\"-" + w.toString() + "\" y=\"-" + h.toString() + "\" ";
      ret_str += "width=\"" + (3*w).toString() + "\" height=\"" + (3*h).toString() + "\" fill=\"" + _bg + "\" data-is-background=\"true\">\n</rect>\n";
    }

  }
  ret_str += jsonsvg2svg_defs(base.defs, primary_color, secondary_color);

  var base_specs = base.specs;
  var base_meta = base.meta;
  var base_bbox = base.bbox;

  if (ctx.cur_depth <= ctx.max_depth) {

    // Attach to logic.
    // Choose candidate limbs to branch off of.
    //
    var candidate_attach_list = [];
    for (var spec_key in base_specs) {

      // Complexity only refers to the limbs, not the nesting.
      // The anchor point is used to position the symbol and not
      // for going down the recursion, so is ignored in this context.
      //
      if ((spec_key === "anchor") || (spec_key === "nesting")) { continue; }
      candidate_attach_list.push(spec_key);

    }
    var attach_list = _choose(candidate_attach_list, complexity);

    for (var attach_list_idx=0; attach_list_idx < attach_list.length; attach_list_idx++) {
      
      var attach_id = attach_list[attach_list_idx];

      // Random choice of symbol
      //
      //var sub_idx = _irnd(ctx.data.length);
      //var sub_name = ctx.data[sub_idx].name;

      var sub_name = random_creature(ctx, attach_id);

      if (!("attach" in realized)) {
        realized["attach"] = {};
      }
      if (!(attach_id in realized.attach)) {
        realized.attach[attach_id] = [];
      }

      // We reuse the svg to give the symmetry, inverting as needed.
      //
      var reuse_svg = "";
      for (var aidx=0; aidx < base.specs[attach_id].length; aidx++) {

        var sub = Object.assign({}, ctx.symbol[sub_name]);

        var _invert = ( ((aidx%2)==0) ? false : true );
        var f = (_invert ? -1.0 : 1.0);

        var base_attach_point = [ base.specs[attach_id][aidx].point.x, base.specs[attach_id][aidx].point.y ];
        var base_attach_deg = _deg( base.specs[attach_id][aidx].normal.x, base.specs[attach_id][aidx].normal.y );

        var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
        var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, f*sub.specs.anchor[0].normal.y );

        var deg = base_attach_deg - sub_anchor_deg;
        if (_invert) { deg *= -1; }

        var t_str_s = "<g transform=\"";
        t_str_s += " translate(" + base_attach_point[0].toString() + " " + base_attach_point[1].toString() + ")";
        t_str_s += " scale(" + scale.toString() + " " + (f*scale).toString() + ")";
        t_str_s += " rotate(" + (deg).toString() + ")";
        t_str_s += " translate(" + (-sub_anchor_point[0]).toString() + " " + (-sub_anchor_point[1]).toString() + ")";
        t_str_s += "\">";

        var t_str_e = "</g>";

        if (aidx == 0) {
          ret_str += jsonsvg2svg_defs(sub.defs, primary_color, secondary_color);
          reuse_svg = mystic_symbolic_random(ctx, sub, primary_color, secondary_color);
        }

        realized.attach[attach_id].push( ctx.realized_child );

        ret_str += t_str_s;

        // render svg from svgjson data
        //
        ret_str += reuse_svg;

        ret_str += t_str_e;

      }

    }

  }

  // The base symbol
  //
  if (invert_flag) {
    var w = ctx.svg_width;
    var h = ctx.svg_height;

    ret_str += "<g transform=\"";
    ret_str += " translate(" + (w/2).toString() + " " + (h/2).toString() + ")";
    ret_str += " rotate(180)";
    ret_str += " scale(1 -1)";
    ret_str += " translate(" + (-w/2).toString() + " " + (-h/2).toString() + ")";
    ret_str += "\">";
  }

  ret_str += jsonsvg2svg_child(base.layers, primary_color, secondary_color, !ctx.use_gradient, ctx.custom_prop);

  if (invert_flag) {
    ret_str += "</g>";
  }


  // nesting logic
  //
  if (("nesting" in base.specs) && (ctx.cur_depth <= ctx.max_nest_depth)) {

    // Random choice of nesting symbol
    //
    //var sub_idx = _irnd(ctx.data.length);
    //var sub_name = ctx.data[sub_idx].name;

    var sub_name = random_creature(ctx, "nesting");

    for (var nest_idx=0; nest_idx<base.specs.nesting.length; nest_idx++) {

      //var sub = Object.assign({}, ctx.data[sub_idx]);
      var sub = Object.assign({}, ctx.symbol[sub_name]);

      var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
      var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, sub.specs.anchor[0].normal.y );

      var nest_anchor_deg = _deg( 0, -1 );

      var nest_bbox = base.specs.nesting[nest_idx];
      var nest_center = [ nest_bbox.x.min + ((nest_bbox.x.max - nest_bbox.x.min) / 2.0),
                          nest_bbox.y.min + ((nest_bbox.y.max - nest_bbox.y.min) / 2.0) ];

      var nest_dx = Math.abs(nest_bbox.x.max - nest_bbox.x.min);
      var nest_dy = Math.abs(nest_bbox.y.max - nest_bbox.y.min);
      var min_dim = ( (nest_dx < nest_dy) ? nest_dx : nest_dy );

      // We center it along the minimum dimension of the nesting box.
      //
      var nest_ul = [ nest_center[0] - min_dim/2, nest_center[1] - min_dim/2 ];

      var nest_scale = min_dim / ctx.svg_width;

      var t_str_s = "<g transform=\"";
      t_str_s += " translate(" + nest_ul[0].toString() + " " + nest_ul[1].toString() + ")";
      t_str_s += " scale(" + (nest_scale).toString() + " " + (nest_scale).toString() + ")";
      t_str_s += "\">";

      var t_str_e = "</g>";

      ret_str += jsonsvg2svg_defs(sub.defs, secondary_color, primary_color);
      ret_str += t_str_s;
      ret_str += mystic_symbolic_random(ctx, sub, secondary_color, primary_color);
      ret_str += t_str_e;

      if (!("attach" in realized)) {
        realized["attach"] = {};
      }

      if (!("nesting" in realized)) {
        realized.attach["nesting"] = [];
      }
      realized.attach["nesting"].push( ctx.realized_child );

    }
  }

  if (top_level) {
    ret_str += "</g>\n";

    if (ctx.create_svg_header) {
      ret_str += base.svg_footer;
    }
  }

  ctx["realized_child"] = realized;

  ctx.cur_depth-=1;
  return ret_str;
}

// -----
// -----
// -----
// -----

function parse_invert_name(sym) {
  var res = { "invert":false, "name": null, "primary":null, "secondary":null, "deg_angle":0 };

  if (typeof sym === "undefined") { return res; }

  res.invert = false;
  res.name = sym;
  if (sym.length == 0) {
    return res;
  }
  if (sym[0] == '-') {
    res.invert = true;
    res.name = sym.slice(1);
  }

  if (res.name.match(/\//)) {
    var tok = res.name.split(/\//);
    if (tok.length > 1) {
      res.deg_angle = parseFloat(tok[1]);
      res.name = tok[0];
    }
  }

  if (res.name.match(/#/)) {
    var tok = res.name.split("#");
    res.name = tok[0];
    res.primary = "#" + tok[1];
    if (tok.length > 2) {
      res.secondary = "#" + tok[2];
    }
  }

  return res;
}

function mystic_symbolic_sched(ctx, sched, primary_color, secondary_color, bg_color) {
  if (typeof ctx === "undefined") { return ""; }
  primary_color = ((typeof primary_color === "undefined") ? "#ffffff" : primary_color);
  secondary_color = ((typeof secondary_color === "undefined") ? "#000000" : secondary_color);
  bg_color = ((typeof bg_color === "undefined") ? "#777777" : bg_color);

  if (typeof sched === "string") {
    sched = { "base": sched };
  }
  var _include_background_rect = ctx.create_background_rect;
  var scale = ctx.scale;
  var top_level = false;

  var use_creature_id = true;

  var symbol_info = parse_invert_name(sched.base);
  var invert_flag = symbol_info.invert;
  var symbol_name = symbol_info.name;

  var _base_pcol = ( symbol_info.primary ? symbol_info.primary : primary_color ),
      _base_scol = ( symbol_info.secondary ? symbol_info.secondary : secondary_color ),
      _base_ang = ( symbol_info.deg_angle ? symbol_info.deg_angle : 0.0);

  // if it's a `:rnd` keyworkd,, short circuit and go directly into the
  // `mystic_symbolic_random` function.
  //
  if (symbol_name == ":rnd") {
    var _dx = ctx.svg_width/2,
        _dy = ctx.svg_height/2;
    var _w = ctx.svg_width, _h = ctx.svg_height;
    var _rnd_creat = ctx.symbol[random_creature(ctx, "base")];
    var _r = "";

    _r += mystic_symbolic_random(ctx, undefined, _base_pcol, _base_scol, bg_color);
    return _r;
  }

  //--

  if (ctx.cur_depth == 0) { top_level = true; }
  ctx.cur_depth++;

  var base = ctx.symbol[symbol_name];
  if (!(symbol_name in ctx.symbol)) { return {"error":"could not find symbol " + symbol_name + " (0)"}; }

  var ret_str = "";

  if (top_level) {

    if (ctx.create_svg_header) {
      ret_str += base.svg_header;
    }

    var _scale = scale;
    if ("global_scale" in ctx) {
      _scale *= ctx.global_scale;
    }

    if (use_creature_id) {
      ret_str += "<g id='" + ctx.svg_id + "'>\n";
      ret_str += "<g transform=\"translate(360 360) scale(" + _scale.toString() + " " + _scale.toString() + ") ";
      ret_str += " rotate(" + _base_ang + ") ";
      ret_str += " translate(-360 -360)\">\n";
    }

    else {
      ret_str += "<g transform=\"translate(360 360) ";
      ret_str += " scale(" + _scale.toString() + " " + _scale.toString() + ") ";
      ret_str += " rotate(" + _base_ang + ") ";
      ret_str += " translate(-360 -360)\">\n";
    }

    if (_include_background_rect) {
      var w = ctx.svg_width;
      var h = ctx.svg_height;
      _bg = bg_color;
      ret_str += "<rect x=\"-" + w.toString() + "\" y=\"-" + h.toString() + "\" ";
      ret_str += "width=\"" + (3*w).toString() + "\" height=\"" + (3*h).toString() + "\" fill=\"" + _bg + "\" data-is-background=\"true\">\n</rect>\n";
    }

  }

  var base_specs = base.specs;
  var base_meta = base.meta;
  var base_bbox = base.bbox;

  var attach_list = [];
  if ("attach" in sched) {
    for (var key in sched.attach) {
      attach_list.push(key);
    }
  }

  for (var attach_list_idx=0; attach_list_idx < attach_list.length; attach_list_idx++) {

    // if attach id is in our schedule...
    // find the sub component name
    //
    var attach_id = attach_list[attach_list_idx];
    var sched_mod_data = sched.attach[attach_id];

    // make sure we have it in our compnent and
    // skip the nesting, as that will be handled below
    //
    if (!(attach_id in base.specs)) { continue; }
    if (attach_id === "nesting") { continue; }

    var reuse_svg = "";
    for (var aidx=0; aidx < base.specs[attach_id].length; aidx++) {

      var sub_name = "";
      var m_aidx = aidx % sched_mod_data.length
      if (typeof sched_mod_data[m_aidx] === "string") {
        sub_name = sched_mod_data[m_aidx];
      }
      else {
        sub_name = sched_mod_data[m_aidx].base;
      }

      var sub_symbol_info = parse_invert_name(sub_name);
      var sub_invert_flag = sub_symbol_info.invert;
      var sub_symbol_name = sub_symbol_info.name;

      var _sub_pcol = ( sub_symbol_info.primary ? sub_symbol_info.primary : primary_color );
      var _sub_scol = ( sub_symbol_info.secondary ? sub_symbol_info.secondary : secondary_color );
      var _sub_deg_ang = ( sub_symbol_info.deg_angle ? sub_symbol_info.deg_angle : 0.0 );

      var do_random_recur = false;


      if (sub_symbol_name == ":rnd") {
        var _rnd_creat = ctx.symbol[random_creature(ctx, attach_id)];
        sub_symbol_name = _rnd_creat.name;
        do_random_recur = true;
      }


      if (!(sub_symbol_name in ctx.symbol)) {
        return {"error":"could not find symbol " + sub_symbol_name + " (1)"};
      }

      var sub_sched = sched.attach[attach_id][m_aidx];

      var sub = Object.assign({}, ctx.symbol[sub_symbol_name]);

      var _invert = ( ((aidx%2)==0) ? false : true );
      var f = (_invert ? -1.0 : 1.0);
      if (sub_invert_flag) {
        _invert = (_invert ? false : true);
        f *= -1.0;
      }

      var base_attach_point = [ base.specs[attach_id][aidx].point.x, base.specs[attach_id][aidx].point.y ];
      var base_attach_deg = _deg( base.specs[attach_id][aidx].normal.x, base.specs[attach_id][aidx].normal.y );

      var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
      var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, f*sub.specs.anchor[0].normal.y );

      var deg = base_attach_deg - sub_anchor_deg + _sub_deg_ang;
      if (_invert) { deg *= -1; }

      var t_str_s = "<g transform=\"";
      t_str_s += " translate(" + base_attach_point[0].toString() + " " + base_attach_point[1].toString() + ")";
      t_str_s += " scale(" + scale.toString() + " " + (f*scale).toString() + ")";
      t_str_s += " rotate(" + (deg).toString() + ")";
      t_str_s += " translate(" + (-sub_anchor_point[0]).toString() + " " + (-sub_anchor_point[1]).toString() + ")";
      t_str_s += "\">";

      var t_str_e = "</g>";

     
      if (do_random_recur) {
        reuse_svg = mystic_symbolic_random(ctx, ctx.symbol[sub_symbol_name], _sub_pcol, _sub_scol);
      }
      else {
        reuse_svg = mystic_symbolic_sched(ctx, sub_sched, _sub_pcol, _sub_scol);
      }

      ret_str += t_str_s;
      ret_str += reuse_svg;
      ret_str += t_str_e;

    }

  }

  // inversion should be handled at a higher level but I'm leaving the comment cruft
  // in case I can remmember why I put it here in the first place
  //
  ret_str += jsonsvg2svg_defs(base.defs, _base_pcol, _base_scol);
  ret_str += jsonsvg2svg_child(base.layers, _base_pcol, _base_scol, !ctx.use_gradient, ctx.custom_prop);

  // nesting logic
  //
  if (("attach" in sched) && ("nesting" in sched.attach) && ("nesting" in base.specs)) {

    for (var nest_idx=0; nest_idx<base.specs.nesting.length; nest_idx++) {

      var sched_nest_n = sched.attach.nesting.length;

      var sub_sched = {};
      if (typeof sched.attach.nesting[nest_idx % sched_nest_n] === "string") {
        sub_sched = {"base":sched.attach.nesting[nest_idx % sched_nest_n]};
      }
      else {
        sub_sched = sched.attach.nesting[nest_idx % sched_nest_n];
      }
      var sub_name = sub_sched.base;


      var sub_symbol_info = parse_invert_name(sub_name);
      var sub_invert_flag = sub_symbol_info.invert;
      var sub_symbol_name = sub_symbol_info.name;

      var _sub_pcol = ( sub_symbol_info.primary ? sub_symbol_info.primary : primary_color );
      var _sub_scol = ( sub_symbol_info.secondary ? sub_symbol_info.secondary : secondary_color );
      var _sub_deg_ang = ( sub_symbol_info.deg_angle ? sub_symbol_info.deg_angle : 0.0 );

      var do_random_recur = false;

      if (sub_symbol_name == ":rnd") {
        var _rnd_creat = ctx.symbol[random_creature(ctx, "nesting")];
        sub_symbol_name = _rnd_creat.name;
        do_random_recur = true;
      }

      if (!(sub_symbol_name in ctx.symbol)) {
        return {"error":"could not find symbol " + sub_symbol_name + " (2)"};
      }

      var sub = Object.assign({}, ctx.symbol[sub_symbol_name]);

      var nest_f = (sub_invert_flag ? -1.0 : 1.0);

      var nest_bbox = base.specs.nesting[nest_idx];
      var nest_center = [ nest_bbox.x.min + ((nest_bbox.x.max - nest_bbox.x.min) / 2.0),
                          nest_bbox.y.min + ((nest_bbox.y.max - nest_bbox.y.min) / 2.0) ];


      var nest_dx = Math.abs(nest_bbox.x.max - nest_bbox.x.min);
      var nest_dy = Math.abs(nest_bbox.y.max - nest_bbox.y.min);
      var min_dim = ( (nest_dx < nest_dy) ? nest_dx : nest_dy );

      var nest_ul = [ nest_center[0] - min_dim/2, nest_center[1] - min_dim/2 ];

      var nest_scale = min_dim / ctx.svg_width;

      var nest_deg = 0.0;
      if (sub_invert_flag) {
        nest_deg = 180;
        nest_f = -1.0;
      }

      nest_deg += _sub_deg_ang;

      var t_str_s = "<g transform=\"";
      t_str_s += " translate(" + nest_ul[0].toString() + " " + nest_ul[1].toString() + ")";
      t_str_s += " scale(" + (nest_scale).toString() + " " + (nest_scale).toString() + ")";
      t_str_s += " translate(" + (720/2).toString() + " " + (720/2).toString() + ")";
      t_str_s += " rotate(" + (nest_deg).toString() + ")";
      t_str_s += " scale(1 " +  (nest_f).toString() + ")";
      t_str_s += " translate(" + (-720/2).toString() + " " + (-720/2).toString() + ")";
      t_str_s += "\">";

      var t_str_e = "</g>";

      ret_str += t_str_s;

      if (do_random_recur) {
        ret_str += mystic_symbolic_random(ctx, ctx.symbol[sub_symbol_name], _sub_scol, _sub_pcol, bg_color);
      }
      else {
        ret_str += mystic_symbolic_sched(ctx, sub_sched, _sub_scol, _sub_pcol);
      }
      ret_str += t_str_e;

    }
  }

  if (top_level) {

    if (use_creature_id) {
      ret_str += "\n</g></g> <!-- creature id end -->\n";
    }
    else {
      ret_str += "</g>\n";
    }

    if (ctx.create_svg_header) {
      ret_str += base.svg_footer;
    }
  }

  ctx.cur_depth-=1;
  return ret_str;
}

// -----
// -----
// -----
// -----

function get_base_string(sched, idx) {
  if (typeof sched === "string") {
    return sched;
  }
  if (!("base" in sched)) {
    return {"error":"no 'base' in sched:" + JSON.stringify(sched)};
  }
  return get_base_string(sched.base[idx%sched.base.length], idx);
}

function mystic_symbolic_sched2(ctx, sched, idx, primary_color, secondary_color, bg_color) {
  if (typeof ctx === "undefined") { return ""; }
  primary_color = ((typeof primary_color === "undefined") ? "#ffffff" : primary_color);
  secondary_color = ((typeof secondary_color === "undefined") ? "#000000" : secondary_color);
  bg_color = ((typeof bg_color === "undefined") ? "#777777" : bg_color);

  var use_bottom_nest_anchor_point = false;

  var symbol_name = sched;
  if (typeof symbol_name !== "string") {

    if (!("base" in sched)) {
      return {"error":"could not find 'base' in sched:" + JSON.stringify(sched)};
    }

    symbol_name = get_base_string(sched.base[idx%sched.base.length], idx);
    if ((typeof symbol_name !== "string") && ("error" in symbol_name)) {
      return symbol_name;
    }

  }
  else {
    sched = { "base": sched };
  }

  var _include_background_rect = true;
  var scale = ctx.scale;
  var top_level = false;

  if (ctx.cur_depth == 0) { top_level = true; }
  ctx.cur_depth++;

  var ret_str = "";

  if (top_level) {

    if (ctx.create_svg_header) {
      ret_str += base.svg_header;
    }

    ret_str += "<g transform=\"translate(360 360) scale(0.5 0.5) translate(-360 -360)\">\n";

    if (_include_background_rect) {
      var w = ctx.svg_width;
      var h = ctx.svg_height;
      _bg = bg_color;
      ret_str += "<rect x=\"-" + w.toString() + "\" y=\"-" + h.toString() + "\" ";
      ret_str += "width=\"" + (3*w).toString() + "\" height=\"" + (3*h).toString() + "\" fill=\"" + _bg + "\" data-is-background=\"true\">\n</rect>\n";
    }

    ret_str += jsonsvg2svg_defs(base.defs, primary_color, secondary_color);
  }

  var base_specs = base.specs;
  var base_meta = base.meta;
  var base_bbox = base.bbox;

  var attach_kind = ["nesting", "crown", "horn", "arm", "leg", "tail"];

  var attach_list = [];

  for (var ii=0; ii<attach_kind.length; ii++) {
    if (attach_kind[ii] in sched) {
      attach_list.push(attach_kind[ii]);
    }
  }

  for (var attach_list_idx=0; attach_list_idx < attach_list.length; attach_list_idx++) {

    // if attach id is in our schedule...
    // find the sub component name
    //
    var attach_id = attach_list[attach_list_idx];
    var sched_mod_data = sched[attach_id];

    // make sure we have it in our compnent and
    // skip the nesting, as that will be handled below
    //
    if (!(attach_id in base.specs)) { continue; }
    if (attach_id === "nesting") { continue; }

    var reuse_svg = "";
    for (var aidx=0; aidx < base.specs[attach_id].length; aidx++) {

      var sub_name = "";
      var m_aidx = aidx % sched_mod_data.length
      if (typeof sched_mod_data[m_aidx] === "string") {
        sub_name = sched_mod_data[m_aidx];
      }
      else {
        sub_name = get_base_string(sched_mod_data[aidx%sched_mod_data.length], aidx);
      }

      var sub_sched = sched.attach[attach_id][m_aidx];

      var sub = Object.assign({}, ctx.symbol[sub_name]);

      var _invert = ( ((aidx%2)==0) ? false : true );
      var f = (_invert ? -1.0 : 1.0);

      var base_attach_point = [ base.specs[attach_id][aidx].point.x, base.specs[attach_id][aidx].point.y ];
      var base_attach_deg = _deg( base.specs[attach_id][aidx].normal.x, base.specs[attach_id][aidx].normal.y );

      var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
      var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, f*sub.specs.anchor[0].normal.y );

      var deg = base_attach_deg - sub_anchor_deg;
      if (_invert) { deg *= -1; }

      var t_str_s = "<g transform=\"";
      t_str_s += " translate(" + base_attach_point[0].toString() + " " + base_attach_point[1].toString() + ")";
      t_str_s += " scale(" + scale.toString() + " " + (f*scale).toString() + ")";
      t_str_s += " rotate(" + (deg).toString() + ")";
      t_str_s += " translate(" + (-sub_anchor_point[0]).toString() + " " + (-sub_anchor_point[1]).toString() + ")";
      t_str_s += "\">";

      var t_str_e = "</g>";

      ret_str += jsonsvg2svg_defs(sub.defs, primary_color, secondary_color);
      reuse_svg = mystic_symbolic_sched2(ctx, sub_sched, primary_color, secondary_color);

      ret_str += t_str_s;
      ret_str += reuse_svg;
      ret_str += t_str_e;

    }

  }

  ret_str += jsonsvg2svg_child(base.layers, primary_color, secondary_color, !ctx.use_gradient, ctx.custom_prop);

  // nesting logic
  //
  if (("attach" in sched) && ("nesting" in sched.attach) && ("nesting" in base.specs)) {

    for (var nest_idx=0; nest_idx<base.specs.nesting.length; nest_idx++) {

      var sched_nest_n = sched.attach.nesting.length;

      var sub_sched = {};
      if (typeof sched.attach.nesting[nest_idx % sched_nest_n] === "string") {
        sub_sched = {"base":sched.attach.nesting[nest_idx % sched_nest_n]};
      }
      else {
        sub_sched = sched.attach.nesting[nest_idx % sched_nest_n];
      }
      var sub_name = sub_sched.base;
      var sub = Object.assign({}, ctx.symbol[sub_name]);

      if (use_bottom_nest_anchor_point) {

        var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
        var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, sub.specs.anchor[0].normal.y );

        var nest_anchor_deg = _deg( 0, -1 );

        var nest_bbox = base.specs.nesting[nest_idx];
        var base_attach = [ nest_bbox.x.min + ((nest_bbox.x.max - nest_bbox.x.min) / 2.0),
                            (nest_bbox.y.max) ];

        var nest_dx = Math.abs(nest_bbox.x.max - nest_bbox.x.min);
        var nest_dy = Math.abs(nest_bbox.y.max - nest_bbox.y.min);
        var min_dim = ( (nest_dx < nest_dy) ? nest_dx : nest_dy );

        var nest_scale = min_dim / ctx.svg_width;

        // nest areas are always axis aligned, pointing up
        //
        var deg = nest_anchor_deg - sub_anchor_deg;

        var t_str_s = "<g transform=\"";
        t_str_s += " translate(" + base_attach[0].toString() + " " + base_attach[1].toString() + ")";
        t_str_s += " scale(" + (nest_scale).toString() + " " + (nest_scale).toString() + ")";
        t_str_s += " rotate(" + (deg).toString() + ")";
        t_str_s += " translate(" + (-sub_anchor_point[0]).toString() + " " + (-sub_anchor_point[1]).toString() + ")";
        t_str_s += "\">";

        var t_str_e = "</g>";

        ret_str += jsonsvg2svg_defs(sub.defs, secondary_color, primary_color);
        ret_str += t_str_s;
        ret_str += mystic_symbolic_sched2(ctx, sub_sched, secondary_color, primary_color);
        ret_str += t_str_e;
      }
      else {


        var sub_anchor_point = [ sub.specs.anchor[0].point.x, sub.specs.anchor[0].point.y ];
        var sub_anchor_deg = _deg( sub.specs.anchor[0].normal.x, sub.specs.anchor[0].normal.y );

        var nest_anchor_deg = _deg( 0, -1 );

        var nest_bbox = base.specs.nesting[nest_idx];
        var nest_center = [ nest_bbox.x.min + ((nest_bbox.x.max - nest_bbox.x.min) / 2.0),
                            nest_bbox.y.min + ((nest_bbox.y.max - nest_bbox.y.min) / 2.0) ];

        var nest_ul = [ nest_bbox.x.min , nest_bbox.y.min ];

        var nest_dx = Math.abs(nest_bbox.x.max - nest_bbox.x.min);
        var nest_dy = Math.abs(nest_bbox.y.max - nest_bbox.y.min);
        var min_dim = ( (nest_dx < nest_dy) ? nest_dx : nest_dy );

        var nest_scale = min_dim / ctx.svg_width;

        var t_str_s = "<g transform=\"";
        t_str_s += " translate(" + nest_ul[0].toString() + " " + nest_ul[1].toString() + ")";
        t_str_s += " scale(" + (nest_scale).toString() + " " + (nest_scale).toString() + ")";
        t_str_s += "\">";

        var t_str_e = "</g>";

        ret_str += jsonsvg2svg_defs(sub.defs, secondary_color, primary_color);
        ret_str += t_str_s;
        ret_str += mystic_symbolic_sched2(ctx, sub_sched, secondary_color, primary_color);
        ret_str += t_str_e;
      }

    }
  }

  if (ctx.create_svg_header && top_level) {
    ret_str += "</g>\n";
    ret_str += base.svg_footer;
  }

  ctx.cur_depth-=1;
  return ret_str;
}

// https://www.w3.org/TR/WCAG20-TECHS/G17.html
//
function luminance(sr,sg,sb) {

  var r = ((sr < 0.03928) ? (sr/12.92) : Math.pow(((sr + 0.055)/1.055),2.4));
  var g = ((sg < 0.03928) ? (sg/12.92) : Math.pow(((sg + 0.055)/1.055),2.4));
  var b = ((sb < 0.03928) ? (sb/12.92) : Math.pow(((sb + 0.055)/1.055),2.4));

  return (0.2126*r) + (0.7152*g) + (0.0722*b);
}

// experiment
//
function _rand_color() {
  var res = {
    "primary" : { "hex":"#000000" },
    "secondary" : {"hex":"#ffffff" },
    "background": { "hex":"#777777" },
    "background2": { "hex":"#555555" }
  };

  var palette = [ [], [], [], [] ];

  var n = 5;
  //var base_hue = Math.random();
  var base_hue = g_rng.double();

  for (var p=0; p<palette.length; p++) {
    for (var i=1; i<(n+2); i++) {
      var _val = i/(n+2);
      var _sat = _rnd(0.35, 0.70);

      palette[p].push( HSVtoRGB(_hue, _sat, _val) );
    }
  }

  var prim_hue = g_rng.double();
  var prim_sat = _rnd(0.35, 0.70);
  var prim_val = _rnd(0.75, 1.0);


  var seco_hue = prim_hue + 0.35;
  var seco_sat = 1.0 - prim_sat;
  var seco_val = _rnd(0.25, 0.6);
  if (seco_hue > 1.0) { seco_hue - 1.0; }


}

// Here is the basic philosophy:
//
// The primary color is a random hue, moderate saturation
// (0.4 to 0.6) and moderate to high value.
// Too high of a saturation and it gets into "eye-bleed"
// territory. The higher value gives it a lighter feel
// and makes it stand out more.
//
// The secnodary color is darker, choosing it's value
// between (0.1 and 0.325). Anything higher and
// it's often hard to differentiate from teh primary
// color.
//
// The secondary color is essentially the stroke color,
// so the hue and saturation are chosen to provide some
// small variation but otherwise it's basically just
// chosen to be much darker.
//
// The background is chosen to be light and highly 
// desaturated, so as not to take away attention from
// the foreground.
// The complementary
// color's value being chosen in a restricted range of (0.5,1)
// and chosen to 'repel' from the first background color.
// This makes the background lighter. A darker background
// could be an option for the future.
// The similar high values mean that the background has
// a kind of 'imprint' feel.
//
function rand_color(base_hue) {
  base_hue = ((typeof base_hue === "undefined") ? g_rng.double() : base_hue);
  var res = {
    "primary" : { "hex":"#000000", "hsv":[0,0,0] },
    "secondary" : {"hex":"#ffffff", "hsv":[0,0,0] },
    "background": { "hex":"#777777", "hsv":[0,0,0] },
    "background2": { "hex":"#555555", "hsv":[0,0,0] }
  };

  var prim_hue = base_hue;
  var prim_sat = _rnd(0.4, 0.6);
  var prim_val = _rnd(0.675, 0.95);

  res.primary.hsv = [ prim_hue, prim_sat, prim_val ];

  // after experimentation, the conclusion I've come to is that
  // there should only really be "one" color, the primary.
  // The secondary really just needs to be dark, simulating a stroke.
  // When the value of the primary is too low and the value of the
  // secondary is too high, they clash too much.
  // Even a value of 0.7 for the primary and a value of 0.4 for
  // the secondary, the picture becomse hard to differentiate.
  // Better to just set the value to be something way low for
  // the secondary.
  // Choosing a random hue gives it a little variation but
  // otherwise is probably not that important.
  //
  var _del_hue = 0.2;
  var seco_hue = _mod1( prim_hue + _crnd([-1,1])*_rnd(_del_hue/2, 1.0) );
  var seco_sat = _clamp( prim_sat + _crnd([-1,1])*_rnd(0.2, 0.3), 0.3, 0.6 );
  seco_val = _rnd(0.1,0.325);

  res.secondary.hsv = [ seco_hue, seco_sat, seco_val ];


  // I kind of like backgrounds that are lighter, but it's hard
  // to say.
  // It might be better to have this as a user option.
  // 
  // I think having the bg2_val be 'repelled' in value
  // from the bg_val works out pretty well, as it gives
  // a good contrast.
  // We also don't want the background contrast/stroke
  // to be too dark, lest it take atention away from
  // the foreground.
  //

  var bg_dark_opt = false;
  if (_rnd() < 0.5) { bg_dark_opt = true; }

  //var bg_hue = Math.random();
  var bg_hue = g_rng.double();
  var bg_sat = _rnd(0.05, 0.2);
  var bg_val = ( bg_dark_opt ? _rnd(0.05, 0.5) : _rnd(0.5, 0.95) );

  res.background.hsv = [ bg_hue, bg_sat, bg_val ];

  var bg2_hue = g_rng.double();
  var bg2_sat = _rnd(0.05, 0.2);

  // this needs fixing
  // there should be a 'dead zone' around the bg_val above (of 0.05 in each direction,
  // say) where you can pick another value outside of that dead zone but restricted to
  // some other window.
  //
  var bg2_val = 0.5 + (_mod1(bg_val + _crnd([-1,1])*_rnd(0.1, 0.25))/2.0);
  if (bg_dark_opt) {
    bg2_val = (_mod1(2*bg_val + _crnd([-1,1])*_rnd(0.1, 0.25))/2.0);
  }

  res.background2.hsv = [ bg2_hue, bg2_sat, bg2_val ];

  var prim_rgb = HSVtoRGB(prim_hue,  prim_sat, prim_val);
  var seco_rgb = HSVtoRGB(seco_hue,  seco_sat, seco_val);
  var bg_rgb = HSVtoRGB(bg_hue,  bg_sat, bg_val);
  var bg2_rgb = HSVtoRGB(bg2_hue,  bg2_sat, bg2_val);

  res.primary.hex = _rgb2hex(prim_rgb.r, prim_rgb.g, prim_rgb.b);
  res.secondary.hex = _rgb2hex(seco_rgb.r, seco_rgb.g, seco_rgb.b);
  res.background.hex = _rgb2hex(bg_rgb.r, bg_rgb.g, bg_rgb.b);
  res.background2.hex = _rgb2hex(bg2_rgb.r, bg2_rgb.g, bg2_rgb.b);

  return res;
}


// pick random hsv in a restricted range
//
function rand_color_hsv() {
  var res = {
    "primary" : { "hex":"#000000" },
    "secondary" : {"hex":"#ffffff" },
    "background": { "hex":"#777777" }
  };


  //var prim_hue = Math.random();
  var prim_hue = g_rng.double();
  var prim_sat = _rnd(0.45, 0.60);
  var prim_val = _rnd(0.75, 1.0);

  var seco_hue = prim_hue + 0.35;
  var seco_sat = 1.0 - prim_sat;
  var seco_val = _rnd(0.25, 0.6);
  if (seco_hue > 1.0) { seco_hue -= 1.0; }

  var bg_hue = prim_hue - 0.35;
  //var bg_sat = (Math.random()*.5);
  //var bg_val = (Math.random()*0.5)+0.5;

  var bg_sat = (g_rng.double()*.5);
  var bg_val = (g_rng.double()*0.5)+0.5;

  if (bg_hue < 0.0) { bg_hue += 1.0; }

  var prim_rgb = HSVtoRGB(prim_hue, prim_sat, prim_val);
  var seco_rgb = HSVtoRGB(seco_hue, seco_sat, seco_val);
  var bg_rgb = HSVtoRGB(bg_hue, bg_sat, bg_val);

  //var prim_xyz = 

  res.primary.hex = _rgb2hex(prim_rgb.r, prim_rgb.g, prim_rgb.b);
  res.secondary.hex = _rgb2hex(seco_rgb.r, seco_rgb.g, seco_rgb.b);
  res.background.hex = _rgb2hex(bg_rgb.r, bg_rgb.g, bg_rgb.b);

  return res;
}

function rand_color_n(n) {
  var res = [ ];

  for (var ii=0; ii<n; ii++) {
    res.push([ { "hex":"#000000", "hsv":[0,0,0] }, { "hex":"#000000", "hsv":[0,0,0] } ]);
  }

  //var base_hue = Math.random();
  var base_hue = g_rng.double();
  var cur_hue = base_hue;

  var dir = _crnd([1,-1]);

  var _s = (1/(n*n));

  for (var ii=0; ii<res.length; ii++) {

    var prim_hue = cur_hue;
    var prim_sat = _rnd(0.4, 0.6);
    var prim_val = _rnd(0.675, 0.95);

    res[ii][0].hsv = [ prim_hue, prim_sat, prim_val ];

    // after experimentation, the conclusion I've come to is that
    // there should only really be "one" color, the primary.
    // The secondary really just needs to be dark, simulating a stroke.
    // When the value of the primary is too low and the value of the
    // secondary is too high, they clash too much.
    // Even a value of 0.7 for the primary and a value of 0.4 for
    // the secondary, the picture becomse hard to differentiate.
    // Better to just set the value to be something way low for
    // the secondary.
    // Choosing a random hue gives it a little variation but
    // otherwise is probably not that important.
    //
    var _del_hue = 0.2;
    var seco_hue = _mod1( prim_hue + _crnd([-1,1])*_rnd(_del_hue/2, 1.0 - _del_hue/2) );
    var seco_sat = _clamp( prim_sat + _crnd([-1,1])*_rnd(0.2, 0.3), 0.3, 0.6 );
    seco_val = _rnd(0.1,0.325);

    res[ii][1].hsv = [ seco_hue, seco_sat, seco_val ];

    var prim_rgb = HSVtoRGB(prim_hue,  prim_sat, prim_val);
    var seco_rgb = HSVtoRGB(seco_hue,  seco_sat, seco_val);

    res[ii][0].hex = _rgb2hex(prim_rgb.r, prim_rgb.g, prim_rgb.b);
    res[ii][1].hex = _rgb2hex(seco_rgb.r, seco_rgb.g, seco_rgb.b);

    cur_hue += dir*_rnd( (1/n) - _s, (1/n) + _s );
    cur_hue = _mod1(cur_hue);

  }


  return res;
}


function mystic_symbolic_dsl2sched_ring(_s, data) {
  if (typeof _s === "undefined") { return {}; }
  var s = _s.replace(/ /g, '');
  if ((s.length) == 0) { return {}; }

  var ret = { "tok":"", "obj":[], "del_idx":0, "state":"" };
  if (s[0] != '[') { return {}; }
  var cur_idx = 1;
  while (cur_idx < s.length) {
    var r = mystic_symbolic_dsl2sched(s.slice(cur_idx), data);
    if ("error" in r) { return r; }

    cur_idx += r.del_idx;

    if (r.tok.legth != 0) {
      ret.obj.push(r.tok);
    }
    else {
      ret.obj.push(r.obj);
    }

    if (r.state == "#list#end") { break; }
    if (r.state != "#list#sep") {
      return { "error":"ring error" };
    }

  }

  ret.del_idx = cur_idx;

  return ret;
}

function mystic_symbolic_dsl2sched_rnd(_s, data) {
  if (typeof _s === "undefined") { return {}; }
  var s = _s.replace(/ /g, '');
  if ((s.length) == 0) { return {}; }

  var state = "init";

  var ret = { "tok":"", "obj":[], "del_idx":0, "state":"" };
  if (s[0] != '{') { return {}; }
  var end_idx = s.search('}');
  if (end_idx < 0) {
    return { "error":"could not find end token '}'"};
  }

  var neg_lookup = {}, pos_lookup = {};

  var rlist = s.slice(1, end_idx).split(",");
  for (var ii=0; ii<rlist.length; ii++) {
    if (rlist[ii].length==0) { continue; }
    if (rlist[ii] == '*') {
      for (var symbol_name in data.symbol) {
        pos_lookup[symbol_name] = ii;
      }
    }
    else if (rlist[ii][0] == '-') {
      var _name = rlist[ii].slice(1);
      if (!(_name in data.symbol)) { return {"error": "could not find " + _name }; }
      neg_lookup[_name] = ii;
    }
    else {
      var _name = rlist[ii];
      if (!(_name in data.symbol)) { return {"error": "could not find " + _name }; }
      pos_lookup[_name] = ii;
    }
  }

  var choice_a = [];
  for (var key in pos_lookup) {
    if (key in neg_lookup) { continue; }
    choice_a.push(key);
  }

  ret.tok = _crnd(choice_a);
  ret.del_idx = end_idx;

  return ret;
}

function mystic_symbolic_dsl2sched(_s, data) {
  if (typeof _s === "undefined") { return {}; }

  var s = _s.replace(/ /g, '');

  var sched = { "base": "" };
  var base_str = "";
  var cur_tok = "";

  var state = "base";

  var tok_kw = {
    "@" : "nesting",
    "^" : "crown",
    "!" : "horn",
    "~" : "arm",
    "|" : "leg",
    "." : "tail",
    //":" : "#list#null",
    "," : "#list#sep",
    "[" : "#list#beg",
    "]" : "#list#end",
    "{" : "#rnd#beg",
    "}" : "#rnd#end",
    "(" : "#sub#beg",
    ")" : "#sub#end"
  };

  var tok_kw_skip = {
    //":" : "#list#null",
    "," : "#list#sep",
    "[" : "#list#beg",
    "{" : "#rnd#beg",
    //"]" : "#list#end",
    "(" : "#sub#beg"
    //")" : "#sub#end"
  }

  var state_skip = {
    "#list#null" : 1,
    "#list#sep" : 1,
    "#list#beg" : 1,
    //"#list#end" : 1,
    "#sub#beg" : 1
    //"#sub#end" : 1
  }

  var cur_idx = 0;
  var cur_obj = {};
  var cur_val_type = "";
  var cur_tok = "";
  while (cur_idx < s.length) {

    if (s[cur_idx] in tok_kw) {

      // we're changing state, so take our current token
      // and add it the appropriate current state structure
      // element.
      //
      var new_state = tok_kw[s[cur_idx]];

      // proces previous state
      //
      if (state == "base") {
        sched["base"] = cur_tok;
      }
      else if (!(s[cur_idx] in tok_kw_skip)) {

        if (!("attach" in sched)) { sched["attach"] = {}; }
        if (!(state in sched.attach)) {
          sched.attach[state] = [];
        }

        if (cur_val_type == "string") {
          sched.attach[state].push(cur_tok);
        }
        else if (cur_val_type == "object") {

          sched.attach[state].push(cur_obj);
        }
        else if (cur_val_type == "array") {
          sched.attach[state].push(...cur_obj);
        }
        else {
          return { "error":"unknown val type '" + cur_val_type + "' (" + s + ")" };
        }
      }
      else { }

      if (new_state == "#list#beg") {
        var ret = mystic_symbolic_dsl2sched_ring(s.slice(cur_idx), data);
        if ("error" in ret) { return ret; }

        cur_obj = ret.obj;
        cur_idx += ret.del_idx;
        cur_val_type = "array";

        continue;
      }
      else if ((new_state == "#list#sep") || (new_state == "#list#end")) {
        return { "obj": sched, "tok": cur_tok, "del_idx": (cur_idx+1), "state":new_state };
      }

      else if (new_state == "#rnd#beg") {
        var ret = mystic_symbolic_dsl2sched_rnd(s.slice(cur_idx), data);
        if ("error" in ret) { return ret; }

        cur_tok = ret.tok;
        cur_obj = ret.obj;
        cur_idx += ret.del_idx;
        cur_val_type = "string";

        new_state = tok_kw[s[cur_idx]];
        if (new_state != "#rnd#end") {
          return { "error" : "expected '#rnd#end' token '}', got" + s[cur_idx] };
        }

        cur_idx++;

        continue;
      }

      else if (new_state == "#sub#beg") {

        cur_idx++;
        var ret = mystic_symbolic_dsl2sched(s.slice(cur_idx), data);
        if ("error" in ret) { return ret; }

        cur_tok = ret.tok;
        cur_obj = ret.obj;
        cur_idx += ret.del_idx;
        cur_val_type = "object";

        continue;
      }
      else if (new_state == "#sub#end") {
        return { "obj": sched, "tok": cur_tok, "del_idx": (cur_idx+1), "state":new_state, "val_type":cur_val_type };
      }

      else {
        state = new_state;
      }

      cur_tok = "";
      cur_obj = {};
      state = new_state;

      cur_idx++;

    }
    else if ( (("a".charCodeAt(0) <= s.charCodeAt(cur_idx)) &&
               (s.charCodeAt(cur_idx) <= "z".charCodeAt(0))) ||
              (("A".charCodeAt(0) <= s.charCodeAt(cur_idx)) &&
               (s.charCodeAt(cur_idx) <= "Z".charCodeAt(0))) ||
              (("0".charCodeAt(0) <= s.charCodeAt(cur_idx)) &&
               (s.charCodeAt(cur_idx) <= "9".charCodeAt(0))) ||
              (s.charCodeAt(cur_idx) == "#".charCodeAt(0)) ||
              (s.charCodeAt(cur_idx) == "/".charCodeAt(0)) ||
              (s.charCodeAt(cur_idx) == ":".charCodeAt(0)) ||
              (s.charCodeAt(cur_idx) == "_".charCodeAt(0)) ||
              (s.charCodeAt(cur_idx) == "-".charCodeAt(0)) ) {
      cur_tok += s[cur_idx];
      cur_val_type = "string";
      cur_idx++;
    }
    else {
      return {"error" : "invalid character (" + s[cur_idx] + ") at " + cur_idx.toString() + " (" + s +")" };
    }

  }

  // proces previous state
  //
  if (state == "base") {

    if (cur_val_type == "string") {
      sched["base"] = cur_tok;
    }
    else if (cur_val_type == "array") {
      sched["base"] = cur_obj;
    }
  }
  else {
    if (!("attach" in sched)) { sched["attach"] = {}; }
    if (!(state in sched.attach)) {
      sched.attach[state] = [];
    }

    if (cur_val_type == "string") {
      sched.attach[state].push(cur_tok);
    }
    else if (cur_val_type == "array") {
      sched.attach[state].push(...cur_obj);
    }
    else if (cur_val_type == "object") {
      sched.attach[state].push(cur_obj);
    }
    else {
      return { "error":"unknown val type '" + cur_val_type + "' (" + s + ")" };
    }
  }

  return sched;
}

// simple sentences...loose a lot of complexity and nuance
//
function sched2sentence(sched, is_root) {
  is_root = ((typeof is_root === "undefined") ? true : is_root);

  var sentence = (sched.base.match(/^[aeiouAEIOU]/) ? "an " : "a ");
  sentence += sched.base;

  var attach_order = ["nesting", "crown", "horn", "arm", "leg", "tail"];
  var count=0;

  var attach_count=0;
  for (var akey in sched.attach) { attach_count++; }

  for (var ii=0; ii<attach_order.length; ii++) {
    var attach_id = attach_order[ii];
    if (!(attach_id in sched.attach)) { continue; }

    if (count>0) {
      if (count == (attach_count-1)) { sentence += " and"; }
      else { sentence += ","; }
    }
    else {
      sentence += " with"
    }

    if (typeof sched.attach[attach_id][0] === "string") {
      var ele = sched.attach[attach_id][0]; 

      sentence += (ele.match(/^[aeiouAEIOU]/) ? " an" : " a");
      sentence += " " + ele;
      if (attach_id=="nesting") {
        sentence += " inside of it";
      }
      else {
        sentence += " for";
        sentence += " its";
        sentence += " " + attach_id;
      }
    }
    else {
      sentence += " that has " + attach_id + "s with ";
      sentence += sched2sentence(sched.attach[attach_id][0], is_root);
    }
    count++;
  }

  return sentence;
}

var tarot = {
  "major": ["fool", "magician", "priestess", "empress", "emperor", "hierophant",
            // lovers                                                           justice
            "woman_stand man_stand", "chariot", "strength", "hermit", "wheel", "?",
            // hanged man  temperance
            "?", "death", "?", "devil", "tower", "starburst", "moon", "sun",
            // judgement
            "?", "globe" ],
            // wands
  "minor" : [ "?", "pentacle", "cup", "sword" ]
};

function repr_realized(realized, lvl) {
  lvl = ((typeof lvl === "undefined") ? 0 : lvl);
  var _ret = "";
  var limbs = {"crown":'^', "horn":'!', "arm":'~', "leg":'|', "tail":'.', "nesting":'@'};

  var is_sub = false;
  if ("attach" in realized) {
    for (var limb in limbs) {
      if ((lvl>0) && (limb in realized.attach)) {
        is_sub = true;
      }
    }
  }

  if ("base" in realized) {
    if (is_sub) { _ret += "("; };
    _ret += realized.base;
    if ("attach" in realized) {
      for (var limb in limbs) {
        if (limb in realized.attach) {
          _ret += limbs[limb];
          _ret += repr_realized(realized.attach[limb][0], lvl+1);
        }
      }
    }
    if (is_sub) { _ret += ")"; };
  }

  return _ret;
}

//---------------------------
//                   _       
//   _ __ ___   __ _(_)_ __  
//  | '_ ` _ \ / _` | | '_ \ 
//  | | | | | | (_| | | | | |
//  |_| |_| |_|\__,_|_|_| |_|
//                           
//---------------------------

function create_ctx(_fn) {
  var _ctx = {};
  _ctx["create_svg_header"] = true;
  _ctx["create_background_rect"] = true;
  _ctx["cur_depth"] = 0;
  _ctx["max_depth"] = 2; 
  _ctx["max_nest_depth"] = 3;
  _ctx["scale"] = 0.5;
  _ctx["global_scale"] = 1.0;
  _ctx["complexity"] = 4;

  _ctx["svg_width"] = 720.0;
  _ctx["svg_height"] = 720.0;
  _ctx["use_gradient"] = true;

  _ctx["bonkers"] = false;

  _ctx["realized"] = {};
  _ctx["line_width"] = 4;

  _ctx["custom_prop"] = { "stroke-width" : _ctx["line_width"] };

  return _ctx;
}

// Remap the gradient IDs to another unique name.
// The gradient color information is encoded in the style of the gradeitn XML
// object. The same object but with different colors gets trampeled by the
// most recent (or first, or whatever) gradient block.
// Though imperfect, as a way to at least differentiate the foreground object
// from the background object, we can remap the gradient IDs to some other
// unique name.
//
// A better method is to generate the gradients on the fly with their corresponding
// unique IDs so that every instance of using them will be independent of each other
// but that's a problem for my future self.
//
//

function _remap_fill_id_collect(_dat, id_remap) {
  if (typeof _dat === "undefined") { return; }
  if (!_dat) { return; }
  if (typeof _dat === "string") { return; }

  for (var key in _dat) {
    if (key === "fill") {
      if (_dat[key].slice(0,5) === "url(#") {
        var old_id = _dat[key].slice(5,-1);
        if (!(old_id in id_remap)) {
          id_remap[old_id] = rstr(32);
        }
      }
    }
    _remap_fill_id_collect(_dat[key], id_remap);
  }

}

function _remap_fill_id_overwrite(_dat, id_remap) {
  if (typeof _dat === "undefined") { return; }
  if (!_dat) { return; }
  if (typeof _dat === "string") { return; }

  for (var key in _dat) {
    if (key === "id") {
      var old_id = _dat[key];
      if (old_id in id_remap) {
        _dat[key] = id_remap[old_id];
      }
    }
    else if ((key === "fill")  &&
             (_dat[key].slice(0,5) === "url(#")) {
      var old_id = _dat[key].slice(5,-1);
      _dat[key] = "url(#" + id_remap[old_id] + ")";
    }

    _remap_fill_id_overwrite(_dat[key], id_remap);

  }

}

function remap_fill_id(_dat) {
  var id_remap = {};
  _remap_fill_id_collect(_dat, id_remap);
  _remap_fill_id_overwrite(_dat, id_remap);
}

remap_fill_id(adata);
remap_fill_id(bg_data);

//----

var bg_ctx = _preprocess_svgjson(bg_data, bg_color, bg_color, !sibyl_opt.use_gradient, sibyl_opt.exclude);
bg_ctx["create_svg_header"] = false;
bg_ctx["create_background_rect"] = true;
bg_ctx["cur_depth"] = 0;
bg_ctx["max_depth"] = 1;
bg_ctx["max_nest_depth"] = 0;
bg_ctx["scale"] = sibyl_opt.background_scale_x;
bg_ctx["complexity"] = 1;

bg_ctx["svg_width"] = 720.0;
bg_ctx["svg_height"] = 720.0;
bg_ctx["use_gradient"] = sibyl_opt.use_gradient;

bg_ctx["bonkers"] = sibyl_opt.bonkers;
bg_ctx["realized"] = {};
bg_ctx["line_width"] = sibyl_opt.line_width;

bg_ctx["custom_prop"] = { "stroke-width" : bg_ctx["line_width"] };

var fg_ctx = _preprocess_svgjson(adata, primary_color, secondary_color, !sibyl_opt.use_gradient, sibyl_opt.exclude);
fg_ctx["create_svg_header"] = true;
fg_ctx["create_background_rect"] = true;
fg_ctx["cur_depth"] = 0;
fg_ctx["max_depth"] = sibyl_opt.max_attach_depth;
fg_ctx["max_nest_depth"] = sibyl_opt.max_nest_depth;
fg_ctx["scale"] = sibyl_opt.scale;
fg_ctx["global_scale"] = sibyl_opt.global_scale;
fg_ctx["complexity"] = sibyl_opt.complexity;

fg_ctx["svg_width"] = 720.0;
fg_ctx["svg_height"] = 720.0;
fg_ctx["use_gradient"] = sibyl_opt.use_gradient;

fg_ctx["bonkers"] = sibyl_opt.bonkers;

fg_ctx["realized"] = {};
fg_ctx["line_width"] = sibyl_opt.line_width;

fg_ctx["custom_prop"] = { "stroke-width" : fg_ctx["line_width"] };

var base_symbol = fg_ctx.symbol["eye_up"];

var sched = {
  "base" : "globe",
  "attach" : {
    "nest" : "eye_up",
    "crown" : "circle",
    "arm" : "cube_die",
    "leg" : "cloud",
    "tail" : "rabbit"
  }
};


var repri=
"           " +
"  !^!      " +
" ~(@)~ []  " +
"   .       " +
"  | |      " ;


function sibyl_cmd() {

  var out_str = "";

  svg_xmljson.svg.width = sibyl_opt.svg_width;
  svg_xmljson.svg.height = sibyl_opt.svg_height;

  if (sibyl_opt.cmd == "random") {

    var bg_svg = "";
    if (sibyl_opt.use_background_image) {

      fg_ctx.create_svg_header = false;
      fg_ctx.create_background_rect = false;
      bg_ctx.create_svg_header = false;
      bg_ctx.create_background_rect = true;

      if (sibyl_opt.tile_background) {

        bg_ctx.create_background_rect = false;

        var bg_sched  = mystic_symbolic_dsl2sched( sibyl_opt.background_image, bg_ctx );
        var bg_svg_single = mystic_symbolic_sched(bg_ctx, bg_sched , bg_color, bg_color2, bg_color);

        var _n = Math.floor(2.0 / sibyl_opt.background_scale_x);

        var _w2 = bg_ctx.svg_width/2.0;
        var _h2 = bg_ctx.svg_height/2.0;

        var _bg_scale_x = sibyl_opt.background_scale_x;
        var _bg_scale_y = sibyl_opt.background_scale_y;

        var dx = _bg_scale_x*bg_ctx.svg_width;
        var dy = _bg_scale_y*bg_ctx.svg_height;

        var offset_x = sibyl_opt.background_dx;
        var offset_y = sibyl_opt.background_dy;

        var w = bg_ctx.svg_width;
        var h = bg_ctx.svg_height;
        _bg = bg_color;
        bg_svg += "<rect x=\"-" + w.toString() + "\" y=\"-" + h.toString() + "\" ";
        bg_svg += "width=\"" + (3*w).toString() + "\" height=\"" + (3*h).toString() + "\" fill=\"" + _bg + "\" data-is-background=\"true\">\n</rect>\n";

        for (var x_idx=0; x_idx <= _n; x_idx++) {
          for (var y_idx=0; y_idx <= _n; y_idx++) {

            var _x = Math.floor( x_idx - (_n/2) )*dx + offset_x;
            var _y = Math.floor( y_idx - (_n/2) )*dy + offset_y;

            if ((y_idx%2)==1) { _x += dx/2; }

            bg_svg += "<g transform=\"";
            bg_svg += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
            bg_svg += "\">";

            bg_svg += bg_svg_single;

            bg_svg += "</g>";

          }
        }

      }
      else {
        var bg_sched  = mystic_symbolic_dsl2sched( sibyl_opt.background_image, bg_ctx );

        var _x = sibyl_opt.background_dx;
        var _y = sibyl_opt.background_dy;

        bg_svg += "<g transform=\"";
        bg_svg += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
        bg_svg += "\">";

        bg_svg += mystic_symbolic_sched(bg_ctx, bg_sched , bg_color, bg_color2, bg_color);

        bg_svg += "</g>";

      }

    }

    var creature_svg = mystic_symbolic_random(fg_ctx, undefined, primary_color, secondary_color, bg_color);

    if (sibyl_opt.output_sched) {
      out_str += JSON.stringify(fg_ctx.realized_child, undefined, 2);
    }

    else {

      if (sibyl_opt.use_background_image) {

        var _custom_svg_header = make_svg_header(svg_xmljson);
        out_str += _custom_svg_header;

        out_str += bg_svg;
      }

      out_str += creature_svg;

      if (sibyl_opt.use_background_image) {
        out_str += svg_footer;
      }

      out_str += "<!--";
      out_str += repr_realized(fg_ctx.realized_child);
      out_str += "-->";
    }

  }

  else {

    var svg_extra_header = "";

    var bg_svg = "";
    if (sibyl_opt.use_background_image) {

      fg_ctx.create_svg_header = false;
      fg_ctx.create_background_rect = false;
      bg_ctx.create_svg_header = false;

      if (sibyl_opt.tile_background) {

        bg_ctx.create_background_rect = false;

        bg_ctx.svg_id = "__background_creature_" + SEED;

        var bg_sched  = mystic_symbolic_dsl2sched( sibyl_opt.background_image, bg_ctx );
        var bg_svg_single = mystic_symbolic_sched(bg_ctx, bg_sched , bg_color, bg_color2, bg_color);

        var _n = Math.floor(4.0 / sibyl_opt.background_scale_x);

        var _w2 = bg_ctx.svg_width/2.0;
        var _h2 = bg_ctx.svg_height/2.0;

        var _bg_scale_x = sibyl_opt.background_scale_x;
        var _bg_scale_y = sibyl_opt.background_scale_y;

        var dx = _bg_scale_x*bg_ctx.svg_width;
        var dy = _bg_scale_y*bg_ctx.svg_height;

        var offset_x = sibyl_opt.background_dx;
        var offset_y = sibyl_opt.background_dy;

        var w = bg_ctx.svg_width;
        var h = bg_ctx.svg_height;
        _bg = bg_color;

        svg_extra_header += "<rect x=\"-" + w.toString() + "\" y=\"-" + h.toString() + "\" ";
        svg_extra_header += "width=\"" + (3*w).toString() + "\" height=\"" + (3*h).toString() + "\" fill=\"" + _bg + "\" data-is-background=\"true\">\n</rect>\n";

        var first_bg = true;
        var bg_id = "__bg_single_" + _srnd();
        bg_svg_single = '<g id="' + bg_id + '">\n' + bg_svg_single + '\n</g>';

        for (var x_idx=0; x_idx <= _n; x_idx++) {
          for (var y_idx=0; y_idx <= _n; y_idx++) {

            var _x = Math.floor( x_idx - (_n/2) )*dx + offset_x;
            var _y = Math.floor( y_idx - (_n/2) )*dy + offset_y;

            if ((y_idx%2)==1) { _x += dx/2; }

            bg_svg += "<g transform=\"";
            bg_svg += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
            bg_svg += "\">";

            if (first_bg) {
              bg_svg += bg_svg_single;
              first_bg = false;
            }
            else {
              bg_svg += '<use xlink:href="#' + bg_id + '"/>\n';
            }


            bg_svg += "</g>";

          }
        }

      }
      else {
        bg_ctx.create_background_rect = true;
        bg_ctx.svg_id = "__background_creature_" + SEED;

        var _x = sibyl_opt.background_dx;
        var _y = sibyl_opt.background_dy;

        bg_svg += "<g transform=\"";
        bg_svg += " translate(" + (-_x).toString() + " " + (-_y).toString() + ")";
        bg_svg += "\">";

        var bg_sched  = mystic_symbolic_dsl2sched( sibyl_opt.background_image, bg_ctx );
        bg_svg += mystic_symbolic_sched(bg_ctx, bg_sched , bg_color, bg_color2, bg_color);

        bg_svg += "</g>";
      }
    }

    var sched = {};

    if (sibyl_opt.use_custom_sched) {
      sched = sibyl_opt.custom_sched;
    }
    else {
      sched  = mystic_symbolic_dsl2sched( sibyl_opt.cmd, fg_ctx );
    }

    if (sibyl_opt.output_sched) {
      out_str += JSON.stringify(sched, undefined, 2);
    }

    else {

      svg_extra_header += '<g transform=" translate(' + sibyl_opt.dx.toString() + " " + sibyl_opt.dy.toString() + ')">';

      fg_ctx.svg_id = "creature_" + SEED;

      var creature_svg = mystic_symbolic_sched(fg_ctx, sched , primary_color, secondary_color, bg_color);

      if (sibyl_opt.use_background_image) {
        var _custom_svg_header = make_svg_header(svg_xmljson);
        out_str += _custom_svg_header;

        if (sibyl_opt.use_mask) {
          var svg_mask_start = '<defs>\n' +
            '<mask id="mask0" x="0" y="0" width="432" height="720" >\n' +
            '<rect rx="23" x="0" y="0" width="432" height="720" style="stroke:none; fill: #ffffff"/>\n' +
            '</mask>\n' +
            '</defs>\n' +
            '<g style="mask: url(#mask0);">\n' +
            "";
          out_str += svg_mask_start;
        }

        out_str += svg_extra_header;

        out_str += "\n<!-- BG_START -->\n";

        out_str += "<g id='background_creature_" + SEED + "'>";

        out_str += bg_svg;
        out_str += "</g> <!-- bg_creat container -->\n";

        out_str += "\n<!-- BG_END -->\n";

        out_str += "\n<!-- CREATURE_START -->\n";
      }


      out_str += creature_svg;


      if (sibyl_opt.use_mask) {
        var svg_mask_end = '</g>\n';
        out_str += svg_mask_end;
      }

      if (sibyl_opt.use_background_image) {
        out_str += "\n<!-- CREATURE_END -->\n";

        // container transform (dxy)
        //
        out_str += "</g>";

        out_str += svg_footer;
      }
    }

  }

  if (!sibyl_opt.output_sched) {
    out_str += "<!-- SEED:" + SEED +  "-->\n";
    out_str += "<!-- " +  primary_color +  secondary_color +  bg_color +  bg_color2 + "-->\n";
    out_str += "<!-- " +  "\n  prim_hue = " +  _rcolor.primary.hsv[0] +  ";\n  prim_sat =" +  _rcolor.primary.hsv[1] +  ";\n  prim_val =" +  _rcolor.primary.hsv[2] +  ";\n -->\n";
    out_str += "<!-- " +  "\n  seco_hue = " +  _rcolor.secondary.hsv[0] +  ";\n  seco_sat =" +  _rcolor.secondary.hsv[1] +  ";\n  seco_val =" +  _rcolor.secondary.hsv[2] +  ";\n -->\n";
    out_str += "<!--" +  "bg:" +  _rcolor.background.hsv.join(" + ") +  "-->\n";
    out_str += "<!--" +  "bg2:" +  _rcolor.background2.hsv.join(" + ") +  "-->\n";
  }

  return out_str;
}

if (require.main !== module) {
  // called as a library
  //

  module.exports = {
    "mystic_symbolic" : adata,
    "bg_symbol" : bg_data,
    "fg_ctx": fg_ctx,
    "bg_ctx": bg_ctx,
    "mystic_symbolic_dsl2sched" : mystic_symbolic_dsl2sched,
    "mystic_symbolic_sched" : mystic_symbolic_sched,
    "mystic_symbolic_random" : mystic_symbolic_random,
    "opt" : sibyl_opt,
    "preprocess_svgjson": _preprocess_svgjson,
    "jsonsvg2svg_child": jsonsvg2svg_child,
    "jsonsvg2svg_defs" : jsonsvg2svg_defs,
    "repr_realized" : repr_realized,
    "sched2sentence" : sched2sentence,
    "random_creature" : random_creature,

    "tarot_template": TAROT_TEMPLATE,

    "cmd": sibyl_cmd,

    "svg_header": svg_header,
    "svg_footer": svg_footer,

    "create_ctx" : create_ctx,
    "rand_color" : rand_color,
    "rand_color_n" : rand_color_n,
    "RGBtoHSV" : RGBtoHSV,
    "HSVtoHSL" : HSVtoHSL,
    "HSLtoHSV" : HSLtoHSV,
    "HSVtoRGB" : HSVtoRGB,
    "rgb2hex": _rgb2hex,
    "rng" : g_rng,
    "irnd":_irnd,
    "rnd":_rnd,
    "crnd":_crnd,
    "choose":_choose,
    "reseed" : reseed,
    "remap_fill_id": remap_fill_id
  };

}
else {
  console.log(sibyl_cmd());
}


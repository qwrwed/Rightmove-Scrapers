// usage: node .\rightmoveOutcodeScraper\app.js [START_AT]
// START_AT is optional and defaults to 0
// e.g. if a previous run has saved 0-99.json, provide START_AT as 100

var cheerio = require("cheerio");
// var db = require('mongojs').connect('test',['rightmoveCodes']);
// var request = require("request");
var request = require("request-promise");
var fs = require("fs");
var stringify = require("json-stringify-safe");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
console.log("Started!");
let missingCounter = 0;

let name_to_identifier;
let identifier_to_name;

const get_name = async (station_identifier) => {
  url = `http://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=${station_identifier}`;
  console.log("Requesting Page ", url);
  let res;
  try {
    res = await request(url);
  } catch (err) {
    let status;
    try {
      ({ status } = JSON.parse(err.error));
    } catch (err2) {
      console.log(err);
    }
    console.log(`failure: ${status}`);
    if (status === 404) {
      return false;
    } else {
      throw err;
    }
  }

  $ = cheerio.load(res);

  const [elem] = $(".input, .input--full");
  if (typeof elem === "undefined") {
    return false;
  }

  const { attribs } = elem;
  const station_name = attribs.value;
  console.log(`success: ${station_name}`);
  name_to_identifier[station_name] = station_identifier;
  identifier_to_name[station_identifier] = station_name;
  return true;
};

const getOne = async () => {

}

const getChunk = async (type_, i_start, i_end) => {
  name_to_identifier = {};
  identifier_to_name = {};

  for (let i = i_start; i < i_end; i++) {
    const station_identifier = `${type_}^${i}`;
    success = await get_name(station_identifier);
  }

  [
    ["name_to_identifier", name_to_identifier],
    ["identifier_to_name", identifier_to_name],
  ].forEach(([prefix, obj]) => {
    if (Object.keys(obj).length === 0) {
      return;
    }
    const filename = `${prefix}_${type_}_${i_start}-${i_end-1}.json`;
    fs.writeFile(filename, JSON.stringify(obj, null, 2), "utf8", () => {
      console.log(`wrote ${filename}`);
    });
  });
  return true;
};

const getAll = async (
  type_ = "STATION",
  i_start = 0,
  chunkSize = 100,
  end = Infinity
) => {
  for (let i = i_start; i < end; i += chunkSize) {
    const success = await getChunk(type_, i, i + chunkSize);
    if (!success) {
      return;
    }
  }
};

const start = process.argv[2] === undefined ? 0 : parseInt(process.argv[2]);
const chunkSize = 100;

getAll(
  "STATION",
  start,
  chunkSize,
  // start+chunkSize,
);

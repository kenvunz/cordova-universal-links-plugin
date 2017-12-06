/*
Parser for config.xml file. Read plugin-specific preferences (from <universal-links> tag) as JSON object.
*/
var path = require("path");
var ConfigXmlHelper = require("./configXmlHelper.js");
var DEFAULT_SCHEME = "http";

module.exports = {
  readPreferences: readPreferences
};

// region Public API

/**
 * Read plugin preferences from the config.xml file.
 *
 * @param {Object} cordovaContext - cordova context object
 * @return {Array} list of host objects
 */
function readPreferences(cordovaContext) {
  // read data from projects root config.xml file
  var configXml = new ConfigXmlHelper(cordovaContext).read();
  if (configXml == null) {
    console.warn(
      "config.xml not found! Please, check that it exist's in your project's root directory."
    );
    return null;
  }

  var output = {};

  cordovaContext.opts.platforms.forEach(function(platform) {
    const widget =
      (configXml.widget.platform &&
        configXml.widget.platform
          .filter(function(item) {
            return item.$.name === platform && item["universal-links"];
          })
          .shift()) ||
      configXml.widget;

    var ulXmlPreferences = widget["universal-links"];
    if (ulXmlPreferences == null || ulXmlPreferences.length == 0) {
      console.warn(
        "<universal-links> tag is not set in the config.xml for " +
          platform +
          ". Universal Links plugin is not going to work."
      );
      return null;
    }

    var xmlPreferences = ulXmlPreferences[0];

    // read hosts
    var hosts = constructHostsList(xmlPreferences);

    output[platform] = {
      hosts: hosts
    };

    if (platform === "ios") {
      output[platform].iosTeamId = getTeamIdPreference(xmlPreferences);
    }
  });

  return output;
}

// endregion

// region Private API

function getTeamIdPreference(xmlPreferences) {
  if (xmlPreferences.hasOwnProperty("ios-team-id")) {
    return xmlPreferences["ios-team-id"][0]["$"]["value"];
  }

  return null;
}

/**
 * Construct list of host objects, defined in xml file.
 *
 * @param {Object} xmlPreferences - plugin preferences from config.xml as JSON object
 * @return {Array} array of JSON objects, where each entry defines host data from config.xml.
 */
function constructHostsList(xmlPreferences) {
  var hostsList = [];

  // look for defined hosts
  var xmlHostList = xmlPreferences["host"];
  if (xmlHostList == null || xmlHostList.length == 0) {
    return [];
  }

  xmlHostList.forEach(function(xmlElement) {
    var host = constructHostEntry(xmlElement);
    if (host) {
      hostsList.push(host);
    }
  });

  return hostsList;
}

/**
 * Construct host object from xml data.
 *
 * @param {Object} xmlElement - xml data to process.
 * @return {Object} host entry as JSON object
 */
function constructHostEntry(xmlElement) {
  var host = {
    scheme: DEFAULT_SCHEME,
    name: "",
    paths: []
  };
  var hostProperties = xmlElement["$"];

  if (hostProperties == null || hostProperties.length == 0) {
    return null;
  }

  // read host name
  host.name = hostProperties.name;

  // read scheme if defined
  if (hostProperties["scheme"] != null) {
    host.scheme = hostProperties.scheme;
  }

  // construct paths list, defined for the given host
  host.paths = constructPaths(xmlElement);

  return host;
}

/**
 * Construct list of path objects from the xml data.
 *
 * @param {Object} xmlElement - xml data to process
 * @return {Array} list of path entries, each on is a JSON object
 */
function constructPaths(xmlElement) {
  if (xmlElement["path"] == null) {
    return ["*"];
  }

  var paths = [];
  xmlElement.path.some(function(pathElement) {
    var url = pathElement["$"]["url"];

    // Ignore explicit paths if '*' is defined
    if (url === "*") {
      paths = ["*"];
      return true;
    }

    paths.push(url);
  });

  return paths;
}

// endregion

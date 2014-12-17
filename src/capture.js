"use strict";

var _ = require('lodash'),
    fs = require('fs-extra'),
    logger = require('winston'),
    path = require('path'),
    utils = require('./utils'),

    SCRIPT_FILE = 'scripts/screenshot.js',

    DEF_ENGINE = 'slimerjs',
    DEF_COMMAND = 'slimerjs',
    DEF_FORMAT = 'png';


/* Configurations and options */

function outputFile(options, conf, base64) {
    var format = options.format || DEF_FORMAT;
    return conf.storage + path.sep + base64 + '.' + format;
}

function cliCommand(config) {
    var engine = config.engine || DEF_ENGINE,
        command = config.command || config.commands[engine][process.platform];
    return command || DEF_COMMAND;
}

function cleanupOptions(options, config) {
    var opts = _.omit(options, ['force', 'callback']);
    opts.url = utils.fixUrl(options.url);
    return _.defaults(opts, config.options);
}


/* Screenshot capturing runner */

function runCapturingProcess(options, config, outputFile, base64, onFinish) {
    var scriptFile = utils.filePath(SCRIPT_FILE),
        command = cliCommand(config).split(/[ ]+/),
        cmd = _.union(command, [scriptFile, base64, outputFile]),
        opts = {
            timeout: config.timeout
        };

    logger.debug('Options for script: %j, base64: %s', options, base64);
    utils.execProcess(cmd, opts, onFinish);
}


/* External API */

function screenshot(options, config, onFinish) {
    var opts = cleanupOptions(options, config),
        base64 = utils.encodeBase64(opts),
        file = outputFile(opts, config, base64),

        retrieveImageFromStorage = function () {
            logger.debug('Take screenshot from file storage: %s', base64);
            onFinish(file, 0);
        },
        retrieveImageFromSite = function () {
            runCapturingProcess(opts, config, file, base64, function (code) {
                logger.debug('Process finished work: %s', base64);
                return onFinish(file, code);
            });
        };

    logger.info('Capture site screenshot: %s', options.url);

    if (options.force) {
        retrieveImageFromSite();
    } else {
        fs.exists(file, function (exists) {
            if (exists) {
                retrieveImageFromStorage();
            } else {
                retrieveImageFromSite();
            }
        });
    }
}


/* Exported functions */

module.exports = {
    screenshot: screenshot
};

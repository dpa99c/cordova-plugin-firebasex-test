var fs = require('fs');
var path = require('path');
var minimist = require('minimist');
var xml2js = require('xml2js');

try{
    var args = minimist(process.argv.slice(2));
    var projectName = args["projectName"];
}catch(e){
    throw "Unable to read required CLI args: " + e.message;
}

function resolveSchemeFilepath(projectName) {
    var candidates = [
        path.join("platforms", "ios", "App.xcodeproj", "xcshareddata", "xcschemes", "App.xcscheme"),
        path.join("platforms", "ios", "App.xcworkspace", "xcshareddata", "xcschemes", "App.xcscheme"),
        path.join("platforms", "ios", projectName + ".xcodeproj", "xcshareddata", "xcschemes", projectName + ".xcscheme"),
        path.join("platforms", "ios", projectName + ".xcworkspace", "xcshareddata", "xcschemes", projectName + ".xcscheme")
    ];

    for (var i = 0; i < candidates.length; i++) {
        var candidate = path.resolve(candidates[i]);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    throw "Unable to find an iOS scheme file under platforms/ios for projectName=" + projectName;
}

var schemeFilepath = resolveSchemeFilepath(projectName);
try{
    var schemeFileXml = fs.readFileSync(schemeFilepath, 'utf-8');
}catch(e){
    throw "Unable to read scheme file: " + e.message;
}

xml2js.parseString(schemeFileXml, function(err, js){
    if(err){
        throw "Unable to parse scheme file: " + err;
    }
    onParseXmlToJs(js);
});

function onParseXmlToJs(js){
    try{
        js["Scheme"]["LaunchAction"][0]["CommandLineArguments"] = [{
            "CommandLineArgument":[{
                "$":{
                    "argument": "-FIRAnalyticsDebugEnabled",
                    "isEnabled": "YES"
                }
            }]
        }];
    }catch(e){
        throw "Unable to create scheme entry: " + e.message;
    }
    writeJsToSchemeFile(js);
}

function writeJsToSchemeFile(js){
    try{
        var builder = new xml2js.Builder();
        var xml = builder.buildObject(js);
        fs.writeFileSync(schemeFilepath, xml, 'utf-8');
    }catch(e){
        throw "Unable to write scheme to file: " + e.message;
    }
    console.log("Complete");
}
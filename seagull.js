var _ = require('lodash');
var Handlebars = require('handlebars');
var fs = require('fs');
var extend = require('extend');
var range = require('range');

// Templates, helpers and partials
//////////////////////////////////////////////////////////////

var serviceTemplateFile = fs.readFileSync(__dirname + '/templates/service.handlebars', 
                                          'utf-8');
var servicePortMappingTemplateFile = fs.readFileSync(__dirname + '/templates/portMapping.handlebars',
                                                     'utf-8');
var serviceUDPPortMappingTemplateFile = fs.readFileSync(__dirname + '/templates/udpPortMapping.handlebars',
                                                        'utf-8');
var sidekickTemplateFile = fs.readFileSync(__dirname + '/templates/sidekick.handlebars', 
                                           'utf-8');
var resourceTemplateFile = fs.readFileSync(__dirname + '/templates/resources.handlebars',
                                           'utf-8');

var serviceTemplate = Handlebars.compile(serviceTemplateFile);
var resourceTemplate = Handlebars.compile(resourceTemplateFile)
var portMappingTemplate = Handlebars.compile(servicePortMappingTemplateFile);
var UDPPortMappingTemplate = Handlebars.compile(serviceUDPPortMappingTemplateFile);
var sidekickTemplate = Handlebars.compile(sidekickTemplateFile);

Handlebars.registerPartial({
  portMapping: portMappingTemplate,
  UDPPortMapping: UDPPortMappingTemplate,
  resources: resourceTemplate
});

Handlebars.registerHelper('memoryForSlots', function(){
  return (this.slots * this.slotSize).toString();
});


var Seagull = function(inheritedData, inheritedProperties) {

  this._inheritedData = inheritedData;
  this.seagullProperties = [];

  // Create collection - adds collection and function to add to collection -
  // this underpins range functionality
  this.addCollection = function(propertyName, defaultValue) {
    defaultValue = typeof defaultValue === 'array' ? defaultValue : [];

    Object.defineProperty(this, "_" + propertyName, { value: defaultValue,
                                                      writable: true });

    Object.defineProperty(this, propertyName, {
      value: function(x) {
        this["_" + propertyName].push({value: x});
        if (typeof x === 'array') {
          _.flatten(this["_" + propertyName]);
        }
      }
    });

    // Add the ability to specify a range of integers to add
    Object.defineProperty(this, propertyName + "Range", {
      value: function(start, end) {
        _.each(range(start, end), function(x) {
          this["_" + propertyName].push({value: x});
        }, this);
      }});

    this.seagullProperties.push({
      "name": propertyName,
      "type": 'collection',
      "defaultValue": defaultValue
    });
  };

  // Add item - adds internal property and setter
  this.addItem = function(propertyName, defaultValue) {
    Object.defineProperty(this, "_" + propertyName, { value: defaultValue,
                                                      writable: true });
    Object.defineProperty(this, propertyName, {
      value: function(x) {
        this["_" + propertyName] = x;
        // Object.defineProperty(this, "_" + propertyName, { value: x});
      }
    });

    this.seagullProperties.push({
      "name": propertyName,
      "type": 'item',
      "defaultValue": defaultValue
    });
  };

  // Add boolean - adds internal property and setter
  this.addBoolean = function(propertyName) {
    Object.defineProperty(this, "_" + propertyName, { value: false,
                                                      writable: true });
    Object.defineProperty(this, propertyName, {
      value: function() {
        this[propertyName] = true;
      }
    });

    this.seagullProperties.push({
      "name": propertyName,
      "type": 'boolean',
      "defaultValue": false
    });
  };

  _.each(inheritedProperties, function(x) {
    if (!this[x.name]) {
      switch (x.type) {
      case "item":
        this.addItem(x.name, x.defaultValue);      
        break;
      case "collection":
        this.addCollection(x.name, x.defaultValue);
        break;
        case "boolean":
        this.addCollection(x.name);
        break;
      }
    } else {
      console.log("Attempting to overwrite property: " + x.name);
    }
  }, this);

  // TODO - add this shit in base
  this._dataVolumeImage = null;
  this._volumeMountPoint = null;

  this.serviceData = function() {
    if (!this._inheritedData) this._inheritedData = {};
    
    var generatedData = _.reduce(this.seagullProperties, function(memo, x) {
      memo[x.name] = this["_" + x.name];
      return memo;
    }, {}, this);

    return extend(this._inheritedData.properties, generatedData);
    // return extend(this._inheritedData.properties, {
    //   "bindAllPorts": this._bindAllPorts,
    //   "serviceName": this._serviceName,
    //   "imageName": this._imageName,
    //   "containerName": this._containerName,
    //   "requiredServices": this._requiredServices,
    //   "userOrRegistry": this._userOrRegistry,
    //   "ports": this._ports,
    //   "UDPPorts": this._UDPPorts,
    //   "primaryPort": this._primaryPort || this._ports[0],
    //   "dockerFlags": this._dockerFlags,
    //   "containerCommand": this._containerCommand,
    //   "slotSize": this._slotSize,
    //   "slots": this._slots
    // });
  };

  this.makeBuilder = function() {
    return new Seagull(this.serviceData, this.seagullProperties);
  };

  this.generate = function(params) {
    var data = this.serviceData();
    var res = serviceTemplate(data);
    return res;
  };

  this.generateSidekick = function() {
    var data = this.serviceData();
    var res = sidekickTemplate(data);
    return res;
  };
}

module.exports = Seagull;

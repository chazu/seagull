var _ = require('lodash');
var Handlebars = require('handlebars');
var fs = require('fs');
var extend = require('extend');
var range = require('range');

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

  // Add range - adds internal properties, setter
  this.addRange = function(propertyName, defaultValues) {
    Object.defineProperty(this, "_" + propertyName, {
    value: defaultValues ? defaultValues : [] });

    Object.defineProperty(this, propertyName, {
      value: function(x) {
        var key = toString(propertyName);
        currentValue = this["_" + propertyName].push({key:x});
      }
    });

    Object.defineProperty(this, propertyName + "Range", {
      value: function(start, end) {
        _.each(range(start, end), function(x) {
          var key = toString(propertyName);
          this["_" + propertyName].push({key: x});
    }, this);

      }
    });

    this.seagullProperties.push({
      "name": propertyName,
      "type": 'range',
      "defaultValue": defaultValues
    });
  };

  _.each(inheritedProperties, function(x) {
    if (!this[x.name]) {
    switch (x.type) {
    case "item":
      this.addItem(x.name, x.defaultValue);      
      break;
    case "range":
      this.addRange(x.name, x.defaultValue);
      break;
    }
    } else {
      console.log("Attempting to overwrite property: " + x.name);
    }
  }, this);


  //this._serviceName = null;
  //this._containerName = null;
  //this._containerCommand = null;
  //this._userOrRegistry = "docker.plaidpotion.com";

  this._bindAllPorts = null;
  this._primaryPort = null;
  //this._ports = [];
  //this._UDPPorts = [];
  this._requiredServices = [];

  //this._dockerFlags = null;
  this._dataVolumeImage = null;
  this._volumeMountPoint = null;

  this.bindAllPorts = function() {
    this._bindAllPorts = true;
  };

  // this.port = function(port) {
  //   this._ports.push({port: port});
  // };

  // this.UDPPort = function(port) {
  //   this._UDPPorts.push({port: port});
  // };

  // this.portRange = function(start, end) {
  //   _.each(range(start, end), function(x) {
  //     this._ports.push({port: x});
  //   }, this);
  // };

  // this.UDPPortRange = function(start, end) {
  //   _.each(range(start, end), function(x) {
  //     this._UDPPorts.push({port: x});
  //   }, this);
  // };

  this.requireService = function(serviceName) {
    this._requiredServices.push(serviceName);
  };

  this.serviceData = function() {
    if (!this._inheritedData) this._inheritedData = {};

    return extend(this._inheritedData.properties, {
      "bindAllPorts": this._bindAllPorts,
      "serviceName": this._serviceName,
      "imageName": this._imageName,
      "containerName": this._containerName,
      "requiredServices": this._requiredServices,
      "userOrRegistry": this._userOrRegistry,
      "ports": this._ports,
      "UDPPorts": this._UDPPorts,
      "primaryPort": this._primaryPort || this._ports[0],
      "dockerFlags": this._dockerFlags,
      "containerCommand": this._containerCommand,
      "slotSize": this._slotSize,
      "slots": this._slots
      });
  };

  this.makeBuilder = function() {
    return new Seagull(this.serviceData, this.seagullProperties);
  };

  this.generate = function() {
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
